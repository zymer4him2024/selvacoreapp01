'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Package, User, Calendar, DollarSign, MapPin, 
  Phone, Mail, CheckCircle, Clock, AlertCircle, XCircle 
} from 'lucide-react';
import { Order } from '@/types/order';
import { getOrderById } from '@/lib/services/orderService';
import { formatCurrency, formatDate, formatOptionalString } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load order');
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning/20 text-warning',
      accepted: 'bg-primary/20 text-primary',
      in_progress: 'bg-secondary/20 text-secondary',
      completed: 'bg-success/20 text-success',
      cancelled: 'bg-error/20 text-error',
      refunded: 'bg-text-tertiary/20 text-text-tertiary',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-6 h-6" />;
      case 'cancelled': return <XCircle className="w-6 h-6" />;
      case 'pending': return <Clock className="w-6 h-6" />;
      default: return <AlertCircle className="w-6 h-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Order not found</h2>
        <button
          onClick={() => router.push('/admin/orders')}
          className="apple-button-primary"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/orders')}
          className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Order Details</h1>
          <p className="text-text-secondary">View and manage order information</p>
        </div>
        <div className={`px-4 py-2 rounded-apple text-sm font-semibold flex items-center gap-2 ${getStatusColor(order.status)}`}>
          {getStatusIcon(order.status)}
          {order.status.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* Order Info Card */}
      <div className="apple-card">
        <h2 className="text-xl font-semibold mb-4">Order Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Order Number</p>
            <p className="font-semibold text-lg">{order.orderNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Created Date</p>
            <p className="font-semibold">
              {order.createdAt ? formatDate(order.createdAt, 'short') : 'N/A'}
            </p>
          </div>
          {order.installationDate && (
            <div>
              <p className="text-sm text-text-tertiary mb-1">Installation Date</p>
              <p className="font-semibold">{formatDate(order.installationDate, 'short')}</p>
            </div>
          )}
          {order.timeSlot && (
            <div>
              <p className="text-sm text-text-tertiary mb-1">Time Slot</p>
              <p className="font-semibold">{order.timeSlot}</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="apple-card">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Customer Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-text-tertiary mb-1">Name</p>
            <p className="font-medium">{formatOptionalString(order.customerInfo?.name)}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Email</p>
            <p className="font-medium">{formatOptionalString(order.customerInfo?.email)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-text-tertiary" />
            <p className="font-medium">{formatOptionalString(order.customerInfo?.phone)}</p>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-1">Address</p>
            <p className="font-medium">
              {order.installationAddress
                ? `${order.installationAddress.street}, ${order.installationAddress.city}, ${order.installationAddress.state} ${order.installationAddress.postalCode}`
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Product & Service */}
      <div className="apple-card">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          Product & Service
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-tertiary mb-2">Product</p>
            <div className="space-y-2">
              <p className="font-semibold">
                {typeof order.productSnapshot?.name === 'string'
                  ? order.productSnapshot.name
                  : order.productSnapshot?.name?.en || 'N/A'}
              </p>
              <p className="text-sm text-text-secondary">
                Brand: {order.productSnapshot?.brand || 'N/A'}
              </p>
              {order.productSnapshot?.price && (
                <p className="font-bold text-primary">
                  {formatCurrency(order.productSnapshot.price, 'BRL')}
                </p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-text-tertiary mb-2">Service</p>
            <div className="space-y-2">
              <p className="font-semibold">
                {typeof order.serviceSnapshot?.name === 'string'
                  ? order.serviceSnapshot.name
                  : order.serviceSnapshot?.name?.en || 'N/A'}
              </p>
              {order.serviceSnapshot?.description && (
                <p className="text-sm text-text-secondary">
                  {order.serviceSnapshot.description}
                </p>
              )}
              {order.serviceSnapshot?.price && (
                <p className="font-bold text-primary">
                  {formatCurrency(order.serviceSnapshot.price, 'BRL')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      {order.payment && (
        <div className="apple-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Payment Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-text-tertiary mb-1">Amount</p>
              <p className="text-2xl font-bold text-success">
                {order.payment.amount ? formatCurrency(order.payment.amount, order.payment.currency || 'BRL') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-tertiary mb-1">Status</p>
              <p className="font-semibold">{order.payment.status || 'N/A'}</p>
            </div>
            {order.payment.method && (
              <div>
                <p className="text-sm text-text-tertiary mb-1">Method</p>
                <p className="font-semibold">{order.payment.method}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Technician Info */}
      {order.technicianInfo && (
        <div className="apple-card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Assigned Technician
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-tertiary mb-1">Name</p>
              <p className="font-medium">{formatOptionalString(order.technicianInfo.name)}</p>
            </div>
            {order.technicianInfo.phone && (
              <div>
                <p className="text-sm text-text-tertiary mb-1">Phone</p>
                <p className="font-medium">{order.technicianInfo.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Site Photos */}
      {order.sitePhotos && (
        <div className="apple-card">
          <h2 className="text-xl font-semibold mb-4">Site Photos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {order.sitePhotos.waterSource && (
              <div>
                <p className="text-sm text-text-secondary mb-2">Water Source</p>
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
                <p className="text-sm text-text-secondary mb-2">Installation Location</p>
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
                <p className="text-sm text-text-secondary mb-2">Full Shot</p>
                <div className="w-full h-40 bg-surface-elevated rounded-apple overflow-hidden">
                  <img
                    src={order.sitePhotos.fullShot.url}
                    alt="Full shot"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

