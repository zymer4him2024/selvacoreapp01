'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  QrCode, CheckCircle, ArrowLeft, ClipboardCheck, Camera, CloudOff, RefreshCw, X,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import QRScanner from '@/components/technician/QRScanner';
import { getDeviceByQrCode, getDevicesByTechnicianId } from '@/lib/services/deviceService';
import { getTechnicianJobs } from '@/lib/services/technicianService';
import { completeVisitAndResetSchedules } from '@/lib/services/maintenanceService';
import { getCustomerContactInfo, getCustomerContactMap } from '@/lib/services/userService';
import { Device, MaintenanceVisitChecks } from '@/types/device';
import { Order } from '@/types/order';
import { useAuth } from '@/contexts/AuthContext';
import { compressImage } from '@/lib/utils/imageCompression';
import { cacheDevice, cacheDevices, getCachedDevice } from '@/lib/offline/deviceCache';
import { useTranslation } from '@/hooks/useTranslation';
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
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const ts = t.technician.scan;
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
  const [techOrders, setTechOrders] = useState<Order[]>([]);
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
      if (synced > 0) {
        toast.success(synced === 1 ? ts.syncedOne : ts.syncedMany.replace('{n}', String(synced)));
      } else if (remaining > 0) {
        toast.error(ts.stillOfflineRetryAuto);
      }
      refreshPending();
    } catch {
      toast.error(ts.syncFailed);
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
          toast.error(ts.offlineAndNotCached);
          setStep('idle');
          return;
        }
      } else {
        foundDevice = await getDeviceByQrCode(qrData);
        if (foundDevice) {
          const live = await getCustomerContactInfo(foundDevice.customerId);
          if (live) {
            foundDevice = { ...foundDevice, customerInfo: { ...foundDevice.customerInfo, ...live } };
          }
          cacheDevice(foundDevice).catch(() => {});
        } else {
          // Might be a device we've seen before but is temporarily unreachable
          const cached = await getCachedDevice(qrData);
          if (cached) {
            foundDevice = cached;
          } else {
            toast.error(ts.qrNotLinked);
            setStep('idle');
            return;
          }
        }
      }

      openForm(foundDevice);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ts.lookupError;
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
        toast.error(ts.offlineDeviceListError);
        setStep('idle');
        return;
      }
      const [devices, orders] = await Promise.all([
        getDevicesByTechnicianId(user.uid),
        getTechnicianJobs(user.uid, ['accepted', 'in_progress', 'completed']),
      ]);

      const ids = [
        ...devices.map((d) => d.customerId),
        ...orders.map((o) => o.customerId),
      ].filter(Boolean) as string[];
      const customerMap = await getCustomerContactMap(ids);

      const enrichedDevices = devices.map((d) => {
        const live = customerMap.get(d.customerId);
        return live ? { ...d, customerInfo: { ...d.customerInfo, ...live } } : d;
      });
      const enrichedOrders = orders.map((o) => {
        const live = customerMap.get(o.customerId);
        return live
          ? { ...o, customerInfo: { ...o.customerInfo, ...live } }
          : o;
      });

      setTechDevices(enrichedDevices);
      setTechOrders(enrichedOrders);
      cacheDevices(enrichedDevices).catch(() => {});
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ts.loadDevicesError;
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
      toast.error(ts.checkAtLeastOne);
      return;
    }

    setSubmitting(true);
    try {
      const technicianName = userData?.displayName || t.technician.profile.defaultTechName;
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
        toast.success(ts.savedOfflineToast);
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
        toast.success(ts.visitRecordedToast);
      } catch (error) {
        // Only fall back to the offline queue for actual connectivity errors.
        // Permission-denied, quota, validation, etc. must surface to the user
        // so they don't sit forever in the queue hitting the same error.
        const wentOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
        const firebaseCode =
          error && typeof error === 'object' && 'code' in error
            ? String((error as { code?: unknown }).code ?? '')
            : '';
        const isNetworkError =
          wentOffline ||
          firebaseCode === 'unavailable' ||
          firebaseCode === 'deadline-exceeded' ||
          firebaseCode === 'cancelled' ||
          (error instanceof TypeError && /fetch|network/i.test(error.message));

        if (isNetworkError) {
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
          toast.error(ts.networkErrorSavedOffline);
        } else {
          const message = error instanceof Error ? error.message : ts.submitFailed;
          toast.error(`${ts.submitFailed}: ${message}`);
          // Stay on the form so the technician can retry or adjust.
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ts.submitFailed;
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
    setTechOrders([]);
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
              {pendingCount} {pendingCount > 1 ? ts.visitsPendingSync : ts.visitPendingSync}
            </span>
          </div>
          <button
            onClick={handleManualSync}
            className="flex items-center gap-1.5 text-sm font-semibold text-warning hover:text-warning/80"
          >
            <RefreshCw className="w-4 h-4" /> {ts.retryNow}
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
            <h1 className="text-2xl font-bold mb-2">{ts.title}</h1>
            <p className="text-text-secondary max-w-sm mx-auto">
              {ts.subtitle}
            </p>
          </div>
          <button
            onClick={() => setStep('scanning')}
            className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all text-lg"
          >
            {ts.startScan}
          </button>
        </div>
      )}

      {/* Device picker (common maintenance QR) */}
      {step === 'device-picker' && (
        <>
          <button onClick={handleReset} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-all">
            <ArrowLeft className="w-4 h-4" /> {ts.back}
          </button>
          <div className="apple-card">
            <h2 className="text-xl font-bold mb-4">{ts.chooseSite}</h2>
            {loadingDevices ? (
              <p className="text-text-secondary py-4">{ts.loadingSites}</p>
            ) : techOrders.length === 0 && techDevices.length === 0 ? (
              <p className="text-text-secondary py-4">{ts.noJobsFound}</p>
            ) : (
              <div className="space-y-2">
                {(() => {
                  // Build a map of orderId → device for quick lookup
                  const deviceByOrderId = new Map<string, Device>();
                  for (const d of techDevices) {
                    deviceByOrderId.set(d.orderId, d);
                  }
                  // Show orders (each with device status)
                  const orderIds = new Set<string>();
                  const items: { order: Order; device: Device | null }[] = [];
                  for (const order of techOrders) {
                    orderIds.add(order.id);
                    items.push({ order, device: deviceByOrderId.get(order.id) || null });
                  }
                  // Include orphan devices (device exists but order wasn't in the fetched list)
                  for (const d of techDevices) {
                    if (!orderIds.has(d.orderId)) {
                      items.push({ order: null as unknown as Order, device: d });
                    }
                  }

                  return items.map((item) => {
                    const hasDevice = !!item.device;
                    const name = item.order?.customerInfo?.name || item.device?.customerInfo?.name || 'Unknown';
                    const addr = item.order?.installationAddress ?? item.device!.installationAddress;
                    const addressLine1 = addr.street;
                    const addressLine2 = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ');
                    const phone = item.order?.customerInfo?.phone || item.device?.customerInfo?.phone || '';
                    const appointment = (() => {
                      const order = item.order;
                      if (!order) return null;
                      const when = order.scheduledAt?.toDate() ?? order.installationDate?.toDate();
                      if (!when) return null;
                      const date = when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                      if (order.scheduledAt) {
                        const time = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                        return `${date} · ${time}`;
                      }
                      return order.timeSlot ? `${date} · ${order.timeSlot}h` : date;
                    })();
                    const key = item.device?.id || item.order?.id;

                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (hasDevice) {
                            openForm(item.device!);
                          } else {
                            toast.error(ts.deviceNotRegisteredYet);
                          }
                        }}
                        className={`w-full text-left p-4 rounded-apple border transition-all ${
                          hasDevice
                            ? 'bg-surface-elevated hover:bg-surface-elevated/80 border-border'
                            : 'bg-surface-elevated/50 border-border/50 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="font-medium truncate">{name}</p>
                            {phone && (
                              <p className="text-xs text-text-tertiary truncate">{phone}</p>
                            )}
                            <div className="text-sm text-text-secondary">
                              <p className="truncate">{addressLine1}</p>
                              {addressLine2 && <p className="truncate">{addressLine2}</p>}
                            </div>
                            {appointment && (
                              <p className="text-xs font-medium text-primary">{appointment}</p>
                            )}
                            {item.order && (
                              <p className="text-xs text-text-tertiary">
                                {ts.orderNumber} #{item.order.orderNumber}
                              </p>
                            )}
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            {hasDevice ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                {ts.registered}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full">
                                <QrCode className="w-3 h-3" />
                                {ts.noDevice}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </>
      )}

      {/* Maintenance form */}
      {step === 'form' && device && (
        <>
          <button onClick={handleReset} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-all">
            <ArrowLeft className="w-4 h-4" /> {ts.back}
          </button>

          <div className="apple-card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-apple bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{ts.maintenanceUpdate}</h2>
                <p className="text-sm text-text-secondary">
                  {device.customerInfo.name} — {device.installationAddress.city}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">{ts.checklist}</label>
              <div className="space-y-2">
                {[
                  { key: 'installationOk', label: ts.installationOk },
                  { key: 'operationOk', label: ts.operationOk },
                  { key: 'waterPressureOk', label: ts.waterPressureOk },
                  { key: 'sedimentFilterReplaced', label: ts.sedimentFilterReplaced },
                  { key: 'carbonFilterReplaced', label: ts.carbonFilterReplaced },
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
                label={ts.before}
                slotKey="before"
                file={beforeFile}
                onChange={setBeforeFile}
                removeAriaLabel={ts.removePhoto.replace('{label}', ts.before)}
                photoAltLabel={ts.photoAlt.replace('{label}', ts.before)}
                tapToCapture={ts.tapToCapture}
              />
              <PhotoSlot
                label={ts.after}
                slotKey="after"
                file={afterFile}
                onChange={setAfterFile}
                removeAriaLabel={ts.removePhoto.replace('{label}', ts.after)}
                photoAltLabel={ts.photoAlt.replace('{label}', ts.after)}
                tapToCapture={ts.tapToCapture}
              />
            </div>

            {/* Remark */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">{ts.remark}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={ts.remarkPlaceholder}
                rows={4}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-3 text-text-secondary hover:text-text-primary font-medium rounded-apple transition-all border border-border"
              >
                {ts.cancel}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-success hover:bg-success/90 disabled:opacity-50 text-white font-semibold rounded-apple transition-all"
              >
                {submitting ? ts.submitting : ts.submit}
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
              {savedOffline ? ts.savedOffline : ts.visitRecorded}
            </h2>
            <p className="text-text-secondary">
              {savedOffline ? ts.savedOfflineDesc : ts.visitRecordedDesc}
            </p>
          </div>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            {device?.orderId && !savedOffline && (
              <button
                onClick={() => router.push(`/technician/jobs/${device.orderId}`)}
                className="px-8 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all"
              >
                {ts.viewJobDetails}
              </button>
            )}
            <button
              onClick={handleScanAnother}
              className="px-8 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all"
            >
              {ts.scanAnother}
            </button>
            <button
              onClick={handleReset}
              className="px-8 py-3 text-text-secondary hover:text-text-primary font-medium rounded-apple transition-all"
            >
              {ts.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PhotoSlotProps {
  label: string;
  slotKey: string;
  file: File | null;
  onChange: (file: File | null) => void;
  removeAriaLabel: string;
  photoAltLabel: string;
  tapToCapture: string;
}

function PhotoSlot({ label, slotKey, file, onChange, removeAriaLabel, photoAltLabel, tapToCapture }: PhotoSlotProps) {
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

  const inputId = `photo-${slotKey}`;
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {previewUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={photoAltLabel}
            className="w-full h-40 object-cover rounded-apple border border-border"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            aria-label={removeAriaLabel}
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
          <span className="text-sm text-text-secondary">{tapToCapture}</span>
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
