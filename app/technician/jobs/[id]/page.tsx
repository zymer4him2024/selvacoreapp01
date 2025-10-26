'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getTechnicianJobById, 
  startJob, 
  completeJob,
  uploadInstallationPhoto 
} from '@/lib/services/technicianService';
import { Order } from '@/types/order';
import { 
  ArrowLeft, MapPin, Calendar, Clock, DollarSign, User, Phone, 
  MessageCircle, Image as ImageIcon, Video, Upload, X, Check, 
  Loader2, Play, CheckCircle, ExternalLink 
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsappHelper';
import toast from 'react-hot-toast';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const [job, setJob] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [installationPhotos, setInstallationPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [completionNotes, setCompletionNotes] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lang = userData?.preferredLanguage || 'en';

  useEffect(() => {
    if (user) {
      loadJob();
    }
  }, [user, jobId]);

  const loadJob = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const jobData = await getTechnicianJobById(jobId, user.uid);
      
      if (!jobData) {
        toast.error('Job not found or access denied');
        router.push('/technician/jobs');
        return;
      }

      setJob(jobData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load job');
      router.push('/technician/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    if (!user || !job) return;

    try {
      setStarting(true);
      await startJob(job.id, user.uid);
      toast.success('Job started!');
      loadJob();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start job');
    } finally {
      setStarting(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Add to installation photos
    setInstallationPhotos(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setInstallationPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompleteJob = async () => {
    if (!user || !job) return;

    if (installationPhotos.length === 0) {
      toast.error('Please upload at least one installation photo');
      return;
    }

    try {
      setCompleting(true);
      setUploadingPhotos(true);

      // Upload all photos
      const photoUrls: string[] = [];
      for (const photo of installationPhotos) {
        const url = await uploadInstallationPhoto(job.id, photo);
        photoUrls.push(url);
      }

      setUploadingPhotos(false);

      // Complete the job
      await completeJob(job.id, user.uid, photoUrls, completionNotes);
      
      toast.success('Job completed successfully!');
      router.push('/technician/jobs?tab=completed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete job');
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
          <p className="text-text-secondary">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Job Details</h1>
            <p className="text-text-secondary mt-1">Order #{job.orderNumber}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`px-4 py-2 rounded-apple font-semibold ${
          job.status === 'accepted' ? 'bg-primary/10 text-primary' :
          job.status === 'in_progress' ? 'bg-warning/10 text-warning' :
          'bg-success/10 text-success'
        }`}>
          {job.status === 'accepted' && 'Upcoming'}
          {job.status === 'in_progress' && 'In Progress'}
          {job.status === 'completed' && 'Completed'}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleContactCustomer}
          className="flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/80 text-white font-semibold rounded-apple transition-all hover:scale-[1.02]"
        >
          <MessageCircle className="w-5 h-5" />
          Contact Customer
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
                Starting...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start Job
              </>
            )}
          </button>
        )}
      </div>

      {/* Customer Site Photos */}
      <div className="apple-card">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ImageIcon className="w-6 h-6" />
          Customer Site Photos
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {job.sitePhotos?.waterSource && (
            <div className="group relative">
              <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                <img
                  src={job.sitePhotos.waterSource.url}
                  alt="Water Source"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  onClick={() => setPreviewImage(job.sitePhotos.waterSource!.url)}
                />
              </div>
              <p className="text-xs text-text-secondary mt-2 text-center">Water Source</p>
            </div>
          )}

          {job.sitePhotos?.productLocation && (
            <div className="group relative">
              <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                <img
                  src={job.sitePhotos.productLocation.url}
                  alt="Equipment Location"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  onClick={() => setPreviewImage(job.sitePhotos.productLocation!.url)}
                />
              </div>
              <p className="text-xs text-text-secondary mt-2 text-center">Equipment Location</p>
            </div>
          )}

          {job.sitePhotos?.fullShot && (
            <div className="group relative">
              <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                <img
                  src={job.sitePhotos.fullShot.url}
                  alt="Full Shot"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                  onClick={() => setPreviewImage(job.sitePhotos.fullShot!.url)}
                />
              </div>
              <p className="text-xs text-text-secondary mt-2 text-center">Full Shot</p>
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
                Water Running
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Product & Installation Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Info */}
        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">Product Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-text-secondary">Product</p>
              <p className="font-semibold">{job.productSnapshot.name[lang] || job.productSnapshot.name.en}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Variation</p>
              <p className="font-semibold">{job.productSnapshot.variation}</p>
            </div>
            {job.serviceSnapshot && (
              <>
                <div>
                  <p className="text-sm text-text-secondary">Service</p>
                  <p className="font-semibold">{job.serviceSnapshot.name[lang] || job.serviceSnapshot.name.en}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Duration</p>
                  <p className="font-semibold">{job.serviceSnapshot.duration} hours</p>
                </div>
              </>
            )}
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-text-secondary">Your Earnings</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Installation Details */}
        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">Installation Details</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-text-secondary">Address</p>
                <p className="font-medium">
                  {job.installationAddress.street}<br />
                  {job.installationAddress.city}, {job.installationAddress.state} {job.installationAddress.postalCode}
                </p>
                {job.installationAddress.landmark && (
                  <p className="text-sm text-text-secondary mt-1">
                    Landmark: {job.installationAddress.landmark}
                  </p>
                )}
                <button
                  onClick={openMapLink}
                  className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open in Maps
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">Date</p>
                <p className="font-medium">{formatDate(job.installationDate, 'long')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">Time Slot</p>
                <p className="font-medium">{job.timeSlot}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">Name</p>
                <p className="font-medium">{job.customerInfo.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">Phone</p>
                <p className="font-medium">{job.customerInfo.phone}</p>
              </div>
            </div>

            {job.customerNotes && (
              <div>
                <p className="text-sm text-text-secondary mb-1">Customer Notes</p>
                <p className="text-sm bg-surface-elevated p-3 rounded-apple">{job.customerNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job Completion Section */}
      {job.status === 'in_progress' && (
        <div className="apple-card">
          <h2 className="text-2xl font-bold mb-6">Complete Installation</h2>
          
          {/* Upload Installation Photos */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Installation Photos *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 bg-surface-elevated hover:bg-surface-secondary border-2 border-dashed border-border rounded-apple transition-all"
              >
                <Upload className="w-5 h-5" />
                Upload Photos
              </button>
            </div>

            {/* Photo Previews */}
            {photoPreview.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {photoPreview.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden">
                      <img
                        src={preview}
                        alt={`Installation ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-error hover:bg-error/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Completion Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Completion Notes (Optional)
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about the installation..."
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
                rows={4}
              />
            </div>

            {/* Complete Button */}
            <button
              onClick={handleCompleteJob}
              disabled={completing || uploadingPhotos || installationPhotos.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-success hover:bg-success/80 disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-[1.02]"
            >
              {completing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploadingPhotos ? 'Uploading photos...' : 'Completing job...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Complete Job
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Completed Job Info */}
      {job.status === 'completed' && job.installationPhotos && job.installationPhotos.length > 0 && (
        <div className="apple-card">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-success" />
            Installation Complete
          </h2>
          
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {job.installationPhotos.map((photo, index) => (
              <div key={index} className="group relative">
                <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
                  <img
                    src={photo.url}
                    alt={`Installation ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onClick={() => setPreviewImage(photo.url)}
                  />
                </div>
              </div>
            ))}
          </div>

          {job.technicianNotes && (
            <div className="mt-4 p-4 bg-surface-elevated rounded-apple">
              <p className="text-sm text-text-secondary mb-1">Completion Notes</p>
              <p className="text-sm">{job.technicianNotes}</p>
            </div>
          )}
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
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-apple"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

