import { openDb, WRITE_QUEUE_STORE } from './deviceCache';

export type WriteType = 'accept_job' | 'start_job' | 'complete_job' | 'register_device';

export interface QueuedWrite {
  id: string;
  type: WriteType;
  payload: Record<string, unknown>;
  queuedAt: number;
  retryCount: number;
}

export interface DrainResult {
  synced: number;
  failed: FailedWrite[];
  remaining: number;
}

export interface FailedWrite {
  entry: QueuedWrite;
  error: string;
}

// ── Network error detection ──────────────────────────────────────────
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code ?? '');
    if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'cancelled') return true;
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return true;
  return false;
}

// ─�� IDB primitives ───────────────────────────────────────────────────
export async function enqueueWrite(type: WriteType, payload: Record<string, unknown>): Promise<string> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB not available');
  const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: QueuedWrite = { id, type, payload, queuedAt: Date.now(), retryCount: 0 };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WRITE_QUEUE_STORE, 'readwrite');
    tx.objectStore(WRITE_QUEUE_STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function getPendingWrites(): Promise<QueuedWrite[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openDb();
  const all = await new Promise<QueuedWrite[]>((resolve, reject) => {
    const tx = db.transaction(WRITE_QUEUE_STORE, 'readonly');
    const req = tx.objectStore(WRITE_QUEUE_STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedWrite[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function deleteWrite(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WRITE_QUEUE_STORE, 'readwrite');
    tx.objectStore(WRITE_QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function writeQueueCount(): Promise<number> {
  return (await getPendingWrites()).length;
}

// ── Drain ────────────────────────────────────────────────────────────
export type WriteHandler = (entry: QueuedWrite) => Promise<void>;

export async function drainWriteQueue(
  handlers: Partial<Record<WriteType, WriteHandler>>,
): Promise<DrainResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { synced: 0, failed: [], remaining: await writeQueueCount() };
  }
  const items = await getPendingWrites();
  let synced = 0;
  const failed: FailedWrite[] = [];
  for (const item of items) {
    const handler = handlers[item.type];
    if (!handler) continue;
    try {
      await handler(item);
      await deleteWrite(item.id);
      synced += 1;
    } catch (error: unknown) {
      if (isNetworkError(error)) {
        // Network still flaky — stop, leave remaining items for next online event
        break;
      }
      // Business error (race lost, order deleted, unauthorized)
      // Discard so it doesn't poison the queue
      const message = error instanceof Error ? error.message : 'Unknown error';
      failed.push({ entry: item, error: message });
      await deleteWrite(item.id);
    }
  }
  return { synced, failed, remaining: await writeQueueCount() };
}

// ── Queue-first helper ───────────────────────────────────────────────
// Enqueues immediately, then triggers a flush if online.
// Returns the queue entry id synchronously (after IDB write).
// The flush runs in the background — caller does NOT wait for server response.
let _flushHandlers: Partial<Record<WriteType, WriteHandler>> | null = null;
let _flushInProgress = false;
let _onDrainComplete: ((result: DrainResult) => void) | null = null;

export function setFlushHandlers(
  handlers: Partial<Record<WriteType, WriteHandler>>,
  onComplete?: (result: DrainResult) => void,
) {
  _flushHandlers = handlers;
  _onDrainComplete = onComplete ?? null;
}

async function tryFlush() {
  if (!_flushHandlers || _flushInProgress) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  _flushInProgress = true;
  try {
    const result = await drainWriteQueue(_flushHandlers);
    _onDrainComplete?.(result);
  } finally {
    _flushInProgress = false;
  }
}

export async function enqueueAndFlush(
  type: WriteType,
  payload: Record<string, unknown>,
): Promise<string> {
  const id = await enqueueWrite(type, payload);
  // Fire-and-forget flush — UI has already updated optimistically
  void tryFlush();
  return id;
}

// Explicit flush trigger (for retry button, online event)
export async function flush(): Promise<DrainResult> {
  if (!_flushHandlers) return { synced: 0, failed: [], remaining: await writeQueueCount() };
  if (_flushInProgress) return { synced: 0, failed: [], remaining: await writeQueueCount() };
  _flushInProgress = true;
  try {
    const result = await drainWriteQueue(_flushHandlers);
    _onDrainComplete?.(result);
    return result;
  } finally {
    _flushInProgress = false;
  }
}
