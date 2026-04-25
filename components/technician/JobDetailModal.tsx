'use client';

import { useState } from 'react';
import { Order } from '@/types/order';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { declineJob } from '@/lib/services/technicianService';
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
  const tj = t.technician.jobDetail;
  const { enqueue } = useOfflineQueue();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const lang = userData?.preferredLanguage || 'en';

  const handleAccept = async () => {
    if (!user || !userData) return;

    const technicianInfo = {
      name: userData.displayName || t.technician.profile.defaultTechName,
      phone: userData.phone || '',
      whatsapp: userData.whatsapp || userData.phone || '',
      photo: userData.photoURL || '',
      rating: 0,
    };

    setAccepting(true);
    try {
      await enqueue('accept_job', {
        orderId: job.id,
        technicianId: user.uid,
        technicianInfo,
      });
      // Optimistic — navigate immediately, flush happens in background
      toast.success(tj.jobAccepted);
      onJobAccepted();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tj.queueAcceptError;
      toast.error(message);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!user) return;

    try {
      setDeclining(true);
      await declineJob(job.id, user.uid);
      toast.success(tj.jobDeclined);
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tj.declineError;
      toast.error(message);
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
          className="bg-white rounded-apple max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-apple-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{tj.title}</h2>
              <p className="text-sm text-gray-500">{tj.orderNumber} #{job.orderNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-apple transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 text-gray-900">
            {/* Customer Site Photos */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                {tj.customerSitePhotos}
              </h3>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {/* Water Source Photo */}
                {job.sitePhotos?.waterSource && (
                  <div className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-apple overflow-hidden cursor-pointer">
                      <img
                        src={job.sitePhotos.waterSource.url}
                        alt={tj.waterSource}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        onClick={() => setPreviewImage(job.sitePhotos.waterSource!.url)}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">{tj.waterSource}</p>
                  </div>
                )}

                {/* Product Location Photo */}
                {job.sitePhotos?.productLocation && (
                  <div className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-apple overflow-hidden cursor-pointer">
                      <img
                        src={job.sitePhotos.productLocation.url}
                        alt={tj.equipmentLocation}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        onClick={() => setPreviewImage(job.sitePhotos.productLocation!.url)}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">{tj.equipmentLocation}</p>
                  </div>
                )}

                {/* Full Shot Photo */}
                {job.sitePhotos?.fullShot && (
                  <div className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-apple overflow-hidden cursor-pointer">
                      <img
                        src={job.sitePhotos.fullShot.url}
                        alt={tj.fullShot}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        onClick={() => setPreviewImage(job.sitePhotos.fullShot!.url)}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">{tj.fullShot}</p>
                  </div>
                )}

                {/* Water Running Video */}
                {job.sitePhotos?.waterRunningVideo && (
                  <div className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-apple overflow-hidden cursor-pointer">
                      <video
                        src={job.sitePhotos.waterRunningVideo.url}
                        className="w-full h-full object-contain"
                        controls
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
                      <Video className="w-3 h-3" />
                      {tj.waterRunning}
                    </p>
                  </div>
                )}
              </div>

              {!job.sitePhotos?.waterSource && !job.sitePhotos?.productLocation && !job.sitePhotos?.fullShot && !job.sitePhotos?.waterRunningVideo && (
                <p className="text-gray-500 text-center py-8">{tj.noSitePhotos}</p>
              )}
            </div>

            {/* Product Details */}
            <div className="border border-gray-200 rounded-apple p-5">
              <h3 className="text-lg font-semibold mb-4">{tj.productInformation}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{tj.product}</p>
                  <p className="font-semibold">{job.productSnapshot.name[lang] || job.productSnapshot.name.en}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{tj.variation}</p>
                  <p className="font-semibold">{job.productSnapshot.variation}</p>
                </div>
                {job.serviceSnapshot && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">{tj.service}</p>
                      <p className="font-semibold">{job.serviceSnapshot.name[lang] || job.serviceSnapshot.name.en}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{tj.estimatedDuration}</p>
                      <p className="font-semibold">{job.serviceSnapshot.duration} {tj.hours}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Installation Details */}
            <div className="border border-gray-200 rounded-apple p-5">
              <h3 className="text-lg font-semibold mb-4">{tj.installationDetails}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">{tj.address}</p>
                    <p className="font-medium">
                      {job.installationAddress.street}<br />
                      {job.installationAddress.city}, {job.installationAddress.state} {job.installationAddress.postalCode}
                    </p>
                    {job.installationAddress.landmark && (
                      <p className="text-sm text-gray-500 mt-1">
                        {tj.landmark}: {job.installationAddress.landmark}
                      </p>
                    )}
                    <button
                      onClick={openMapLink}
                      className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {tj.openInMaps}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-gray-500">{tj.installationDate}</p>
                    <p className="font-medium">{formatDate(job.installationDate, 'long')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-gray-500">{tj.timeSlot}</p>
                    <p className="font-medium">{job.timeSlot}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="border border-gray-200 rounded-apple p-5">
              <h3 className="text-lg font-semibold mb-4">{tj.customerInformation}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-gray-500">{tj.name}</p>
                    <p className="font-medium">{job.customerInfo.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-gray-500">{t.common.phone}</p>
                    <p className="font-medium">{job.customerInfo.phone}</p>
                  </div>
                </div>

                {job.customerNotes && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{tj.customerNotes}</p>
                    <p className="text-sm bg-gray-50 p-3 rounded-apple">{job.customerNotes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Earnings */}
            <div className="border-2 border-success/20 rounded-apple p-5 bg-success/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{tj.yourEarnings}</p>
                  <p className="text-3xl font-bold text-success">
                    {formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}
                  </p>
                </div>
                <DollarSign className="w-12 h-12 text-success" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-6 flex gap-3">
            <button
              onClick={handleDecline}
              disabled={declining || accepting}
              className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-900 font-semibold rounded-apple transition-all"
            >
              {declining ? tj.declining : tj.decline}
            </button>
            <button
              onClick={handleAccept}
              disabled={accepting || declining}
              className="flex-1 px-6 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {tj.accepting}
                </>
              ) : (
                tj.accept
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
            alt={tj.previewAlt}
            className="max-w-full max-h-full object-contain rounded-apple"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
