'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Clock, Phone, MessageCircle, Star, Package as PackageIcon, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Order } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getOrderStatusLabel } from '@/lib/utils/formatters';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsappHelper';
import { cancelOrder } from '@/lib/services/orderService';
import { refundAmazonPayment } from '@/lib/services/amazonPaymentService';
import { addCustomerHistoryRecord } from '@/lib/services/customerHistoryService';
import CancelOrderModal from '@/components/customer/CancelOrderModal';
import { getReviewForOrder } from '@/lib/services/reviewService';
import { Review } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency, formatDate, formatDateTime } = useLocaleFormatters();
  const o = t.orders;
  const orderId = params.id as string;
  const isNewOrder = searchParams.get('success') === 'true';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [canEditReview, setCanEditReview] = useState(false);

  useEffect(() => {
    loadOrder();
    
    if (isNewOrder) {
      toast.success(o.orderPlacedToast, { duration: 5000 });
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const orderDoc = await getDoc(doc(db, 'orders', orderId));

      if (!orderDoc.exists()) {
        toast.error(o.orderNotFound);
        router.push('/customer/orders');
        return;
      }

      const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
      setOrder(orderData);

      // Check for existing review
      if (orderData.status === 'completed') {
        try {
          const review = await getReviewForOrder(orderId);
          setExistingReview(review);
          if (review) {
            const windowEnd = review.editableUntil?.toDate?.() ??
              new Date(review.createdAt.toDate().getTime() + 14 * 24 * 60 * 60 * 1000);
            setCanEditReview(new Date() < windowEnd);
          }
        } catch {
          // Non-fatal: review lookup failure shouldn't block order display
        }
      }
    } catch (error: unknown) {
      toast.error(o.loadOrderError);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (reason: string) => {
    if (!order || !userData) return;

    // Step 1: cancel the order itself — if this fails, show error and stop.
    try {
      await cancelOrder(orderId, reason, 'customer', userData.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : o.cancelOrderError;
      toast.error(message);
      return;
    }

    // Cancel succeeded — finalize UI immediately. Downstream failures are non-fatal.
    toast.success(o.cancelSuccess);
    setShowCancelModal(false);

    // Step 2: best-effort refund (mock in sandbox).
    if (order.payment?.transactionId && order.payment?.amount != null) {
      try {
        await refundAmazonPayment(order.payment.transactionId, order.payment.amount);
      } catch {
        // Refund failure is logged on the order already; no user-facing error.
      }
    }

    // Step 3: best-effort activity-log entry.
    try {
      await addCustomerHistoryRecord({
        customerId: userData.id,
        type: 'order_cancelled',
        title: 'Order Cancelled',
        description: `Order ${order.orderNumber} cancelled. Reason: ${reason}`,
        amount: order.payment?.amount ?? 0,
        currency: order.payment?.currency ?? 'USD',
        orderId,
      });
    } catch {
      // History write is audit-only; do not block the user flow.
    }

    await loadOrder();
  };

  const handleWhatsAppContact = () => {
    if (!order?.technicianInfo) {
      toast.error(o.technicianNotAvailable);
      return;
    }

    const whatsappLink = generateWhatsAppLink(
      {
        name: order.technicianInfo.name,
        phone: order.technicianInfo.whatsapp,
      },
      {
        orderNumber: order.orderNumber,
        productName: order.productSnapshot.name[userData?.preferredLanguage || 'en'],
        installationDate: formatDate(order.installationDate, 'long'),
        address: `${order.installationAddress.street}, ${order.installationAddress.city}`,
      },
      userData?.preferredLanguage || 'en'
    );

    openWhatsApp(whatsappLink);
  };

  if (loading) {
    return (
      <div className="sc">
        <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
      </div>
    );
  }

  if (!order) return null;

  const lang = userData?.preferredLanguage || 'en';

  const statusBadge = (status: string): { color: string; bg: string } => {
    switch (status) {
      case 'pending': return { color: 'var(--warn)', bg: 'var(--warn-tint)' };
      case 'cancelled': return { color: 'var(--warn)', bg: 'var(--warn-tint)' };
      default: return { color: 'var(--brand)', bg: 'var(--brand-tint)' };
    }
  };

  return (
    <div className="sc">
      <header className="sc-nav">
        <div className="sc-nav-inner">
          <button
            type="button"
            onClick={() => router.push('/customer/orders')}
            className="sc-nav-link"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sc-nav-text">{o.backToOrders}</span>
          </button>
        </div>
      </header>

      <main className="sc-main" style={{ maxWidth: 880 }}>
        <div className="sc-stack-lg">
          {isNewOrder && (
            <div className="sc-card" style={{ background: 'var(--brand-tint)', borderLeftColor: 'var(--brand)' }}>
              <div className="sc-row" style={{ alignItems: 'flex-start', gap: 16 }}>
                <CheckCircle className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--brand)' }} />
                <div>
                  <h3 style={{ fontWeight: 600, margin: '0 0 4px', color: 'var(--brand)' }}>{o.orderPlacedSuccess}</h3>
                  <p className="sc-helper" style={{ margin: 0 }}>{o.orderPlacedDesc}</p>
                </div>
              </div>
            </div>
          )}

          <div className="sc-row-between" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="sc-eyebrow">{o.orderNumber}</div>
              <h1 className="sc-h1">{order.orderNumber}</h1>
              <p className="sc-lede" style={{ marginTop: 4 }}>
                {o.placedOn} {formatDate(order.createdAt, 'long')}
              </p>
            </div>
            <span
              className="sc-badge-inline"
              style={{ ...statusBadge(order.status), padding: '6px 12px', fontSize: 13 }}
            >
              {getOrderStatusLabel(order.status, 'customer', t)}
            </span>
          </div>

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{o.orderDetails}</h2>

            <div className="sc-stack">
              <div className="sc-row" style={{ gap: 16, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    background: 'var(--off-paper)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {order.productSnapshot.image ? (
                    <img
                      src={order.productSnapshot.image}
                      alt={order.productSnapshot.name[lang]}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <PackageIcon className="w-8 h-8" style={{ color: 'var(--soft)' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>{order.productSnapshot.name[lang]}</p>
                  {order.productSnapshot.variation && (
                    <p className="sc-helper" style={{ margin: '4px 0 0' }}>{order.productSnapshot.variation}</p>
                  )}
                  <p className="sc-price" style={{ fontSize: 18, marginTop: 8 }}>
                    {formatCurrency(order.payment.productPrice, order.payment.currency)}
                  </p>
                </div>
              </div>

              {order.serviceSnapshot && (
                <div style={{ paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>{order.serviceSnapshot.name[lang]}</p>
                  <p className="sc-helper" style={{ margin: '4px 0 0' }}>{order.serviceSnapshot.duration}h {o.installationService}</p>
                  <p className="sc-price" style={{ fontSize: 16, marginTop: 4 }}>
                    {formatCurrency(order.payment.servicePrice, order.payment.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{o.installationSchedule}</h2>

            <div className="sc-stack">
              <div className="sc-row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <Calendar className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{formatDate(order.installationDate, 'full')}</p>
                  <p className="sc-helper" style={{ margin: '4px 0 0' }}>Time: {order.timeSlot}</p>
                </div>
              </div>

              <div className="sc-row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <MapPin className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{order.installationAddress.street}</p>
                  <p className="sc-helper" style={{ margin: '4px 0 0' }}>
                    {order.installationAddress.city}, {order.installationAddress.state} {order.installationAddress.postalCode}
                  </p>
                  {order.installationAddress.landmark && (
                    <p className="sc-helper" style={{ margin: '4px 0 0' }}>📍 {order.installationAddress.landmark}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {order.technicianInfo ? (
            <div className="sc-card-static" style={{ background: 'var(--brand-tint)' }}>
              <h2 className="sc-h2" style={{ marginBottom: 16 }}>{o.yourTechnician}</h2>

              <div className="sc-row" style={{ gap: 16, alignItems: 'flex-start', marginBottom: 24 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    color: 'var(--paper)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {order.technicianInfo.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 16, margin: 0 }}>{order.technicianInfo.name}</p>
                  <div className="sc-row" style={{ gap: 6, marginTop: 4 }}>
                    <Star className="w-4 h-4" style={{ color: 'var(--warn)', fill: 'var(--warn)' }} />
                    <span style={{ fontWeight: 600 }}>{order.technicianInfo.rating.toFixed(1)}</span>
                    <span className="sc-helper" style={{ margin: 0 }}>{o.rating}</span>
                  </div>
                  <div className="sc-row" style={{ gap: 8, marginTop: 8, fontSize: 13, color: 'var(--soft)' }}>
                    <Phone className="w-4 h-4" />
                    <span>{order.technicianInfo.phone}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleWhatsAppContact}
                className="sc-cta"
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 24px' }}
              >
                <MessageCircle className="w-5 h-5" />
                {o.contactWhatsApp}
              </button>
            </div>
          ) : (
            <div className="sc-card-static" style={{ background: 'var(--warn-tint)' }}>
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--warn)' }} />
                <h3 style={{ fontWeight: 600, margin: '0 0 4px' }}>{o.waitingForTechnician}</h3>
                <p className="sc-helper" style={{ margin: 0 }}>{o.waitingDesc}</p>
              </div>
            </div>
          )}

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{o.paymentSummary}</h2>

            <div className="sc-stack" style={{ gap: 12 }}>
              <div className="sc-row-between">
                <span style={{ color: 'var(--soft)' }}>{o.product}</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(order.payment.productPrice, order.payment.currency)}</span>
              </div>
              {order.serviceSnapshot && (
                <div className="sc-row-between">
                  <span style={{ color: 'var(--soft)' }}>{o.service}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(order.payment.servicePrice, order.payment.currency)}</span>
                </div>
              )}
              <div className="sc-row-between">
                <span style={{ color: 'var(--soft)' }}>{o.tax}</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(order.payment.tax, order.payment.currency)}</span>
              </div>
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                <div className="sc-row-between">
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{o.totalPaid}</span>
                  <span className="sc-price" style={{ fontSize: 24 }}>
                    {formatCurrency(order.payment.amount, order.payment.currency)}
                  </span>
                </div>
              </div>
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                <div className="sc-row-between" style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--soft)' }}>{o.paymentStatus}</span>
                  <span style={{ color: 'var(--brand)', fontWeight: 600 }}>✓ {o.paid}</span>
                </div>
                <div className="sc-row-between" style={{ fontSize: 13, marginTop: 8 }}>
                  <span style={{ color: 'var(--soft)' }}>{o.transactionId}</span>
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 12 }}>{order.payment.transactionId}</span>
                </div>
                {order.payment.paidAt && (
                  <div className="sc-row-between" style={{ fontSize: 13, marginTop: 8 }}>
                    <span style={{ color: 'var(--soft)' }}>{o.paymentDate}</span>
                    <span>{formatDateTime(order.payment.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {order.sitePhotos && (
            <div className="sc-card-static">
              <h2 className="sc-h2" style={{ marginBottom: 16 }}>{o.sitePhotosTitle}</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {order.sitePhotos.waterSource && (
                  <div>
                    <p className="sc-helper" style={{ marginBottom: 8 }}>{o.waterSourceLabel}</p>
                    <div style={{ width: '100%', height: 160, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <img src={order.sitePhotos.waterSource.url} alt={t.components.sitePhotosAlt.waterSource} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
                {order.sitePhotos.productLocation && (
                  <div>
                    <p className="sc-helper" style={{ marginBottom: 8 }}>{o.installationLocation}</p>
                    <div style={{ width: '100%', height: 160, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <img src={order.sitePhotos.productLocation.url} alt={t.components.sitePhotosAlt.installationLocation} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
                {order.sitePhotos.fullShot && (
                  <div>
                    <p className="sc-helper" style={{ marginBottom: 8 }}>{o.fullShot}</p>
                    <div style={{ width: '100%', height: 160, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <img src={order.sitePhotos.fullShot.url} alt={t.components.sitePhotosAlt.fullShot} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
                {order.sitePhotos.waterRunningVideo && (
                  <div>
                    <p className="sc-helper" style={{ marginBottom: 8 }}>{o.waterRunning}</p>
                    <video src={order.sitePhotos.waterRunningVideo.url} controls style={{ width: '100%', height: 160, borderRadius: 'var(--radius-sm)', background: '#000' }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {order.installationPhotos && order.installationPhotos.length > 0 && (
            <div className="sc-card-static">
              <h2 className="sc-h2" style={{ marginBottom: 16 }}>{o.installationPhotos}</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {order.installationPhotos.map((photo, index) => (
                  <div key={index}>
                    <div style={{ width: '100%', height: 160, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <img src={photo.url} alt={photo.description || `${o.installationPhotoAlt} ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    {photo.description && (
                      <p className="sc-helper" style={{ marginTop: 8 }}>{photo.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{o.orderTimeline}</h2>

            <div className="sc-stack">
              {order.statusHistory?.map((history, index) => (
                <div key={index} className="sc-row" style={{ gap: 16, alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: index === order.statusHistory.length - 1 ? 'var(--brand)' : 'var(--brand)',
                        opacity: index === order.statusHistory.length - 1 ? 1 : 0.6,
                      }}
                    />
                    {index < order.statusHistory.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'var(--hairline)', marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 24 }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{getOrderStatusLabel(history.status, 'customer', t)}</p>
                    {history.note && (
                      <p className="sc-helper" style={{ margin: '4px 0 0' }}>{history.note}</p>
                    )}
                    <p className="sc-helper" style={{ margin: '8px 0 0', fontSize: 11 }}>{formatDateTime(history.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {order.rating && (
            <div className="sc-card-static" style={{ background: 'var(--warn-tint)' }}>
              <div className="sc-row-between" style={{ alignItems: 'flex-start' }}>
                <h2 className="sc-h2" style={{ marginBottom: 12 }}>{o.yourReview}</h2>
                {canEditReview && (
                  <button
                    type="button"
                    onClick={() => router.push(`/customer/orders/${orderId}/review`)}
                    style={{ fontSize: 13, color: 'var(--brand)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {t.orders.reviewFlow.edit}
                  </button>
                )}
              </div>
              <div className="sc-row" style={{ gap: 2, marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-5 h-5"
                    style={{
                      color: star <= order.rating!.score ? 'var(--warn)' : 'var(--soft)',
                      fill: star <= order.rating!.score ? 'var(--warn)' : 'transparent',
                    }}
                  />
                ))}
                <span style={{ marginLeft: 8, fontWeight: 600 }}>{order.rating.score}/5</span>
              </div>
              {order.rating.review && (
                <p className="sc-helper" style={{ margin: 0 }}>{order.rating.review}</p>
              )}
            </div>
          )}

          {order.cancellation && (
            <div className="sc-card-static" style={{ background: 'var(--warn-tint)' }}>
              <h2 className="sc-h2" style={{ marginBottom: 12, color: 'var(--warn)' }}>{o.orderCancelled}</h2>
              <p className="sc-helper" style={{ margin: '0 0 4px' }}>{o.reason}: {order.cancellation.reason}</p>
              {order.cancellation.refundIssued && (
                <p style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, margin: 0 }}>{o.refundIssued}</p>
              )}
            </div>
          )}

          {order.status === 'completed' && !order.rating && (
            <button
              type="button"
              onClick={() => router.push(`/customer/orders/${orderId}/review`)}
              className="sc-cta"
              style={{
                width: '100%',
                padding: '14px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'var(--warn)',
              }}
            >
              <Star className="w-5 h-5" />
              {o.rateExperience}
            </button>
          )}

          {order.status === 'pending' && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="sc-cta-ghost"
              style={{ width: '100%', color: 'var(--warn)', borderColor: 'var(--warn)' }}
            >
              {o.cancelOrder}
            </button>
          )}
        </div>
      </main>

      {showCancelModal && (
        <CancelOrderModal
          orderNumber={order.orderNumber}
          onConfirm={handleCancelOrder}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
}

