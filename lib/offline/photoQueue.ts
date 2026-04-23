import { openDb, PHOTO_QUEUE_STORE } from './deviceCache';

export interface QueuedPhoto {
  id: string;
  orderId: string;
  blob: Blob;
  filename: string;
  downloadUrl: string | null;
  queuedAt: number;
}

export async function enqueuePhoto(orderId: string, file: File): Promise<string> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB not available');
  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  const entry: QueuedPhoto = { id, orderId, blob, filename: file.name, downloadUrl: null, queuedAt: Date.now() };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTO_QUEUE_STORE, 'readwrite');
    tx.objectStore(PHOTO_QUEUE_STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function getPhotosForOrder(orderId: string): Promise<QueuedPhoto[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openDb();
  const all = await new Promise<QueuedPhoto[]>((resolve, reject) => {
    const tx = db.transaction(PHOTO_QUEUE_STORE, 'readonly');
    const req = tx.objectStore(PHOTO_QUEUE_STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedPhoto[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all.filter((p) => p.orderId === orderId).sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function markPhotoUploaded(id: string, downloadUrl: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  const entry = await new Promise<QueuedPhoto | undefined>((resolve, reject) => {
    const tx = db.transaction(PHOTO_QUEUE_STORE, 'readonly');
    const req = tx.objectStore(PHOTO_QUEUE_STORE).get(id);
    req.onsuccess = () => resolve(req.result as QueuedPhoto | undefined);
    req.onerror = () => reject(req.error);
  });
  if (entry) {
    entry.downloadUrl = downloadUrl;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PHOTO_QUEUE_STORE, 'readwrite');
      tx.objectStore(PHOTO_QUEUE_STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  db.close();
}

export async function deletePhotosForOrder(orderId: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const photos = await getPhotosForOrder(orderId);
  if (photos.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PHOTO_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_QUEUE_STORE);
    for (const p of photos) store.delete(p.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function photoQueueCount(): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0;
  const db = await openDb();
  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(PHOTO_QUEUE_STORE, 'readonly');
    const req = tx.objectStore(PHOTO_QUEUE_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return count;
}
