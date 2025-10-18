'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Clock, Phone, MessageCircle, Star, Package as PackageIcon, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Order } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/formatters';
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsappHelper';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { userData } = useAuth();
  const orderId = params.id as string;
  const isNewOrder = searchParams.get('success') === 'true';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
    
    if (isNewOrder) {
      toast.success('🎉 Order placed successfully!', { duration: 5000 });
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const orderDoc = await getDoc(doc(db, 'orders', orderId));

      if (!orderDoc.exists()) {
        toast.error('Order not found');
        router.push('/customer/orders');
        return;
      }

      setOrder({ id: orderDoc.id, ...orderDoc.data() } as Order);
    } catch (error: any) {
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppContact = () => {
    if (!order?.installerInfo) {
      toast.error('Installer information not available yet');
      return;
    }

    const whatsappLink = generateWhatsAppLink(
      {
        name: order.installerInfo.name,
        phone: order.installerInfo.whatsapp,
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
          <p className="text-text-secondary">Loading order details...</p>
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
            Back to Orders
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
                  <h3 className="font-semibold text-success mb-1">Order Placed Successfully!</h3>
                  <p className="text-sm text-text-secondary">
                    Your order has been received. An installer will accept it soon. You'll be notified once it's accepted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Header */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Order {order.orderNumber}</h1>
                <p className="text-text-secondary">
                  Placed on {formatDate(order.createdAt, 'long')}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-apple text-sm font-medium border-2 ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>

          {/* Product & Service Info */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-4">Order Details</h2>
            
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

              <div className="pt-4 border-t border-border">
                <p className="font-medium">{order.serviceSnapshot.name[lang]}</p>
                <p className="text-sm text-text-secondary">{order.serviceSnapshot.duration}h installation</p>
                <p className="text-primary font-semibold mt-1">
                  {formatCurrency(order.payment.servicePrice, order.payment.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Installation Details */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-4">Installation Schedule</h2>
            
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

          {/* Installer Info (if accepted) */}
          {order.installerInfo ? (
            <div className="apple-card bg-primary/5 border-primary/30">
              <h2 className="text-xl font-semibold mb-4">Your Installer</h2>
              
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {order.installerInfo.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{order.installerInfo.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="font-medium">{order.installerInfo.rating.toFixed(1)}</span>
                    <span className="text-sm text-text-secondary">rating</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
                    <Phone className="w-4 h-4" />
                    <span>{order.installerInfo.phone}</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Button */}
              <button
                onClick={handleWhatsAppContact}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
              >
                <MessageCircle className="w-5 h-5" />
                Contact Installer on WhatsApp
              </button>
            </div>
          ) : (
            <div className="apple-card bg-warning/5 border-warning/30">
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto mb-3 text-warning" />
                <h3 className="font-semibold mb-1">Waiting for Installer</h3>
                <p className="text-sm text-text-secondary">
                  Your order is pending. An installer will accept it soon and you'll be notified.
                </p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Product</span>
                <span className="font-medium">
                  {formatCurrency(order.payment.productPrice, order.payment.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Service</span>
                <span className="font-medium">
                  {formatCurrency(order.payment.servicePrice, order.payment.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Tax</span>
                <span className="font-medium">
                  {formatCurrency(order.payment.tax, order.payment.currency)}
                </span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total Paid</span>
                  <span className="text-2xl font-bold text-success">
                    {formatCurrency(order.payment.amount, order.payment.currency)}
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">Payment Status</span>
                  <span className="text-success font-medium">✓ Paid</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-text-tertiary">Transaction ID</span>
                  <span className="font-mono text-xs">{order.payment.transactionId}</span>
                </div>
                {order.payment.paidAt && (
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-text-tertiary">Payment Date</span>
                    <span>{formatDateTime(order.payment.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Site Photos */}
          {order.sitePhotos && (
            <div className="apple-card">
              <h2 className="text-xl font-semibold mb-4">Site Photos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {order.sitePhotos.waterSource && (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">Water Source</p>
                    <img
                      src={order.sitePhotos.waterSource.url}
                      alt="Water source"
                      className="w-full h-40 object-cover rounded-apple"
                    />
                  </div>
                )}
                {order.sitePhotos.productLocation && (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">Installation Location</p>
                    <img
                      src={order.sitePhotos.productLocation.url}
                      alt="Installation location"
                      className="w-full h-40 object-cover rounded-apple"
                    />
                  </div>
                )}
                {order.sitePhotos.waterRunningVideo && (
                  <div>
                    <p className="text-sm text-text-secondary mb-2">Water Running</p>
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
              <h2 className="text-xl font-semibold mb-4">Installation Photos</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {order.installationPhotos.map((photo, index) => (
                  <div key={index}>
                    <img
                      src={photo.url}
                      alt={photo.description || `Installation photo ${index + 1}`}
                      className="w-full h-40 object-cover rounded-apple"
                    />
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
            <h2 className="text-xl font-semibold mb-4">Order Timeline</h2>
            
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
                    <p className="font-medium">{history.status.replace('_', ' ').toUpperCase()}</p>
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

          {/* Actions */}
          {order.status === 'completed' && !order.rating && (
            <button
              className="w-full px-8 py-4 bg-warning hover:bg-warning/90 text-black font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
            >
              <div className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5" />
                Rate Your Experience
              </div>
            </button>
          )}

          {order.status === 'pending' && (
            <button
              className="w-full px-6 py-3 bg-surface hover:bg-surface-elevated border border-error text-error font-medium rounded-apple transition-all"
              onClick={() => {
                if (confirm('Are you sure you want to cancel this order?')) {
                  toast.success('Order cancellation requested');
                }
              }}
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

