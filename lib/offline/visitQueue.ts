import { MaintenanceVisitChecks, Device } from '@/types/device';
import { openDb, VISIT_STORE } from './deviceCache';

export interface QueuedVisit {
  id: string;
  device: Device;
  technicianId: string;
  technicianName: string;
  checks: MaintenanceVisitChecks;
  notes: string;
  beforeBlob: Blob | null;
  afterBlob: Blob | null;
  queuedAt: number;
}

export async function enqueueVisit(visit: Omit<QueuedVisit, 'id' | 'queuedAt'>): Promise<string> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB not available — cannot queue offline');
  }
  const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const full: QueuedVisit = { id, queuedAt: Date.now(), ...visit };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VISIT_STORE, 'readwrite');
    tx.objectStore(VISIT_STORE).put(full);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function getPendingVisits(): Promise<QueuedVisit[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openDb();
  const all = await new Promise<QueuedVisit[]>((resolve, reject) => {
    const tx = db.transaction(VISIT_STORE, 'readonly');
    const req = tx.objectStore(VISIT_STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedVisit[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function pendingCount(): Promise<number> {
  const items = await getPendingVisits();
  return items.length;
}

export async function deleteQueued(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VISIT_STORE, 'readwrite');
    tx.objectStore(VISIT_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Drains the queue one item at a time via the provided uploader.
// Uploader owns photo upload + Firestore write; this module only handles storage + iteration.
// Returns { synced, remaining }.
export async function syncAll(
  uploader: (visit: QueuedVisit) => Promise<void>
): Promise<{ synced: number; remaining: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const remaining = await pendingCount();
    return { synced: 0, remaining };
  }
  const items = await getPendingVisits();
  let synced = 0;
  for (const item of items) {
    try {
      await uploader(item);
      await deleteQueued(item.id);
      synced += 1;
    } catch {
      // Stop on first failure — retry on next online event
      break;
    }
  }
  return { synced, remaining: (await pendingCount()) };
}

let listenerRegistered = false;
export function registerOnlineSync(uploader: (visit: QueuedVisit) => Promise<void>, onChange?: () => void) {
  if (typeof window === 'undefined' || listenerRegistered) return;
  listenerRegistered = true;
  const handler = async () => {
    await syncAll(uploader);
    onChange?.();
  };
  window.addEventListener('online', handler);
  // Also attempt once on registration in case we came back online before listener attached
  if (navigator.onLine) {
    void handler();
  }
}
