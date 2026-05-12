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
  ArrowLeft, MapPin, Calendar, Clock, DollarSign, User, Phone,
  MessageCircle, Image as ImageIcon, Video, Upload, X, Check,
  Loader2, Play, CheckCircle, QrCode, Pencil,
  CheckCircle2, XCircle
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/formatters';
import JobStatusBadge from '@/components/technician/JobStatusBadge';
import { useTranslation } from '@/hooks/useTranslation';
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsappHelper';
import toast from 'react-hot-toast';

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

  // Deep-link: ?register=true auto-opens the device registration flow once
  // the job has loaded and is eligible (completed, no device yet).
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

      // Fetch device and latest maintenance visit for completed/in-progress jobs
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
      // Optimistic: update local state immediately
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
        // Online: upload photos to Storage directly, then queue the Firestore write.
        // If any photo upload fails, prior uploads are deleted from Storage.
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
        // Offline: store photo blobs in IDB photoQueue, then queue the write.
        // If any photo enqueue fails partway, clean up the partials so a retry
        // doesn't duplicate. The complete_job entry is only queued once all
        // photos are safely persisted.
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
          // No photoUrls / descriptions — flush handler will read blobs and descriptions from photoQueue
        });
      }

      // Optimistic: show completed UI
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{tj.loading}</p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className={`space-y-8 animate-fade-in ${job.status === 'accepted' ? 'pb-28 md:pb-0' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            aria-label={tj.goBack}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{tj.title}</h1>
            <p className="text-text-secondary mt-1">{tj.orderNumber} #{job.orderNumber}</p>
          </div>
        </div>

        {/* Status Badge */}
        <JobStatusBadge status={job.status} />
      </div>

      {/* Quick Actions */}
      <div className={`${job.status === 'accepted' ? 'hidden md:flex' : 'flex'} gap-3`}>
        <button
          onClick={handleContactCustomer}
          className="flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/80 text-white font-semibold rounded-apple transition-all hover:scale-[1.02]"
        >
          <MessageCircle className="w-5 h-5" />
          {tj.contactCustomer}
        </button>

        {job.status === 'accepted' && (
          <button
            onClick={handleStartJob}
            disabled={starting}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-[1.02]"
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

      {/* Installation, Customer, Product */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Installation Details */}
        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">{tj.installationDetails}</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-text-secondary">{tj.address}</p>
                <p className="font-medium">
                  {job.installationAddress.street}<br />
                  {job.installationAddress.city}, {job.installationAddress.state} {job.installationAddress.postalCode}
                </p>
                {job.installationAddress.landmark && (
                  <p className="text-sm text-text-secondary mt-1">
                    {tj.landmark}: {job.installationAddress.landmark}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={openMapLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
            >
              <MapPin className="w-5 h-5" />
              {tj.openInMaps}
            </button>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-secondary">{tj.date}</p>
                <p className="font-medium">{formatDate(job.installationDate, 'long')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-secondary">{tj.timeSlot}</p>
                <p className="font-medium">{job.timeSlot}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">{tj.customerInformation}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-secondary">{tj.name}</p>
                <p className="font-medium">{job.customerInfo.name}</p>
              </div>
            </div>

            <a
              href={`tel:${(job.customerInfo.phone || '').replace(/[^\d+]/g, '')}`}
              className="flex items-center gap-3 -mx-2 px-2 py-2 rounded-apple hover:bg-surface-elevated transition-colors"
            >
              <Phone className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-secondary">{t.common.phone}</p>
                <p className="font-medium text-primary">{job.customerInfo.phone}</p>
              </div>
            </a>

            {job.customerNotes && (
              <div>
                <p className="text-sm text-text-secondary mb-1">{tj.customerNotes}</p>
                <p className="text-sm bg-surface-elevated p-3 rounded-apple">{job.customerNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="apple-card md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">{tj.productInformation}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-sm text-text-secondary">{tj.product}</p>
              <p className="font-semibold">{job.productSnapshot.name[lang] || job.productSnapshot.name.en}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">{tj.variation}</p>
              <p className="font-semibold">{job.productSnapshot.variation}</p>
            </div>
            {job.serviceSnapshot && (
              <>
                <div>
                  <p className="text-sm text-text-secondary">{tj.service}</p>
                  <p className="font-semibold">{job.serviceSnapshot.name[lang] || job.serviceSnapshot.name.en}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">{tj.duration}</p>
                  <p className="font-semibold">{job.serviceSnapshot.duration} {tj.hours}</p>
                </div>
              </>
            )}
            <div className="md:col-span-2 pt-3 border-t border-border">
              <p className="text-sm text-text-secondary">{tj.yourEarnings}</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Site Photos */}
      <div className="apple-card">
        <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
          <ImageIcon className="w-6 h-6" />
          {tj.customerSitePhotos}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {job.sitePhotos?.waterSource && (
            <div className="group relative">
              <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                <img
                  src={job.sitePhotos.waterSource.url}
                  alt={tj.waterSource}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  onClick={() => setPreviewImage(job.sitePhotos.waterSource!.url)}
                />
              </div>
              <p className="text-xs text-text-secondary mt-2 text-center">{tj.waterSource}</p>
            </div>
          )}

          {job.sitePhotos?.productLocation && (
            <div className="group relative">
              <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                <img
                  src={job.sitePhotos.productLocation.url}
                  alt={tj.equipmentLocation}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  onClick={() => setPreviewImage(job.sitePhotos.productLocation!.url)}
                />
              </div>
              <p className="text-xs text-text-secondary mt-2 text-center">{tj.equipmentLocation}</p>
            </div>
          )}

          {job.sitePhotos?.fullShot && (
            <div className="group relative">
              <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                <img
                  src={job.sitePhotos.fullShot.url}
                  alt={tj.fullShot}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  onClick={() => setPreviewImage(job.sitePhotos.fullShot!.url)}
                />
              </div>
              <p className="text-xs text-text-secondary mt-2 text-center">{tj.fullShot}</p>
            </div>
          )}

          {job.sitePhotos?.waterRunningVideo && (
            <div className="group relative">
              <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden">
                <video
                  src={job.sitePhotos.waterRunningVideo.url}
                  className="w-full h-full object-contain"
                  controls
                />
              </div>
              <p className="text-xs text-text-secondary mt-2 text-center flex items-center justify-center gap-1">
                <Video className="w-3 h-3" />
                {tj.waterRunning}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Job Completion Section */}
      {job.status === 'in_progress' && (
        <div className="apple-card">
          <h2 className="text-2xl font-bold mb-6">{tj.completeInstallation}</h2>

          {/* Photo Slots */}
          <div className="space-y-6">
            {([
              { key: 'before' as const, label: tj.photoBefore, hint: tj.photoBeforeHint, required: true, inputRef: beforeInputRef },
              { key: 'after' as const, label: tj.photoAfter, hint: tj.photoAfterHint, required: true, inputRef: afterInputRef },
              { key: 'additional' as const, label: tj.photoAdditional, hint: tj.photoAdditionalHint, required: false, inputRef: additionalInputRef },
            ]).map(({ key, label, hint, required, inputRef }) => {
              const items = photosByCategory[key];
              const filled = items.length > 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {filled ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-border" />
                      )}
                      <label className="font-medium">
                        {label}
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${required ? 'bg-warning/10 text-warning' : 'bg-surface-elevated text-text-secondary'}`}>
                          {required ? tj.photoRequired : tj.photoOptional}
                        </span>
                      </label>
                    </div>
                    {items.length > 0 && (
                      <span className="text-sm text-text-secondary">{items.length}</span>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary mb-2 ml-7">{hint}</p>

                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(e) => handlePhotoSelect(key, e)}
                    className="hidden"
                  />

                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3 ml-7">
                    {items.map((item, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden">
                          <img
                            src={item.preview}
                            alt={`${label} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => handleRemovePhoto(key, index)}
                          aria-label={tj.removePhoto}
                          className="absolute top-1 right-1 p-1 bg-error hover:bg-error/80 text-white rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => inputRef.current?.click()}
                      className="aspect-square flex flex-col items-center justify-center gap-1 bg-surface-elevated hover:bg-surface-secondary border-2 border-dashed border-border rounded-apple transition-all text-text-secondary"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">{tj.addPhotos}</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Completion Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {tj.completionNotesOptional}
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={tj.completionNotesPlaceholder}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
                rows={4}
              />
            </div>

            {/* Complete Button */}
            <button
              onClick={handleCompleteJob}
              disabled={completing || uploadingPhotos || photosByCategory.before.length === 0 || photosByCategory.after.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-success hover:bg-success/80 disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-[1.02]"
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

      {/* Completed Job Info */}
      {job.status === 'completed' && (job.installationPhotos?.length || latestVisit) && (
        <div className="apple-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-success" />
              {tj.installationComplete}
            </h2>
            {!isEditing && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditNotes(job.technicianNotes || '');
                  setEditVisitNotes(latestVisit?.notes || '');
                  setNewPhotos([]);
                  setNewPhotoPreview([]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-apple transition-all"
              >
                <Pencil className="w-4 h-4" />
                {tj.edit}
              </button>
            )}
          </div>

          {/* Installation Photos */}
          {job.installationPhotos && job.installationPhotos.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-text-secondary mb-3">{tj.installationPhotos}</p>
              <div className="space-y-4">
                {installationPhotoGroups.map(group => (
                  <div key={group.label}>
                    <p className="text-xs font-medium text-text-secondary mb-2">{group.label} ({group.photos.length})</p>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                      {group.photos.map((photo, index) => (
                        <div key={`${group.label}-${index}`} className="group relative">
                          <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                            <img
                              src={photo.url}
                              alt={`${group.label} ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onClick={() => setPreviewImage(photo.url)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {isEditing && newPhotoPreview.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-text-secondary mb-2">{tj.photoAdditional}</p>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                    {newPhotoPreview.map((preview, index) => (
                      <div key={`new-${index}`} className="relative group">
                        <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden border-2 border-primary/30">
                          <img src={preview} alt={tj.newAlt.replace('{n}', String(index + 1))} className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={() => {
                            setNewPhotos(prev => prev.filter((_, i) => i !== index));
                            setNewPhotoPreview(prev => prev.filter((_, i) => i !== index));
                          }}
                          aria-label={tj.removePhoto}
                          className="absolute top-1 right-1 p-1 bg-error hover:bg-error/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isEditing && (
                <div className="mt-3">
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
                    className="hidden"
                  />
                  <button
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-surface-elevated hover:bg-surface-secondary border border-dashed border-border rounded-apple transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    {tj.addPhotos}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Technician Notes */}
          {(job.technicianNotes || isEditing) && (
            <div className="mb-6">
              <p className="text-sm font-medium text-text-secondary mb-2">{tj.completionNotes}</p>
              {isEditing ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
                  rows={3}
                  placeholder={tj.addCompletionNotes}
                />
              ) : (
                <div className="p-4 bg-surface-elevated rounded-apple">
                  <p className="text-sm">{job.technicianNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Visit Summary */}
          {latestVisit && (
            <div className="border-t border-border pt-6">
              <p className="text-sm font-medium text-text-secondary mb-4">{tj.maintenanceVisit}</p>

              <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                <Calendar className="w-4 h-4" />
                <span>{formatDateTime(latestVisit.createdAt)}</span>
                <span className="text-text-tertiary">{tj.by} {latestVisit.technicianName}</span>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {[
                  { key: 'installationOk' as const, label: tj.installationOk },
                  { key: 'operationOk' as const, label: tj.operationOk },
                  { key: 'waterPressureOk' as const, label: tj.waterPressureOk },
                  { key: 'sedimentFilterReplaced' as const, label: tj.sedimentFilterReplaced },
                  { key: 'carbonFilterReplaced' as const, label: tj.carbonFilterReplaced },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {latestVisit.checks[key] ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-text-tertiary" />
                    )}
                    <span className={latestVisit.checks[key] ? '' : 'text-text-tertiary'}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Before/After Photos */}
              {(latestVisit.beforePhotoUrl || latestVisit.afterPhotoUrl) && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {latestVisit.beforePhotoUrl && (
                    <div>
                      <p className="text-xs text-text-secondary mb-2 text-center">{tj.before}</p>
                      <div className="aspect-video bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                        <img
                          src={latestVisit.beforePhotoUrl}
                          alt={tj.before}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onClick={() => setPreviewImage(latestVisit.beforePhotoUrl!)}
                        />
                      </div>
                    </div>
                  )}
                  {latestVisit.afterPhotoUrl && (
                    <div>
                      <p className="text-xs text-text-secondary mb-2 text-center">{tj.after}</p>
                      <div className="aspect-video bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                        <img
                          src={latestVisit.afterPhotoUrl}
                          alt={tj.after}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onClick={() => setPreviewImage(latestVisit.afterPhotoUrl!)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Visit Notes */}
              {(latestVisit.notes || isEditing) && (
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">{tj.visitNotes}</p>
                  {isEditing ? (
                    <textarea
                      value={editVisitNotes}
                      onChange={(e) => setEditVisitNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
                      rows={3}
                      placeholder={tj.addVisitNotes}
                    />
                  ) : (
                    <div className="p-4 bg-surface-elevated rounded-apple">
                      <p className="text-sm">{latestVisit.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit mode actions */}
          {isEditing && (
            <div className="flex gap-3 mt-6 pt-6 border-t border-border">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setNewPhotos([]);
                  setNewPhotoPreview([]);
                }}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-surface-elevated hover:bg-surface-secondary text-text-primary font-medium rounded-apple transition-all"
              >
                {tj.cancel}
              </button>
              <button
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
                className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium rounded-apple transition-all flex items-center justify-center gap-2"
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

      {/* Device Registration Flow */}
      {showRegistration && user && job.status === 'completed' && (
        <div className="apple-card">
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

      {/* Register Device button for completed jobs without device */}
      {!showRegistration && job.status === 'completed' && !deviceRegistered && user && (
        <div className="apple-card border-l-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{tj.deviceNotRegistered}</h3>
              <p className="text-sm text-text-secondary">
                {tj.deviceNotRegisteredDesc}
              </p>
            </div>
            <button
              onClick={() => setShowRegistration(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-apple hover:bg-primary/90 transition-all"
            >
              <QrCode className="w-5 h-5" />
              {tj.registerDevice}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sticky CTA — Start Job */}
      {job.status === 'accepted' && (
        <div
          className="md:hidden fixed left-0 right-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-border px-4 py-3"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}
        >
          <div className="flex gap-2">
            <button
              onClick={handleContactCustomer}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-success hover:bg-success/80 text-white font-semibold rounded-apple transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              {tj.contactCustomer}
            </button>
            <button
              onClick={handleStartJob}
              disabled={starting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all"
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

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            aria-label={tj.closePreview}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <img
            src={previewImage}
            alt={tj.previewAlt}
            className="max-w-full max-h-full object-contain rounded-apple"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
