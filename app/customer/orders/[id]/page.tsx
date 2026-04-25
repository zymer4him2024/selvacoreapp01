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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{o.loadingOrderDetails}</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const lang = userData?.preferredLanguage || 'en';

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning/20 text-warning border-warning',
      accepted: 'bg-primary/20 text-primary border-primary',
      in_progress: 'bg-secondary/20 text-secondary border-secondary',
      completed: 'bg-success/20 text-success border-success',
      cancelled: 'bg-error/20 text-error border-error',
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10 backdrop-blur-lg bg-surface/80">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4">
          <button
            onClick={() => router.push('/customer/orders')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {o.backToOrders}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-6 animate-fade-in">
          {/* Success Message (for new orders) */}
          {isNewOrder && (
            <div className="apple-card bg-success/10 border-success/30 animate-scale-in">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-8 h-8 text-success flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-success mb-1">{o.orderPlacedSuccess}</h3>
                  <p className="text-sm text-text-secondary">
                    {o.orderPlacedDesc}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{o.orderNumber} {order.orderNumber}</h1>
                <p className="text-text-secondary">
                  {o.placedOn} {formatDate(order.createdAt, 'long')}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-apple text-sm font-medium border-2 ${getStatusColor(order.status)}`}>
                {getOrderStatusLabel(order.status, 'customer', t)}
              </span>
            </div>
          </div>

          {/* Product & Service Info */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-4">{o.orderDetails}</h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-surface-elevated rounded-apple overflow-hidden flex-shrink-0">
                  {order.productSnapshot.image ? (
                    <img
                      src={order.productSnapshot.image}
                      alt={order.productSnapshot.name[lang]}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PackageIcon className="w-8 h-8 text-text-tertiary" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{order.productSnapshot.name[lang]}</p>
                  {order.productSnapshot.variation && (
                    <p className="text-sm text-text-secondary">{order.productSnapshot.variation}</p>
                  )}
                  <p className="text-primary font-semibold mt-2">
                    {formatCurrency(order.payment.productPrice, order.payment.currency)}
                  </p>
                </div>
              </div>

              {order.serviceSnapshot && (
                <div className="pt-4 border-t border-border">
                  <p className="font-medium">{order.serviceSnapshot.name[lang]}</p>
                  <p className="text-sm text-text-secondary">{order.serviceSnapshot.duration}h {o.installationService}</p>
                  <p className="text-primary font-semibold mt-1">
                    {formatCurrency(order.payment.servicePrice, order.payment.currency)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Installation Details */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-4">{o.installationSchedule}</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">{formatDate(order.installationDate, 'full')}</p>
                  <p className="text-sm text-text-secondary mt-1">Time: {order.timeSlot}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">{order.installationAddress.street}</p>
                  <p className="text-sm text-text-secondary">
                    {order.installationAddress.city}, {order.installationAddress.state} {order.installationAddress.postalCode}
                  </p>
                  {order.installationAddress.landmark && (
                    <p className="text-xs text-text-tertiary mt-1">
                      📍 {order.installationAddress.landmark}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Technician Info (if accepted) */}
          {order.technicianInfo ? (
            <div className="apple-card bg-primary/5 border-primary/30">
              <h2 className="text-xl font-semibold mb-4">{o.yourTechnician}</h2>
              
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {order.technicianInfo.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{order.technicianInfo.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="font-medium">{order.technicianInfo.rating.toFixed(1)}</span>
                    <span className="text-sm text-text-secondary">{o.rating}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
                    <Phone className="w-4 h-4" />
                    <span>{order.technicianInfo.phone}</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Button */}
            <button
              onClick={handleWhatsAppContact}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
            >
              <MessageCircle className="w-5 h-5" />
              {o.contactWhatsApp}
            </button>
            </div>
          ) : (
            <div className="apple-card bg-warning/5 border-warning/30">
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-3 text-warning" />
                <h3 className="font-semibold mb-1">{o.waitingForTechnician}</h3>
                <p className="text-sm text-text-secondary">
                  {o.waitingDesc}
                </p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-4">{o.paymentSummary}</h2>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">{o.product}</span>
                <span className="font-medium">
                  {formatCurrency(order.payment.productPrice, order.payment.currency)}
                </span>
              </div>
              {order.serviceSnapshot && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">{o.service}</span>
                  <span className="font-medium">
                    {formatCurrency(order.payment.servicePrice, order.payment.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-secondary">{o.tax}</span>
                <span className="font-medium">
                  {formatCurrency(order.payment.tax, order.payment.currency)}
                </span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">{o.totalPaid}</span>
                  <span className="text-2xl font-bold text-success">
                    {formatCurrency(order.payment.amount, order.payment.currency)}
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">{o.paymentStatus}</span>
                  <span className="text-success font-medium">✓ {o.paid}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-text-tertiary">{o.transactionId}</span>
                  <span className="font-mono text-xs">{order.payment.transactionId}</span>
                </div>
                {order.payment.paidAt && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-text-tertiary">{o.paymentDate}</span>
                    <span>{formatDateTime(order.payment.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Site Photos */}
          {order.sitePhotos && (
            <div className="apple-card">
              <h2 className="text-xl font-semibold mb-4">{o.sitePhotosTitle}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {order.sitePhotos.waterSource && (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">{o.waterSourceLabel}</p>
                    <div className="w-full h-40 bg-surface-elevated rounded-apple overflow-hidden">
                      <img
                        src={order.sitePhotos.waterSource.url}
                        alt="Water source"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
                {order.sitePhotos.productLocation && (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">{o.installationLocation}</p>
                    <div className="w-full h-40 bg-surface-elevated rounded-apple overflow-hidden">
                      <img
                        src={order.sitePhotos.productLocation.url}
                        alt="Installation location"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
                {order.sitePhotos.fullShot && (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">{o.fullShot}</p>
                    <div className="w-full h-40 bg-surface-elevated rounded-apple overflow-hidden">
                      <img
                        src={order.sitePhotos.fullShot.url}
                        alt="Full shot"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
                {order.sitePhotos.waterRunningVideo && (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">{o.waterRunning}</p>
                    <video
                      src={order.sitePhotos.waterRunningVideo.url}
                      controls
                      className="w-full h-40 rounded-apple bg-black"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Installation Photos (after completion) */}
          {order.installationPhotos && order.installationPhotos.length > 0 && (
            <div className="apple-card">
              <h2 className="text-xl font-semibold mb-4">{o.installationPhotos}</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {order.installationPhotos.map((photo, index) => (
                  <div key={index}>
                    <div className="w-full h-40 bg-surface-elevated rounded-apple overflow-hidden">
                      <img
                        src={photo.url}
                        alt={photo.description || `${o.installationPhotoAlt} ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {photo.description && (
                      <p className="text-xs text-text-secondary mt-2">{photo.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order Timeline */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-4">{o.orderTimeline}</h2>
            
            <div className="space-y-4">
              {order.statusHistory?.map((history, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      index === order.statusHistory.length - 1 ? 'bg-primary' : 'bg-success'
                    }`}></div>
                    {index < order.statusHistory.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="font-medium">{getOrderStatusLabel(history.status, 'customer', t)}</p>
                    {history.note && (
                      <p className="text-sm text-text-secondary mt-1">{history.note}</p>
                    )}
                    <p className="text-xs text-text-tertiary mt-2">
                      {formatDateTime(history.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rating display */}
          {order.rating && (
            <div className="apple-card bg-warning/5 border-warning/30">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-semibold mb-3">{o.yourReview}</h2>
                {canEditReview && (
                  <button
                    onClick={() => router.push(`/customer/orders/${orderId}/review`)}
                    className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= order.rating!.score ? 'text-warning fill-warning' : 'text-text-tertiary'}`}
                  />
                ))}
                <span className="ml-2 font-medium">{order.rating.score}/5</span>
              </div>
              {order.rating.review && (
                <p className="text-sm text-text-secondary">{order.rating.review}</p>
              )}
            </div>
          )}

          {/* Cancellation info */}
          {order.cancellation && (
            <div className="apple-card bg-error/5 border-error/30">
              <h2 className="text-xl font-semibold mb-3 text-error">{o.orderCancelled}</h2>
              <p className="text-sm text-text-secondary mb-1">{o.reason}: {order.cancellation.reason}</p>
              {order.cancellation.refundIssued && (
                <p className="text-sm text-success font-medium">{o.refundIssued}</p>
              )}
            </div>
          )}

          {/* Actions */}
          {order.status === 'completed' && !order.rating && (
            <button
              onClick={() => router.push(`/customer/orders/${orderId}/review`)}
              className="w-full px-8 py-4 bg-warning hover:bg-warning/90 text-black font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
            >
              <div className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5" />
                {o.rateExperience}
              </div>
            </button>
          )}

          {order.status === 'pending' && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full px-6 py-3 bg-surface hover:bg-surface-elevated border border-error text-error font-medium rounded-apple transition-all"
            >
              {o.cancelOrder}
            </button>
          )}
        </div>
      </div>

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

