'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  QrCode, CheckCircle, ArrowLeft, ClipboardCheck, Camera, CloudOff, RefreshCw, X,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const cardParam = searchParams.get('card');
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

  const pickerItems = useMemo(() => {
    const deviceByOrderId = new Map<string, Device>();
    for (const d of techDevices) {
      deviceByOrderId.set(d.orderId, d);
    }
    const orderIds = new Set<string>();
    const items: { order: Order | null; device: Device | null }[] = [];
    for (const order of techOrders) {
      orderIds.add(order.id);
      items.push({ order, device: deviceByOrderId.get(order.id) || null });
    }
    for (const d of techDevices) {
      if (!orderIds.has(d.orderId)) {
        items.push({ order: null, device: d });
      }
    }
    return items;
  }, [techDevices, techOrders]);

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

  useEffect(() => {
    if (cardParam && user && step === 'idle') {
      openDevicePicker();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardParam, user]);

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

  const backBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--ink-soft)',
    background: 'transparent',
    border: 'none',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  };

  return (
    <div className="sc">
      <main className="sc-main" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {pendingCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--warn-tint)',
              border: '1px solid var(--warn)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warn)' }}>
              <CloudOff className="w-5 h-5" />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {pendingCount} {pendingCount > 1 ? ts.visitsPendingSync : ts.visitPendingSync}
              </span>
            </div>
            <button
              onClick={handleManualSync}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--warn)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RefreshCw className="w-4 h-4" /> {ts.retryNow}
            </button>
          </div>
        )}

        {step === 'idle' && (
          <div style={{ textAlign: 'center', padding: '64px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'var(--brand-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <QrCode className="w-12 h-12" style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <h1 className="sc-h1" style={{ marginBottom: 8 }}>{ts.title}</h1>
              <p className="sc-lede" style={{ maxWidth: 360, margin: '0 auto' }}>{ts.subtitle}</p>
            </div>
            <button
              onClick={() => setStep('scanning')}
              className="sc-cta"
              style={{ padding: '16px 32px', fontSize: 17 }}
            >
              {ts.startScan}
            </button>
          </div>
        )}

        {step === 'device-picker' && (
          <>
            <button onClick={handleReset} style={backBtn}>
              <ArrowLeft className="w-4 h-4" /> {ts.back}
            </button>
            <div className="sc-card-static">
              <h2 className="sc-h2" style={{ marginTop: 0, marginBottom: 16 }}>{ts.chooseSite}</h2>
              {loadingDevices ? (
                <p className="sc-helper" style={{ padding: '16px 0' }}>{ts.loadingSites}</p>
              ) : techOrders.length === 0 && techDevices.length === 0 ? (
                <p className="sc-helper" style={{ padding: '16px 0' }}>{ts.noJobsFound}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pickerItems.map((item) => {
                    const hasDevice = !!item.device;
                    const name = item.order?.customerInfo?.name || item.device?.customerInfo?.name || ts.unknownCustomer;
                    const addr = item.order?.installationAddress ?? item.device!.installationAddress;
                    const addressLine1 = addr.street;
                    const addressLine2 = [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ');
                    const phone = item.order?.customerInfo?.phone || item.device?.customerInfo?.phone || '';
                    const order = item.order;
                    let appointment: string | null = null;
                    if (order) {
                      const when = order.scheduledAt?.toDate() ?? order.installationDate?.toDate();
                      if (when) {
                        const date = when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                        if (order.scheduledAt) {
                          const time = when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                          appointment = `${date} · ${time}`;
                        } else {
                          appointment = order.timeSlot ? `${date} · ${order.timeSlot}h` : date;
                        }
                      }
                    }
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
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: 16,
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--line)',
                          background: hasDevice ? 'var(--paper)' : 'var(--off-paper)',
                          opacity: hasDevice ? 1 : 0.7,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { if (hasDevice) e.currentTarget.style.background = 'var(--off-paper)'; }}
                        onMouseLeave={(e) => { if (hasDevice) e.currentTarget.style.background = 'var(--paper)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <p style={{ margin: 0, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                            {phone && (
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--soft)' }}>{phone}</p>
                            )}
                            <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
                              <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addressLine1}</p>
                              {addressLine2 && <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addressLine2}</p>}
                            </div>
                            {appointment && (
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--brand)' }}>{appointment}</p>
                            )}
                            {item.order && (
                              <p style={{ margin: 0, fontSize: 12, color: 'var(--soft)' }}>
                                {ts.orderNumber} #{item.order.orderNumber}
                              </p>
                            )}
                          </div>
                          <div style={{ marginLeft: 12, flexShrink: 0 }}>
                            {hasDevice ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  background: 'var(--brand-tint)',
                                  color: 'var(--brand)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  borderRadius: 9999,
                                }}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {ts.registered}
                              </span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '4px 8px',
                                  background: 'var(--warn-tint)',
                                  color: 'var(--warn)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  borderRadius: 9999,
                                }}
                              >
                                <QrCode className="w-3 h-3" />
                                {ts.noDevice}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {step === 'form' && device && (
          <>
            <button onClick={handleReset} style={backBtn}>
              <ArrowLeft className="w-4 h-4" /> {ts.back}
            </button>

            <div className="sc-card-static">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-tint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClipboardCheck className="w-6 h-6" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <h2 className="sc-h2" style={{ margin: 0 }}>{ts.maintenanceUpdate}</h2>
                  <p className="sc-helper" style={{ margin: 0 }}>
                    {device.customerInfo.name} — {device.installationAddress.city}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="sc-label" style={{ display: 'block', marginBottom: 12 }}>{ts.checklist}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { key: 'installationOk', label: ts.installationOk },
                    { key: 'operationOk', label: ts.operationOk },
                    { key: 'waterPressureOk', label: ts.waterPressureOk },
                    { key: 'sedimentFilterReplaced', label: ts.sedimentFilterReplaced },
                    { key: 'carbonFilterReplaced', label: ts.carbonFilterReplaced },
                  ].map((item) => (
                    <label
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: 'var(--off-paper)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checks[item.key as keyof MaintenanceVisitChecks]}
                        onChange={(e) =>
                          setChecks({ ...checks, [item.key]: e.target.checked })
                        }
                        style={{ width: 20, height: 20, accentColor: 'var(--brand)' }}
                      />
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

              <div style={{ marginBottom: 24 }}>
                <label className="sc-label">{ts.remark}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={ts.remarkPlaceholder}
                  rows={4}
                  className="sc-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleReset}
                  className="sc-cta-ghost"
                  style={{ flex: 1 }}
                >
                  {ts.cancel}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="sc-cta"
                  style={{ flex: 1, opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? ts.submitting : ts.submit}
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '64px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: savedOffline ? 'var(--warn-tint)' : 'var(--brand-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {savedOffline ? (
                <CloudOff className="w-12 h-12" style={{ color: 'var(--warn)' }} />
              ) : (
                <CheckCircle className="w-12 h-12" style={{ color: 'var(--brand)' }} />
              )}
            </div>
            <div>
              <h2 className="sc-h1" style={{ marginBottom: 8 }}>
                {savedOffline ? ts.savedOffline : ts.visitRecorded}
              </h2>
              <p className="sc-lede" style={{ margin: 0 }}>
                {savedOffline ? ts.savedOfflineDesc : ts.visitRecordedDesc}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, width: '100%' }}>
              <button
                onClick={handleScanAnother}
                className="sc-cta"
                style={{ padding: '16px 32px', fontSize: 17 }}
              >
                {ts.scanAnother}
              </button>
              {device?.orderId && !savedOffline && (
                <button
                  onClick={() => router.push(`/technician/jobs/${device.orderId}`)}
                  className="sc-cta-ghost"
                  style={{ padding: '12px 32px' }}
                >
                  {ts.viewJobDetails}
                </button>
              )}
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 24px',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--ink-soft)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {ts.done}
              </button>
            </div>
          </div>
        )}
      </main>
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
      <label className="sc-label">{label}</label>
      {previewUrl ? (
        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={photoAltLabel}
            style={{
              width: '100%',
              height: 160,
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)',
              display: 'block',
            }}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={removeAriaLabel}
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 160,
            background: 'var(--off-paper)',
            border: '1px dashed var(--line)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Camera className="w-6 h-6" style={{ color: 'var(--soft)' }} />
          <span style={{ fontSize: 14, color: 'var(--ink-soft)' }}>{tapToCapture}</span>
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onChange(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
