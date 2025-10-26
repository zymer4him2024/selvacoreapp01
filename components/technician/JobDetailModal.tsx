'use client';

import { useState } from 'react';
import { Order } from '@/types/order';
import { useAuth } from '@/contexts/AuthContext';
import { acceptJob, declineJob } from '@/lib/services/technicianService';
import { X, MapPin, Calendar, Clock, DollarSign, User, Phone, Image as ImageIcon, Video, Loader2, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

interface JobDetailModalProps {
  job: Order;
  onClose: () => void;
  onJobAccepted: () => void;
}

export default function JobDetailModal({ job, onClose, onJobAccepted }: JobDetailModalProps) {
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const lang = userData?.preferredLanguage || 'en';

  const handleAccept = async () => {
    if (!user || !userData) return;

    try {
      setAccepting(true);
      
      const technicianInfo = {
        name: userData.displayName || 'Technician',
        phone: userData.phone || '',
        whatsapp: userData.whatsapp || userData.phone || '',
        photo: userData.photoURL || '',
        rating: 4.8, // TODO: Get actual rating from technician profile
      };

      await acceptJob(job.id, user.uid, technicianInfo);
      toast.success('Job accepted successfully!');
      onJobAccepted();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept job');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!user) return;

    try {
      setDeclining(true);
      await declineJob(job.id, user.uid);
      toast.success('Job declined');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to decline job');
    } finally {
      setDeclining(false);
    }
  };

  const openMapLink = () => {
    const address = `${job.installationAddress.street}, ${job.installationAddress.city}, ${job.installationAddress.state} ${job.installationAddress.postalCode}`;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-surface rounded-apple max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-apple-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-surface/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold">Job Details</h2>
              <p className="text-sm text-text-secondary">Order #{job.orderNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Customer Site Photos */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Customer Site Photos
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Water Source Photo */}
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

                {/* Product Location Photo */}
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

                {/* Full Shot Photo */}
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

                {/* Water Running Video */}
                {job.sitePhotos?.waterRunningVideo && (
                  <div className="group relative">
                    <div className="aspect-square bg-surface-elevated rounded-apple overflow-hidden cursor-pointer">
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

              {!job.sitePhotos?.waterSource && !job.sitePhotos?.productLocation && !job.sitePhotos?.fullShot && !job.sitePhotos?.waterRunningVideo && (
                <p className="text-text-secondary text-center py-8">No site photos uploaded yet</p>
              )}
            </div>

            {/* Product Details */}
            <div className="apple-card">
              <h3 className="text-lg font-semibold mb-4">Product Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="text-sm text-text-secondary">Estimated Duration</p>
                      <p className="font-semibold">{job.serviceSnapshot.duration} hours</p>
                    </div>
                  </>
                )}
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
                    <p className="text-sm text-text-secondary">Installation Date</p>
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

            {/* Customer Information */}
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

            {/* Earnings */}
            <div className="apple-card bg-success/10 border-2 border-success/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">Your Earnings</p>
                  <p className="text-3xl font-bold text-success">
                    {formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-success" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-surface/95 backdrop-blur-sm border-t border-border p-6 flex gap-3">
            <button
              onClick={handleDecline}
              disabled={declining || accepting}
              className="flex-1 px-6 py-4 bg-surface-elevated hover:bg-surface-secondary disabled:opacity-50 text-text-primary font-semibold rounded-apple transition-all"
            >
              {declining ? 'Declining...' : 'Decline'}
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="flex-1 px-6 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept This Job'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fade-in"
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
    </>
  );
}

