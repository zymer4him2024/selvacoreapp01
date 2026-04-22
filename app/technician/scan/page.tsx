'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  QrCode, CheckCircle, ArrowLeft, ClipboardCheck, Camera, CloudOff, RefreshCw, X,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import QRScanner from '@/components/technician/QRScanner';
import { getDeviceByQrCode, getDevicesByTechnicianId } from '@/lib/services/deviceService';
import { completeVisitAndResetSchedules } from '@/lib/services/maintenanceService';
import { Device, MaintenanceVisitChecks } from '@/types/device';
import { useAuth } from '@/contexts/AuthContext';
import { compressImage } from '@/lib/utils/imageCompression';
import { cacheDevice, cacheDevices, getCachedDevice } from '@/lib/offline/deviceCache';
import {
  enqueueVisit,
  pendingCount as getPendingCount,
  registerOnlineSync,
  syncAll,
  QueuedVisit,
} from '@/lib/offline/visitQueue';
import toast from 'react-hot-toast';

const MAINTENANCE_QR_PREFIX = 'SELVAVORE-MAINTENANCE';

type ScanStep = 'idle' | 'scanning' | 'form' | 'device-picker' | 'done';

const EMPTY_CHECKS: MaintenanceVisitChecks = {
  installationOk: false,
  operationOk: false,
  waterPressureOk: false,
  sedimentFilterReplaced: false,
  carbonFilterReplaced: false,
};

