'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import {
  getTechnicianJobById,
  uploadInstallationPhoto,
  updateCompletionDetails,
} from '@/lib/services/technicianService';
import { getDeviceByOrderId } from '@/lib/services/deviceService';
import { getVisitsByDeviceId, updateVisitNotes } from '@/lib/services/maintenanceService';
import { enqueuePhoto, deletePhotosForOrder } from '@/lib/offline/photoQueue';
import { uploadAllOrCleanup } from '@/lib/utils/storageUploader';
import { Order } from '@/types/order';
import { Device, MaintenanceVisit } from '@/types/device';
import DeviceRegistrationFlow from '@/components/technician/DeviceRegistrationFlow';
import {
  ArrowLeft, MapPin, Calendar, Clock, User, Phone,
  MessageCircle, Image as ImageIcon, Video, Upload, X,
  Loader2, Play, CheckCircle, QrCode, Pencil,
  CheckCircle2, XCircle
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/formatters';
import JobStatusBadge from '@/components/technician/JobStatusBadge';
import { useTranslation } from '@/hooks/useTranslation';
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsappHelper';
import toast from 'react-hot-toast';

const ERROR_COLOR = '#ef4444';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = params.id as string;
  const autoRegister = searchParams.get('register') === 'true';
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const tj = t.technician.jobDetail;
  const { enqueue } = useOfflineQueue();
  const [job, setJob] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photosByCategory, setPhotosByCategory] = useState<Record<'before' | 'after' | 'additional', { file: File; preview: string }[]>>({
    before: [],
    after: [],
    additional: [],
  });
  const [completionNotes, setCompletionNotes] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [latestVisit, setLatestVisit] = useState<MaintenanceVisit | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editVisitNotes, setEditVisitNotes] = useState('');
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const lang = userData?.preferredLanguage || 'en';
  const deviceRegistered = device !== null;

  const installationPhotoGroups = useMemo(() => {
    const photos = job?.installationPhotos;
    if (!photos || photos.length === 0) return [];
    const before = photos.filter(p => p.description?.toLowerCase().startsWith('before'));
    const after = photos.filter(p => p.description?.toLowerCase().startsWith('after'));
    const additional = photos.filter(p => p.description?.toLowerCase().startsWith('additional'));
    const uncategorized = photos.filter(p => {
      const d = p.description?.toLowerCase() || '';
      return !d.startsWith('before') && !d.startsWith('after') && !d.startsWith('additional');
    });
    const groups: { label: string; photos: typeof photos }[] = [];
    if (before.length > 0) groups.push({ label: tj.photoBefore, photos: before });
    if (after.length > 0) groups.push({ label: tj.photoAfter, photos: after });
    if (additional.length > 0) groups.push({ label: tj.photoAdditional, photos: additional });
    if (uncategorized.length > 0) groups.push({ label: tj.installationPhotos, photos: uncategorized });
    return groups;
  }, [job?.installationPhotos, tj.photoBefore, tj.photoAfter, tj.photoAdditional, tj.installationPhotos]);

  useEffect(() => {
    if (user) {
      loadJob();
    }
  }, [user, jobId]);

  useEffect(() => {
    if (!autoRegister || loading || !job) return;
    if (job.status === 'completed' && !deviceRegistered) {
      setShowRegistration(true);
    }
  }, [autoRegister, loading, job, deviceRegistered]);

  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewImage]);

  const loadJob = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const jobData = await getTechnicianJobById(jobId, user.uid);

      if (!jobData) {
        toast.error(tj.notFound);
        router.push('/technician/jobs');
        return;
      }

      setJob(jobData);

      const deviceData = await getDeviceByOrderId(jobData.id);
      setDevice(deviceData);
      if (deviceData) {
        const visits = await getVisitsByDeviceId(deviceData.id);
        setLatestVisit(visits.length > 0 ? visits[0] : null);
      } else {
        setDevice(null);
        setLatestVisit(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tj.loadError;
      toast.error(message);
      router.push('/technician/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    if (!user || !job) return;

    setStarting(true);
    try {
      await enqueue('start_job', { orderId: job.id, technicianId: user.uid });
      setJob(prev => prev ? { ...prev, status: 'in_progress' as const } : prev);
      toast.success(tj.jobStarted);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tj.startJobError;
      toast.error(message);
    } finally {
      setStarting(false);
    }
  };

  const handlePhotoSelect = (category: 'before' | 'after' | 'additional', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotosByCategory(prev => ({
          ...prev,
          [category]: [...prev[category], { file, preview: reader.result as string }],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (category: 'before' | 'after' | 'additional', index: number) => {
    setPhotosByCategory(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  const handleCompleteJob = async () => {
    if (!user || !job) return;

    if (photosByCategory.before.length === 0) {
      toast.error(tj.photoBeforeRequired);
      return;
    }
    if (photosByCategory.after.length === 0) {
      toast.error(tj.photoAfterRequired);
      return;
    }

    try {
      setCompleting(true);
      setUploadingPhotos(true);

      const orderedEntries: { file: File; description: string }[] = [
        ...photosByCategory.before.map((p, i) => ({ file: p.file, description: `Before ${i + 1}` })),
        ...photosByCategory.after.map((p, i) => ({ file: p.file, description: `After ${i + 1}` })),
        ...photosByCategory.additional.map((p, i) => ({ file: p.file, description: `Additional ${i + 1}` })),
      ];
      const descriptions = orderedEntries.map(e => e.description);

      const isOnline = typeof navigator === 'undefined' || navigator.onLine;

      if (isOnline) {
        const photoUrls = await uploadAllOrCleanup(
          orderedEntries,
          (entry) => uploadInstallationPhoto(job.id, entry.file),
        );
        setUploadingPhotos(false);

        await enqueue('complete_job', {
          orderId: job.id,
          technicianId: user.uid,
          photoUrls,
          photoDescriptions: descriptions,
          notes: completionNotes,
        });
      } else {
        try {
          for (const entry of orderedEntries) {
            await enqueuePhoto(job.id, entry.file, entry.description);
          }
        } catch (photoErr) {
          await deletePhotosForOrder(job.id).catch(() => {});
          throw photoErr;
        }
        setUploadingPhotos(false);

        await enqueue('complete_job', {
          orderId: job.id,
          technicianId: user.uid,
          notes: completionNotes,
        });
      }

      setJob(prev => prev ? { ...prev, status: 'completed' as const } : prev);
      toast.success(tj.jobCompleted);
      setShowRegistration(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : tj.completeJobError;
      toast.error(msg);
    } finally {
      setCompleting(false);
      setUploadingPhotos(false);
    }
  };

  const handleContactCustomer = () => {
    if (!job) return;

    const whatsappLink = generateWhatsAppLink(
      {
        name: job.customerInfo.name,
        phone: job.customerInfo.whatsapp || job.customerInfo.phone,
      },
      {
        orderNumber: job.orderNumber,
        productName: job.productSnapshot.name[lang] || job.productSnapshot.name.en,
        installationDate: formatDate(job.installationDate, 'short'),
        address: `${job.installationAddress.city}, ${job.installationAddress.state}`,
      },
      lang
    );

    openWhatsApp(whatsappLink);
  };

  const openMapLink = () => {
    if (!job) return;
    const address = `${job.installationAddress.street}, ${job.installationAddress.city}, ${job.installationAddress.state} ${job.installationAddress.postalCode}`;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  if (loading) {
    return (
      <div className="sc" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sc-stack" style={{ alignItems: 'center', gap: 16 }}>
          <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
          <p className="sc-helper">{tj.loading}</p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const labelCol = (label: string, value: React.ReactNode) => (
    <div>
      <p className="sc-helper" style={{ margin: 0 }}>{label}</p>
      <div style={{ fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );

  return (
    <div
      className="sc"
      style={{ paddingBottom: job.status === 'accepted' ? 112 : 0 }}
    >
      <main className="sc-main">
        <div className="sc-stack-lg" style={{ gap: 32 }}>
          <div className="sc-row-between" style={{ alignItems: 'center' }}>
            <div className="sc-row" style={{ alignItems: 'center', gap: 16 }}>
              <button
                type="button"
                onClick={() => router.back()}
                aria-label={tj.goBack}
                className="sc-cta-ghost"
                style={{ padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="sc-h1">{tj.title}</h1>
                <p className="sc-helper" style={{ marginTop: 4 }}>{tj.orderNumber} #{job.orderNumber}</p>
              </div>
            </div>

            <JobStatusBadge status={job.status} />
          </div>

          <div className={job.status === 'accepted' ? 'hidden md:flex' : 'flex'} style={{ gap: 12 }}>
            <button
              type="button"
              onClick={handleContactCustomer}
              className="sc-cta"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}
            >
              <MessageCircle className="w-5 h-5" />
              {tj.contactCustomer}
            </button>

            {job.status === 'accepted' && (
              <button
                type="button"
                onClick={handleStartJob}
                disabled={starting}
                className="sc-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  opacity: starting ? 0.5 : 1,
                }}
              >
                {starting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {tj.starting}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    {tj.startJob}
                  </>
                )}
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            <div className="sc-card-static">
              <h3 style={{ fontWeight: 600, fontSize: 17, marginTop: 0, marginBottom: 16 }}>{tj.installationDetails}</h3>
              <div className="sc-stack" style={{ gap: 16 }}>
                <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <MapPin className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p className="sc-helper" style={{ margin: 0 }}>{tj.address}</p>
                    <p style={{ fontWeight: 500, margin: '4px 0 0' }}>
                      {job.installationAddress.street}<br />
                      {job.installationAddress.city}, {job.installationAddress.state} {job.installationAddress.postalCode}
                    </p>
                    {job.installationAddress.landmark && (
                      <p className="sc-helper" style={{ marginTop: 4 }}>
                        {tj.landmark}: {job.installationAddress.landmark}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openMapLink}
                  className="sc-cta"
                  style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}
                >
                  <MapPin className="w-5 h-5" />
                  {tj.openInMaps}
                </button>

                <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                  <Calendar className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <div>
                    <p className="sc-helper" style={{ margin: 0 }}>{tj.date}</p>
                    <p style={{ fontWeight: 500, margin: '2px 0 0' }}>{formatDate(job.installationDate, 'long')}</p>
                  </div>
                </div>

                <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                  <Clock className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <div>
                    <p className="sc-helper" style={{ margin: 0 }}>{tj.timeSlot}</p>
                    <p style={{ fontWeight: 500, margin: '2px 0 0' }}>{job.timeSlot}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sc-card-static">
              <h3 style={{ fontWeight: 600, fontSize: 17, marginTop: 0, marginBottom: 16 }}>{tj.customerInformation}</h3>
              <div className="sc-stack" style={{ gap: 12 }}>
                <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                  <User className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <div>
                    <p className="sc-helper" style={{ margin: 0 }}>{tj.name}</p>
                    <p style={{ fontWeight: 500, margin: '2px 0 0' }}>{job.customerInfo.name}</p>
                  </div>
                </div>

                <a
                  href={`tel:${(job.customerInfo.phone || '').replace(/[^\d+]/g, '')}`}
                  className="sc-row"
                  style={{
                    alignItems: 'center',
                    gap: 12,
                    margin: '0 -8px',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'background 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Phone className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <div>
                    <p className="sc-helper" style={{ margin: 0 }}>{t.common.phone}</p>
                    <p style={{ fontWeight: 500, color: 'var(--brand)', margin: '2px 0 0' }}>{job.customerInfo.phone}</p>
                  </div>
                </a>

                {job.customerNotes && (
                  <div>
                    <p className="sc-helper" style={{ marginBottom: 4 }}>{tj.customerNotes}</p>
                    <p style={{ fontSize: 14, background: 'var(--off-paper)', padding: 12, borderRadius: 'var(--radius-sm)', margin: 0 }}>
                      {job.customerNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="sc-card-static" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ fontWeight: 600, fontSize: 17, marginTop: 0, marginBottom: 16 }}>{tj.productInformation}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', columnGap: 16, rowGap: 12 }}>
                {labelCol(tj.product, job.productSnapshot.name[lang] || job.productSnapshot.name.en)}
                {labelCol(tj.variation, job.productSnapshot.variation)}
                {job.serviceSnapshot && labelCol(tj.service, job.serviceSnapshot.name[lang] || job.serviceSnapshot.name.en)}
                {job.serviceSnapshot && labelCol(tj.duration, `${job.serviceSnapshot.duration} ${tj.hours}`)}
                <div style={{ gridColumn: '1 / -1', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                  <p className="sc-helper" style={{ margin: 0 }}>{tj.yourEarnings}</p>
                  <p className="sc-price" style={{ color: 'var(--brand)', fontSize: 22, margin: '4px 0 0' }}>
                    {formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <h2 className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
              <ImageIcon className="w-6 h-6" />
              {tj.customerSitePhotos}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
              {job.sitePhotos?.waterSource && (
                <div>
                  <div
                    style={{ aspectRatio: '1 / 1', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => setPreviewImage(job.sitePhotos!.waterSource!.url)}
                  >
                    <img src={job.sitePhotos.waterSource.url} alt={tj.waterSource} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <p className="sc-helper" style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>{tj.waterSource}</p>
                </div>
              )}

              {job.sitePhotos?.productLocation && (
                <div>
                  <div
                    style={{ aspectRatio: '1 / 1', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => setPreviewImage(job.sitePhotos!.productLocation!.url)}
                  >
                    <img src={job.sitePhotos.productLocation.url} alt={tj.equipmentLocation} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <p className="sc-helper" style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>{tj.equipmentLocation}</p>
                </div>
              )}

              {job.sitePhotos?.fullShot && (
                <div>
                  <div
                    style={{ aspectRatio: '1 / 1', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => setPreviewImage(job.sitePhotos!.fullShot!.url)}
                  >
                    <img src={job.sitePhotos.fullShot.url} alt={tj.fullShot} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <p className="sc-helper" style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>{tj.fullShot}</p>
                </div>
              )}

              {job.sitePhotos?.waterRunningVideo && (
                <div>
                  <div style={{ aspectRatio: '1 / 1', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <video src={job.sitePhotos.waterRunningVideo.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />
                  </div>
                  <p className="sc-helper" style={{ fontSize: 12, marginTop: 8, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Video className="w-3 h-3" />
                    {tj.waterRunning}
                  </p>
                </div>
              )}
            </div>
          </div>

          {job.status === 'in_progress' && (
            <div className="sc-card-static">
              <h2 className="sc-h2" style={{ marginBottom: 24 }}>{tj.completeInstallation}</h2>

              <div className="sc-stack-lg" style={{ gap: 24 }}>
                {([
                  { key: 'before' as const, label: tj.photoBefore, hint: tj.photoBeforeHint, required: true, inputRef: beforeInputRef },
                  { key: 'after' as const, label: tj.photoAfter, hint: tj.photoAfterHint, required: true, inputRef: afterInputRef },
                  { key: 'additional' as const, label: tj.photoAdditional, hint: tj.photoAdditionalHint, required: false, inputRef: additionalInputRef },
                ]).map(({ key, label, hint, required, inputRef }) => {
                  const items = photosByCategory[key];
                  const filled = items.length > 0;
                  return (
                    <div key={key}>
                      <div className="sc-row-between" style={{ alignItems: 'center', marginBottom: 8 }}>
                        <div className="sc-row" style={{ alignItems: 'center', gap: 8 }}>
                          {filled ? (
                            <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                          ) : (
                            <div style={{ width: 20, height: 20, borderRadius: 9999, border: '2px solid var(--hairline)' }} />
                          )}
                          <label style={{ fontWeight: 500 }}>
                            {label}
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 12,
                                padding: '2px 8px',
                                borderRadius: 9999,
                                background: required ? 'var(--warn-tint)' : 'var(--off-paper)',
                                color: required ? 'var(--warn)' : 'var(--soft)',
                              }}
                            >
                              {required ? tj.photoRequired : tj.photoOptional}
                            </span>
                          </label>
                        </div>
                        {items.length > 0 && (
                          <span className="sc-helper">{items.length}</span>
                        )}
                      </div>
                      <p className="sc-helper" style={{ fontSize: 12, marginBottom: 8, marginLeft: 28 }}>{hint}</p>

                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={(e) => handlePhotoSelect(key, e)}
                        style={{ display: 'none' }}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginLeft: 28 }}>
                        {items.map((item, index) => (
                          <div key={index} style={{ position: 'relative' }}>
                            <div style={{ aspectRatio: '1 / 1', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                              <img src={item.preview} alt={`${label} ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(key, index)}
                              aria-label={tj.removePhoto}
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                padding: 4,
                                background: ERROR_COLOR,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 9999,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          style={{
                            aspectRatio: '1 / 1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            background: 'var(--off-paper)',
                            border: '2px dashed var(--hairline)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--soft)',
                            cursor: 'pointer',
                            transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          <Upload className="w-5 h-5" />
                          <span style={{ fontSize: 12 }}>{tj.addPhotos}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="sc-label">{tj.completionNotesOptional}</label>
                  <textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder={tj.completionNotesPlaceholder}
                    className="sc-textarea"
                    rows={4}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCompleteJob}
                  disabled={completing || uploadingPhotos || photosByCategory.before.length === 0 || photosByCategory.after.length === 0}
                  className="sc-cta"
                  style={{
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '18px 24px',
                    opacity: (completing || uploadingPhotos || photosByCategory.before.length === 0 || photosByCategory.after.length === 0) ? 0.5 : 1,
                  }}
                >
                  {completing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {uploadingPhotos ? tj.uploading : tj.completing}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {tj.completeJob}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {job.status === 'completed' && (job.installationPhotos?.length || latestVisit) && (
            <div className="sc-card-static">
              <div className="sc-row-between" style={{ alignItems: 'center', marginBottom: 24 }}>
                <h2 className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 22, fontWeight: 700, margin: 0 }}>
                  <CheckCircle className="w-6 h-6" style={{ color: 'var(--brand)' }} />
                  {tj.installationComplete}
                </h2>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setEditNotes(job.technicianNotes || '');
                      setEditVisitNotes(latestVisit?.notes || '');
                      setNewPhotos([]);
                      setNewPhotoPreview([]);
                    }}
                    className="sc-cta-ghost"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 14 }}
                  >
                    <Pencil className="w-4 h-4" />
                    {tj.edit}
                  </button>
                )}
              </div>

              {job.installationPhotos && job.installationPhotos.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p className="sc-label">{tj.installationPhotos}</p>
                  <div className="sc-stack" style={{ gap: 16 }}>
                    {installationPhotoGroups.map(group => (
                      <div key={group.label}>
                        <p className="sc-helper" style={{ fontWeight: 500, marginBottom: 8 }}>{group.label} ({group.photos.length})</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16 }}>
                          {group.photos.map((photo, index) => (
                            <div key={`${group.label}-${index}`} style={{ position: 'relative' }}>
                              <div
                                style={{ aspectRatio: '1 / 1', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer' }}
                                onClick={() => setPreviewImage(photo.url)}
                              >
                                <img src={photo.url} alt={`${group.label} ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {isEditing && newPhotoPreview.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <p className="sc-helper" style={{ fontWeight: 500, marginBottom: 8 }}>{tj.photoAdditional}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16 }}>
                        {newPhotoPreview.map((preview, index) => (
                          <div key={`new-${index}`} style={{ position: 'relative' }}>
                            <div style={{ aspectRatio: '1 / 1', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '2px solid var(--brand-tint)' }}>
                              <img src={preview} alt={tj.newAlt.replace('{n}', String(index + 1))} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewPhotos(prev => prev.filter((_, i) => i !== index));
                                setNewPhotoPreview(prev => prev.filter((_, i) => i !== index));
                              }}
                              aria-label={tj.removePhoto}
                              style={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                padding: 4,
                                background: ERROR_COLOR,
                                color: '#fff',
                                border: 'none',
                                borderRadius: 9999,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isEditing && (
                    <div style={{ marginTop: 12 }}>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setNewPhotos(prev => [...prev, ...files]);
                          files.forEach(file => {
                            const reader = new FileReader();
                            reader.onloadend = () => setNewPhotoPreview(prev => [...prev, reader.result as string]);
                            reader.readAsDataURL(file);
                          });
                        }}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="sc-cta-ghost"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          fontSize: 14,
                          border: '1px dashed var(--hairline)',
                          background: 'var(--off-paper)',
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        {tj.addPhotos}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(job.technicianNotes || isEditing) && (
                <div style={{ marginBottom: 24 }}>
                  <p className="sc-label">{tj.completionNotes}</p>
                  {isEditing ? (
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="sc-textarea"
                      rows={3}
                      placeholder={tj.addCompletionNotes}
                    />
                  ) : (
                    <div style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                      <p style={{ fontSize: 14, margin: 0 }}>{job.technicianNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {latestVisit && (
                <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 24 }}>
                  <p className="sc-label">{tj.maintenanceVisit}</p>

                  <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--soft)', marginBottom: 16 }}>
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateTime(latestVisit.createdAt)}</span>
                    <span style={{ color: 'var(--soft)' }}>{tj.by} {latestVisit.technicianName}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 16 }}>
                    {[
                      { key: 'installationOk' as const, label: tj.installationOk },
                      { key: 'operationOk' as const, label: tj.operationOk },
                      { key: 'waterPressureOk' as const, label: tj.waterPressureOk },
                      { key: 'sedimentFilterReplaced' as const, label: tj.sedimentFilterReplaced },
                      { key: 'carbonFilterReplaced' as const, label: tj.carbonFilterReplaced },
                    ].map(({ key, label }) => (
                      <div key={key} className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14 }}>
                        {latestVisit.checks[key] ? (
                          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                        ) : (
                          <XCircle className="w-4 h-4" style={{ color: 'var(--soft)' }} />
                        )}
                        <span style={{ color: latestVisit.checks[key] ? 'var(--ink)' : 'var(--soft)' }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {(latestVisit.beforePhotoUrl || latestVisit.afterPhotoUrl) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      {latestVisit.beforePhotoUrl && (
                        <div>
                          <p className="sc-helper" style={{ fontSize: 12, marginBottom: 8, textAlign: 'center' }}>{tj.before}</p>
                          <div
                            style={{ aspectRatio: '16 / 9', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => setPreviewImage(latestVisit.beforePhotoUrl!)}
                          >
                            <img src={latestVisit.beforePhotoUrl} alt={tj.before} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </div>
                      )}
                      {latestVisit.afterPhotoUrl && (
                        <div>
                          <p className="sc-helper" style={{ fontSize: 12, marginBottom: 8, textAlign: 'center' }}>{tj.after}</p>
                          <div
                            style={{ aspectRatio: '16 / 9', background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() => setPreviewImage(latestVisit.afterPhotoUrl!)}
                          >
                            <img src={latestVisit.afterPhotoUrl} alt={tj.after} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(latestVisit.notes || isEditing) && (
                    <div>
                      <p className="sc-label">{tj.visitNotes}</p>
                      {isEditing ? (
                        <textarea
                          value={editVisitNotes}
                          onChange={(e) => setEditVisitNotes(e.target.value)}
                          className="sc-textarea"
                          rows={3}
                          placeholder={tj.addVisitNotes}
                        />
                      ) : (
                        <div style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                          <p style={{ fontSize: 14, margin: 0 }}>{latestVisit.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="sc-row" style={{ gap: 12, marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--hairline)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setNewPhotos([]);
                      setNewPhotoPreview([]);
                    }}
                    disabled={saving}
                    className="sc-cta-ghost"
                    style={{ flex: 1, padding: '12px 16px', opacity: saving ? 0.5 : 1 }}
                  >
                    {tj.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user || !job) return;
                      setSaving(true);
                      try {
                        const newPhotoUrls = newPhotos.length > 0
                          ? await uploadAllOrCleanup(
                              newPhotos,
                              (photo) => uploadInstallationPhoto(job.id, photo),
                            )
                          : [];

                        await updateCompletionDetails(job.id, user.uid, {
                          technicianNotes: editNotes,
                          newPhotoUrls: newPhotoUrls.length > 0 ? newPhotoUrls : undefined,
                        });

                        if (latestVisit && editVisitNotes !== latestVisit.notes) {
                          await updateVisitNotes(latestVisit.id, editVisitNotes);
                        }

                        toast.success(tj.changesSaved);
                        setIsEditing(false);
                        setNewPhotos([]);
                        setNewPhotoPreview([]);
                        await loadJob();
                      } catch (error: unknown) {
                        const message = error instanceof Error ? error.message : tj.changesSaveError;
                        toast.error(message);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="sc-cta"
                    style={{ flex: 1, padding: '12px 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? 0.5 : 1 }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {tj.saving}
                      </>
                    ) : (
                      tj.saveChanges
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {showRegistration && user && job.status === 'completed' && (
            <div className="sc-card-static">
              <DeviceRegistrationFlow
                orderId={job.id}
                technicianId={user.uid}
                onComplete={() => router.push('/technician/jobs?tab=completed')}
                onSkip={() => {
                  setShowRegistration(false);
                  router.push('/technician/jobs?tab=completed');
                }}
              />
            </div>
          )}

          {!showRegistration && job.status === 'completed' && !deviceRegistered && user && (
            <div
              className="sc-card-static"
              style={{ borderLeft: '4px solid var(--warn)', background: 'var(--warn-tint)' }}
            >
              <div className="sc-row-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontWeight: 600, margin: 0 }}>{tj.deviceNotRegistered}</h3>
                  <p className="sc-helper" style={{ margin: '4px 0 0' }}>{tj.deviceNotRegisteredDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegistration(true)}
                  className="sc-cta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
                >
                  <QrCode className="w-5 h-5" />
                  {tj.registerDevice}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {job.status === 'accepted' && (
        <div
          className="md:hidden"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)',
            zIndex: 30,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--hairline)',
            padding: '12px 16px',
          }}
        >
          <div className="sc-row" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={handleContactCustomer}
              className="sc-cta"
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}
            >
              <MessageCircle className="w-5 h-5" />
              {tj.contactCustomer}
            </button>
            <button
              type="button"
              onClick={handleStartJob}
              disabled={starting}
              className="sc-cta"
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', opacity: starting ? 0.5 : 1 }}
            >
              {starting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {tj.starting}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {tj.startJob}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            aria-label={tj.closePreview}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              padding: 8,
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            <X className="w-6 h-6" style={{ color: '#fff' }} />
          </button>

          <img
            src={previewImage}
            alt={tj.previewAlt}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
