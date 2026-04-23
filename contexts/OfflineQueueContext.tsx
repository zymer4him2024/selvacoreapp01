'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  for (const photo of queuedPhotos) {
    if (photo.downloadUrl) {
      photoUrls.push(photo.downloadUrl);
    } else {
      const url = await uploadInstallationPhoto(orderId, new File([photo.blob], photo.filename, { type: photo.blob.type }));
      photoUrls.push(url);
    }
  }

  // If no queued photos, check if URLs were passed directly (online path)
  const finalUrls = photoUrls.length > 0 ? photoUrls : (p.photoUrls as string[] | undefined) ?? [];

  await completeJob(orderId, p.technicianId as string, finalUrls, p.notes as string | undefined);

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

// ── Friendly labels for UI ───────────────────────────────────────────
const FRIENDLY_LABELS: Record<WriteType, string> = {
  accept_job: 'Job acceptance',
  start_job: 'Job start',
  complete_job: 'Job completion',
  register_device: 'Device registration',
};

// ── Context types ────────────────────────────────────────────────────
interface OfflineQueueState {
  pendingCount: number;
  failures: FailedWrite[];
  enqueue: (type: WriteType, payload: Record<string, unknown>) => Promise<void>;
  retryAll: () => Promise<void>;
  dismissFailure: (entryId: string) => void;
  friendlyLabel: (type: WriteType) => string;
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
  const onlineListenerRef = useRef(false);

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

  // Register handlers + online listener once
  useEffect(() => {
    setFlushHandlers(HANDLERS, handleDrainResult);
    refreshCount();

    if (!onlineListenerRef.current) {
      onlineListenerRef.current = true;
      const onOnline = () => { void flush(); };
      window.addEventListener('online', onOnline);
      // Attempt flush on mount if online (catch queued items from previous session)
      if (navigator.onLine) void flush();
    }
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

  const friendlyLabel = useCallback((type: WriteType) => FRIENDLY_LABELS[type] || type, []);

  return (
    <OfflineQueueContext.Provider value={{ pendingCount, failures, enqueue, retryAll, dismissFailure, friendlyLabel }}>
      {children}
    </OfflineQueueContext.Provider>
  );
}