async function uploadVisitPhoto(
  deviceId: string,
  kind: 'before' | 'after',
  blob: Blob
): Promise<string> {
  const filename = `${kind}-${Date.now()}.jpg`;
  const path = `devices/${deviceId}/visits/${filename}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

async function submitVisitOnline(visit: QueuedVisit): Promise<void> {
  let beforeUrl: string | undefined;
  let afterUrl: string | undefined;
  if (visit.beforeBlob) beforeUrl = await uploadVisitPhoto(visit.device.id, 'before', visit.beforeBlob);
  if (visit.afterBlob) afterUrl = await uploadVisitPhoto(visit.device.id, 'after', visit.afterBlob);
  await completeVisitAndResetSchedules(
    visit.device,
    visit.technicianId,
    visit.technicianName,
    visit.checks,
    visit.notes,
    beforeUrl,
    afterUrl
  );
}

export default function TechnicianScanPage() {
  const { user, userData } = useAuth();
  const [step, setStep] = useState<ScanStep>('idle');
  const [device, setDevice] = useState<Device | null>(null);
  const [checks, setChecks] = useState<MaintenanceVisitChecks>(EMPTY_CHECKS);
  const [notes, setNotes] = useState('');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [techDevices, setTechDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const refreshPending = useCallback(async () => {
    try {
      const n = await getPendingCount();
      setPendingCount(n);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    refreshPending();
    registerOnlineSync(submitVisitOnline, () => {
      refreshPending();
    });
  }, [refreshPending]);

  const handleManualSync = async () => {
    try {
      const { synced, remaining } = await syncAll(submitVisitOnline);
      if (synced > 0) toast.success(`Synced ${synced} pending visit${synced > 1 ? 's' : ''}`);
      else if (remaining > 0) toast.error('Still offline or sync failed — will retry automatically');
      refreshPending();
    } catch {
      toast.error('Sync failed');
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      if (qrData.startsWith(MAINTENANCE_QR_PREFIX)) {
        await openDevicePicker();
        return;
      }

      // Device QR — try online first, fall back to cache if offline/unknown
      let foundDevice: Device | null = null;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        foundDevice = await getCachedDevice(qrData);
        if (!foundDevice) {
          toast.error("You're offline and this device isn't cached. Connect to internet and rescan.");
          setStep('idle');
          return;
        }
      } else {
        foundDevice = await getDeviceByQrCode(qrData);
        if (foundDevice) {
          cacheDevice(foundDevice).catch(() => {});
        } else {
          // Might be a device we've seen before but is temporarily unreachable
          const cached = await getCachedDevice(qrData);
          if (cached) {
            foundDevice = cached;
          } else {
            toast.error('Device not registered. This QR code is not linked to any device.');
            setStep('idle');
            return;
          }
        }
      }

      openForm(foundDevice);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to look up device';
      toast.error(message);
      setStep('idle');
    }
  };

  const openDevicePicker = async () => {
    if (!user) return;
    try {
      setLoadingDevices(true);
      setStep('device-picker');
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.error("You're offline — device list requires internet for initial load");
        setStep('idle');
        return;
      }
      const devices = await getDevicesByTechnicianId(user.uid);
      setTechDevices(devices);
      cacheDevices(devices).catch(() => {});
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load devices';
      toast.error(message);
      setStep('idle');
    } finally {
      setLoadingDevices(false);
    }
  };

  const openForm = (d: Device) => {
    setDevice(d);
    setChecks(EMPTY_CHECKS);
    setNotes('');
    setBeforeFile(null);
    setAfterFile(null);
    setSavedOffline(false);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!user || !device) return;

    const anyCheck = Object.values(checks).some(Boolean);
    if (!anyCheck) {
      toast.error('Please check at least one maintenance item.');
      return;
    }

    setSubmitting(true);
    try {
      const technicianName = userData?.displayName || 'Technician';
      const beforeBlob = beforeFile ? await compressImage(beforeFile) : null;
      const afterBlob = afterFile ? await compressImage(afterFile) : null;

      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (offline) {
        await enqueueVisit({
          device,
          technicianId: user.uid,
          technicianName,
          checks,
          notes,
          beforeBlob,
          afterBlob,
        });
        setSavedOffline(true);
        setStep('done');
        refreshPending();
        toast.success('Saved offline — will sync when online');
        return;
      }

      // Online path
      try {
        await submitVisitOnline({
          id: 'inline',
          device,
          technicianId: user.uid,
          technicianName,
          checks,
          notes,
          beforeBlob,
          afterBlob,
          queuedAt: Date.now(),
        });
        setSavedOffline(false);
        setStep('done');
        toast.success('Maintenance visit recorded');
      } catch (error) {
        // Network error → fall back to queue
        await enqueueVisit({
          device,
          technicianId: user.uid,
          technicianName,
          checks,
          notes,
          beforeBlob,
          afterBlob,
        });
        setSavedOffline(true);
        setStep('done');
        refreshPending();
        const message = error instanceof Error ? error.message : '';
        toast.error(`Upload failed${message ? `: ${message}` : ''} — saved offline`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Submission failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDevice(null);
    setChecks(EMPTY_CHECKS);
    setNotes('');
    setBeforeFile(null);
    setAfterFile(null);
    setTechDevices([]);
    setSavedOffline(false);
    setStep('idle');
  };

  const handleScanAnother = () => {
    handleReset();
    setStep('scanning');
  };

  if (step === 'scanning') {
    return (
      <QRScanner
        onScan={handleScan}
        onCancel={() => setStep('idle')}
        onError={(msg) => {
          toast.error(msg);
          setStep('idle');
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pending-sync banner (when offline queue has items) */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-warning/10 border border-warning/30 rounded-apple">
          <div className="flex items-center gap-2 text-warning">
            <CloudOff className="w-5 h-5" />
            <span className="text-sm font-medium">
              {pendingCount} visit{pendingCount > 1 ? 's' : ''} pending sync
            </span>
          </div>
          <button
            onClick={handleManualSync}
            className="flex items-center gap-1.5 text-sm font-semibold text-warning hover:text-warning/80"
          >
            <RefreshCw className="w-4 h-4" /> Retry now
          </button>
        </div>
      )}

      {/* Idle */}
      {step === 'idle' && (
        <div className="text-center py-16 space-y-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <QrCode className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Scan QR Code</h1>
            <p className="text-text-secondary max-w-sm mx-auto">
              Scan a device QR code or your maintenance card to record a visit.
            </p>
          </div>
          <button
            onClick={() => setStep('scanning')}
            className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all text-lg"
          >
            Start Scanning
          </button>
        </div>
      )}

      {/* Device picker (common maintenance QR) */}
      {step === 'device-picker' && (
        <>
          <button onClick={handleReset} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-all">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="apple-card">
            <h2 className="text-xl font-bold mb-4">Choose a site</h2>
            {loadingDevices ? (
              <p className="text-text-secondary py-4">Loading devices...</p>
            ) : techDevices.length === 0 ? (
              <p className="text-text-secondary py-4">No registered devices found for your account.</p>
            ) : (
              <div className="space-y-2">
                {techDevices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => openForm(d)}
                    className="w-full text-left p-4 bg-surface-elevated rounded-apple hover:bg-surface-elevated/80 border border-border transition-all"
                  >
                    <p className="font-medium">{d.customerInfo.name}</p>
                    <p className="text-sm text-text-secondary">
                      {d.installationAddress.street}, {d.installationAddress.city}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Maintenance form */}
      {step === 'form' && device && (
        <>
          <button onClick={handleReset} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-all">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="apple-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-apple bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Maintenance Update</h2>
                <p className="text-sm text-text-secondary">
                  {device.customerInfo.name} — {device.installationAddress.city}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Checklist</label>
              <div className="space-y-2">
                {[
                  { key: 'installationOk', label: 'Installation OK' },
                  { key: 'operationOk', label: 'Operation OK' },
                  { key: 'waterPressureOk', label: 'Water Pressure OK' },
                  { key: 'sedimentFilterReplaced', label: 'Sediment Filter replaced' },
                  { key: 'carbonFilterReplaced', label: 'Carbon Filter replaced' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 p-3 bg-surface-elevated rounded-apple cursor-pointer hover:bg-surface-elevated/80 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={checks[item.key as keyof MaintenanceVisitChecks]}
                      onChange={(e) =>
                        setChecks({ ...checks, [item.key]: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <PhotoSlot
                label="Before"
                file={beforeFile}
                onChange={setBeforeFile}
              />
              <PhotoSlot
                label="After"
                file={afterFile}
                onChange={setAfterFile}
              />
            </div>

            {/* Remark */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Remark</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations, parts used, follow-up actions..."
                rows={4}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-3 text-text-secondary hover:text-text-primary font-medium rounded-apple transition-all border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-success hover:bg-success/90 disabled:opacity-50 text-white font-semibold rounded-apple transition-all"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="text-center py-16 space-y-6">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
            savedOffline ? 'bg-warning/10' : 'bg-success/10'
          }`}>
            {savedOffline ? (
              <CloudOff className="w-12 h-12 text-warning" />
            ) : (
              <CheckCircle className="w-12 h-12 text-success" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {savedOffline ? 'Saved offline' : 'Visit recorded'}
            </h2>
            <p className="text-text-secondary">
              {savedOffline
                ? 'Will sync automatically when you are back online.'
                : 'Maintenance timers have been updated where applicable.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button
              onClick={handleScanAnother}
              className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all"
            >
              Scan Another
            </button>
            <button
              onClick={handleReset}
              className="px-8 py-3 text-text-secondary hover:text-text-primary font-medium rounded-apple transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PhotoSlotProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

function PhotoSlot({ label, file, onChange }: PhotoSlotProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const inputId = `photo-${label.toLowerCase()}`;
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`${label} photo`}
            className="w-full h-40 object-cover rounded-apple border border-border"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            aria-label={`Remove ${label} photo`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex flex-col items-center justify-center gap-2 h-40 bg-surface-elevated border border-dashed border-border rounded-apple cursor-pointer hover:border-primary/50 transition-all"
        >
          <Camera className="w-6 h-6 text-text-tertiary" />
          <span className="text-sm text-text-secondary">Tap to capture</span>
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          // Reset so the same file can be picked again after removal
          e.target.value = '';
        }}
      />
    </div>
  );
}
