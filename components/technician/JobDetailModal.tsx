'use client';

import { useState, useEffect } from 'react';
import { Order } from '@/types/order';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { declineJob } from '@/lib/services/technicianService';
import { X, MapPin, Calendar, Clock, DollarSign, User, Phone, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewImage]);

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

  const PhotoTile = ({ url, label, isVideo }: { url: string; label: string; isVideo?: boolean }) => (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          aspectRatio: '1 / 1',
          background: 'var(--off-paper)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          cursor: isVideo ? 'default' : 'pointer',
        }}
      >
        {isVideo ? (
          <video src={url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />
        ) : (
          <img
            src={url}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onClick={() => setPreviewImage(url)}
          />
        )}
      </div>
      <p
        className="sc-helper"
        style={{ fontSize: 12, marginTop: 8, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
      >
        {isVideo && <Video className="w-3 h-3" />}
        {label}
      </p>
    </div>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          className="sc"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--paper)',
            borderRadius: 'var(--radius-md)',
            maxWidth: 1024,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
              borderBottom: '1px solid var(--hairline)',
              padding: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10,
            }}
          >
            <div>
              <h2 className="sc-h2" style={{ margin: 0 }}>{tj.title}</h2>
              <p className="sc-helper" style={{ margin: '4px 0 0' }}>{tj.orderNumber} #{job.orderNumber}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              style={{
                padding: 8,
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--ink)',
                transition: 'background 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div style={{ padding: 24 }}>
            <div className="sc-stack-lg" style={{ gap: 24 }}>
              <div>
                <h3 className="sc-row" style={{ alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 17, marginBottom: 16 }}>
                  <ImageIcon className="w-5 h-5" />
                  {tj.customerSitePhotos}
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
                  {job.sitePhotos?.waterSource && (
                    <PhotoTile url={job.sitePhotos.waterSource.url} label={tj.waterSource} />
                  )}
                  {job.sitePhotos?.productLocation && (
                    <PhotoTile url={job.sitePhotos.productLocation.url} label={tj.equipmentLocation} />
                  )}
                  {job.sitePhotos?.fullShot && (
                    <PhotoTile url={job.sitePhotos.fullShot.url} label={tj.fullShot} />
                  )}
                  {job.sitePhotos?.waterRunningVideo && (
                    <PhotoTile url={job.sitePhotos.waterRunningVideo.url} label={tj.waterRunning} isVideo />
                  )}
                </div>

                {!job.sitePhotos?.waterSource && !job.sitePhotos?.productLocation && !job.sitePhotos?.fullShot && !job.sitePhotos?.waterRunningVideo && (
                  <p className="sc-helper" style={{ textAlign: 'center', padding: '32px 0' }}>{tj.noSitePhotos}</p>
                )}
              </div>

              <div className="sc-card-static">
                <h3 style={{ fontWeight: 600, fontSize: 17, marginTop: 0, marginBottom: 16 }}>{tj.productInformation}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div>
                    <p className="sc-helper" style={{ margin: 0 }}>{tj.product}</p>
                    <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{job.productSnapshot.name[lang] || job.productSnapshot.name.en}</p>
                  </div>
                  <div>
                    <p className="sc-helper" style={{ margin: 0 }}>{tj.variation}</p>
                    <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{job.productSnapshot.variation}</p>
                  </div>
                  {job.serviceSnapshot && (
                    <>
                      <div>
                        <p className="sc-helper" style={{ margin: 0 }}>{tj.service}</p>
                        <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{job.serviceSnapshot.name[lang] || job.serviceSnapshot.name.en}</p>
                      </div>
                      <div>
                        <p className="sc-helper" style={{ margin: 0 }}>{tj.estimatedDuration}</p>
                        <p style={{ fontWeight: 600, margin: '4px 0 0' }}>{job.serviceSnapshot.duration} {tj.hours}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="sc-card-static">
                <h3 style={{ fontWeight: 600, fontSize: 17, marginTop: 0, marginBottom: 16 }}>{tj.installationDetails}</h3>
                <div className="sc-stack" style={{ gap: 12 }}>
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
                    style={{
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px 16px',
                    }}
                  >
                    <MapPin className="w-5 h-5" />
                    {tj.openInMaps}
                  </button>

                  <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                    <Calendar className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                    <div>
                      <p className="sc-helper" style={{ margin: 0 }}>{tj.installationDate}</p>
                      <p style={{ fontWeight: 500, margin: '2px 0 0' }}>{formatDate(job.installationDate, 'long')}</p>
                    </div>
                  </div>

                  <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                    <Clock className="w-5 h-5" style={{ color: 'var(--brand)' }} />
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
                    <User className="w-5 h-5" style={{ color: 'var(--brand)' }} />
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
                    <Phone className="w-5 h-5" style={{ color: 'var(--brand)' }} />
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

              <div
                className="sc-card-static"
                style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}
              >
                <div className="sc-row-between" style={{ alignItems: 'center' }}>
                  <div>
                    <p className="sc-helper" style={{ margin: 0 }}>{tj.yourEarnings}</p>
                    <p className="sc-price" style={{ color: 'var(--brand)', margin: 0 }}>
                      {formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}
                    </p>
                  </div>
                  <DollarSign className="w-12 h-12" style={{ color: 'var(--brand)' }} />
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'sticky',
              bottom: 0,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid var(--hairline)',
              padding: 24,
              display: 'flex',
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={handleDecline}
              disabled={declining || accepting}
              className="sc-cta-ghost"
              style={{ flex: 1, padding: '16px 24px', opacity: (declining || accepting) ? 0.5 : 1 }}
            >
              {declining ? tj.declining : tj.decline}
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting || declining}
              className="sc-cta"
              style={{
                flex: 1,
                padding: '16px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: (accepting || declining) ? 0.5 : 1,
              }}
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

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 60,
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
              transition: 'background 150ms cubic-bezier(0.4, 0, 0.2, 1)',
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
    </>
  );
}
