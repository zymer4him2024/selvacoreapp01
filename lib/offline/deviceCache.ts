import { Device } from '@/types/device';

const DB_NAME = 'selvacore-offline';
const DB_VERSION = 1;
const DEVICE_STORE = 'devices';
const VISIT_STORE = 'visits';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DEVICE_STORE)) {
        db.createObjectStore(DEVICE_STORE, { keyPath: 'qrCodeData' });
      }
      if (!db.objectStoreNames.contains(VISIT_STORE)) {
        db.createObjectStore(VISIT_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Shared opener so visitQueue can reuse the same DB + schema
export { openDb, DEVICE_STORE, VISIT_STORE };

interface CachedDevice {
  qrCodeData: string;
  device: Device;
  cachedAt: number;
}

export async function cacheDevice(device: Device): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DEVICE_STORE, 'readwrite');
    tx.objectStore(DEVICE_STORE).put({
      qrCodeData: device.qrCodeData,
      device,
      cachedAt: Date.now(),
    } satisfies CachedDevice);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function cacheDevices(devices: Device[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DEVICE_STORE, 'readwrite');
    const store = tx.objectStore(DEVICE_STORE);
    for (const device of devices) {
      store.put({
        qrCodeData: device.qrCodeData,
        device,
        cachedAt: Date.now(),
      } satisfies CachedDevice);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getCachedDevice(qrCodeData: string): Promise<Device | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  const result = await new Promise<CachedDevice | undefined>((resolve, reject) => {
    const tx = db.transaction(DEVICE_STORE, 'readonly');
    const req = tx.objectStore(DEVICE_STORE).get(qrCodeData);
    req.onsuccess = () => resolve(req.result as CachedDevice | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result?.device ?? null;
}
