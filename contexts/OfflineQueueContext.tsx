'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  WriteType,
  FailedWrite,
  DrainResult,
  QueuedWrite,
  setFlushHandlers,
  enqueueAndFlush,
  flush,
  writeQueueCount,
} from '@/lib/offline/writeQueue';
import { acceptJob, startJob, completeJob, uploadInstallationPhoto, TechnicianInfo } from '@/lib/services/technicianService';
import { registerDevice } from '@/lib/services/deviceService';
import { DeviceRegistrationInput } from '@/types/device';
import { getPhotosForOrder, deletePhotosForOrder } from '@/lib/offline/photoQueue';

// ── Handler map — one per WriteType ──────────────────────────────────
async function handleAcceptJob(entry: QueuedWrite) {
  const p = entry.payload;
  await acceptJob(p.orderId as string, p.technicianId as string, p.technicianInfo as TechnicianInfo);
}

async function handleStartJob(entry: QueuedWrite) {
  const p = entry.payload;
  await startJob(p.orderId as string, p.technicianId as string);
}

async function handleCompleteJob(entry: QueuedWrite) {
  const p = entry.payload;
  const orderId = p.orderId as string;

  // Upload photos from IDB photoQueue first
  const queuedPhotos = await getPhotosForOrder(orderId);
  const photoUrls: string[] = [];
  const queuedDescriptions: string[] = [];
  for (const photo of queuedPhotos) {
    if (photo.downloadUrl) {
      photoUrls.push(photo.downloadUrl);
    } else {
      const url = await uploadInstallationPhoto(orderId, new File([photo.blob], photo.filename, { type: photo.blob.type }));
      photoUrls.push(url);
    }
    queuedDescriptions.push(photo.description || '');
  }

  // If no queued photos, check if URLs were passed directly (online path)
  const finalUrls = photoUrls.length > 0 ? photoUrls : (p.photoUrls as string[] | undefined) ?? [];
  const finalDescriptions = queuedDescriptions.length > 0
    ? queuedDescriptions
    : (p.photoDescriptions as string[] | undefined) ?? [];

  await completeJob(
    orderId,
    p.technicianId as string,
    finalUrls,
    p.notes as string | undefined,
    finalDescriptions.length > 0 ? finalDescriptions : undefined,
  );

  // Clean up photo queue for this order
  if (queuedPhotos.length > 0) {
    await deletePhotosForOrder(orderId);
  }
}

async function handleRegisterDevice(entry: QueuedWrite) {
  const p = entry.payload;
  await registerDevice(p.orderId as string, p.technicianId as string, p.input as DeviceRegistrationInput);
}

const HANDLERS: Record<WriteType, (entry: QueuedWrite) => Promise<void>> = {
  accept_job: handleAcceptJob,
  start_job: handleStartJob,
  complete_job: handleCompleteJob,
  register_device: handleRegisterDevice,
};

// ── Context types ────────────────────────────────────────────────────
interface OfflineQueueState {
  pendingCount: number;
  failures: FailedWrite[];
  enqueue: (type: WriteType, payload: Record<string, unknown>) => Promise<void>;
  retryAll: () => Promise<void>;
  dismissFailure: (entryId: string) => void;
}

const OfflineQueueContext = createContext<OfflineQueueState | null>(null);

export function useOfflineQueue(): OfflineQueueState {
  const ctx = useContext(OfflineQueueContext);
  if (!ctx) throw new Error('useOfflineQueue must be used within OfflineQueueProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────
export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [failures, setFailures] = useState<FailedWrite[]>([]);

  const refreshCount = useCallback(async () => {
    const count = await writeQueueCount();
    setPendingCount(count);
  }, []);

  const handleDrainResult = useCallback((result: DrainResult) => {
    setPendingCount(result.remaining);
    if (result.failed.length > 0) {
      setFailures(prev => [...prev, ...result.failed]);
    }
  }, []);

  useEffect(() => {
    setFlushHandlers(HANDLERS, handleDrainResult);
    refreshCount();

    const onOnline = () => { void flush(); };
    window.addEventListener('online', onOnline);
    if (navigator.onLine) void flush();

    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [handleDrainResult, refreshCount]);

  const enqueue = useCallback(async (type: WriteType, payload: Record<string, unknown>) => {
    await enqueueAndFlush(type, payload);
    // Optimistically increment — drain callback will set the real count
    setPendingCount(prev => prev + 1);
  }, []);

  const retryAll = useCallback(async () => {
    // Re-enqueue failed items
    setFailures([]);
    const result = await flush();
    handleDrainResult(result);
  }, [handleDrainResult]);

  const dismissFailure = useCallback((entryId: string) => {
    setFailures(prev => prev.filter(f => f.entry.id !== entryId));
  }, []);

  return (
    <OfflineQueueContext.Provider value={{ pendingCount, failures, enqueue, retryAll, dismissFailure }}>
      {children}
    </OfflineQueueContext.Provider>
  );
}
