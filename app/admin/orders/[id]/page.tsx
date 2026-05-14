'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, User, DollarSign,
  Phone, CheckCircle, Clock, AlertCircle, XCircle
} from 'lucide-react';
import { Order } from '@/types/order';
import { getOrderById } from '@/lib/services/orderService';
import { formatOptionalString, getOrderStatusLabel } from '@/lib/utils/formatters';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pending: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  accepted: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  in_progress: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  completed: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  refunded: { color: 'var(--soft)', bg: 'var(--off-paper)' },
};

const getStatusStyle = (status: string) => STATUS_STYLES[status] ?? STATUS_STYLES.pending;

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="w-6 h-6" />;
    case 'cancelled': return <XCircle className="w-6 h-6" />;
    case 'pending': return <Clock className="w-6 h-6" />;
    default: return <AlertCircle className="w-6 h-6" />;
  }
};

export default function AdminOrderDetailPage() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useLocaleFormatters();
  const od = t.admin.orderDetail;
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await getOrderById(orderId);
      setOrder(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : od.loadOrderError;
      toast.error(message);
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="sc-spinner" style={{ margin: '0 auto' }} />
          <p className="sc-helper" style={{ margin: 0 }}>{od.loading}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="sc" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <h2 className="sc-h2" style={{ marginBottom: 16 }}>{od.notFound}</h2>
        <button onClick={() => router.push('/admin/orders')} className="sc-cta">
          {od.backToOrders}
        </button>
      </div>
    );
  }

  const statusStyle = getStatusStyle(order.status);

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/admin/orders')}
          style={{
            padding: 8,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'transparent',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="sc-h1" style={{ margin: 0, fontSize: 30 }}>{od.title}</h1>
          <p className="sc-helper" style={{ margin: '4px 0 0' }}>{od.subtitle}</p>
        </div>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: statusStyle.color,
            background: statusStyle.bg,
          }}
        >
          {getStatusIcon(order.status)}
          {getOrderStatusLabel(order.status, 'admin', t)}
        </div>
      </div>

      <div className="sc-card-static">
        <h2 className="sc-h2" style={{ margin: 0, marginBottom: 16, fontSize: 20 }}>{od.orderInfo}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <div>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.orderNumber}</p>
            <p style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)', margin: 0 }}>{order.orderNumber || od.na}</p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.createdDate}</p>
            <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              {order.createdAt ? formatDate(order.createdAt, 'short') : od.na}
            </p>
          </div>
          {order.installationDate && (
            <div>
              <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.installationDate}</p>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{formatDate(order.installationDate, 'short')}</p>
            </div>
          )}
          {order.timeSlot && (
            <div>
              <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.timeSlot}</p>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{order.timeSlot}</p>
            </div>
          )}
        </div>
      </div>

      <div className="sc-card-static">
        <h2 className="sc-h2" style={{ margin: 0, marginBottom: 16, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          {od.customerInfo}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.name}</p>
            <p style={{ fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{formatOptionalString(order.customerInfo?.name)}</p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.email}</p>
            <p style={{ fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{formatOptionalString(order.customerInfo?.email)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone className="w-4 h-4" style={{ color: 'var(--soft)' }} />
            <p style={{ fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{formatOptionalString(order.customerInfo?.phone)}</p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.address}</p>
            <p style={{ fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
              {order.installationAddress
                ? `${order.installationAddress.street}, ${order.installationAddress.city}, ${order.installationAddress.state} ${order.installationAddress.postalCode}`
                : od.na}
            </p>
          </div>
        </div>
      </div>

      <div className="sc-card-static">
        <h2 className="sc-h2" style={{ margin: 0, marginBottom: 16, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          {od.productService}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <div>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 8 }}>{od.product}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                {typeof order.productSnapshot?.name === 'string'
                  ? order.productSnapshot.name
                  : order.productSnapshot?.name?.en || od.na}
              </p>
              {order.productSnapshot?.variation && (
                <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>
                  {od.variation}: {order.productSnapshot.variation}
                </p>
              )}
              {order.productSnapshot?.price && (
                <p style={{ fontWeight: 700, color: 'var(--brand)', margin: 0 }}>
                  {formatCurrency(order.productSnapshot.price, order.payment?.currency || DEFAULT_CURRENCY)}
                </p>
              )}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 8 }}>{od.service}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                {typeof order.serviceSnapshot?.name === 'string'
                  ? order.serviceSnapshot.name
                  : order.serviceSnapshot?.name?.en || od.na}
              </p>
              {order.serviceSnapshot?.duration && (
                <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>
                  {od.duration}: {order.serviceSnapshot.duration} {od.minutes}
                </p>
              )}
              {order.serviceSnapshot?.price && (
                <p style={{ fontWeight: 700, color: 'var(--brand)', margin: 0 }}>
                  {formatCurrency(order.serviceSnapshot.price, order.payment?.currency || DEFAULT_CURRENCY)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {order.payment && (
        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 16, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign className="w-6 h-6" style={{ color: 'var(--brand)' }} />
            {od.paymentInfo}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.amount}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)', margin: 0 }}>
                {order.payment.amount ? formatCurrency(order.payment.amount, order.payment.currency || DEFAULT_CURRENCY) : od.na}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{t.common.status}</p>
              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{order.payment.status || od.na}</p>
            </div>
            {order.payment.method && (
              <div>
                <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.method}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{order.payment.method}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {order.technicianInfo && (
        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 16, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User className="w-6 h-6" style={{ color: 'var(--brand)' }} />
            {od.assignedTechnician}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{od.name}</p>
              <p style={{ fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{formatOptionalString(order.technicianInfo.name)}</p>
            </div>
            {order.technicianInfo.phone && (
              <div>
                <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>{t.common.phone}</p>
                <p style={{ fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{order.technicianInfo.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {order.sitePhotos && (
        <div className="sc-card-static">
          <h2 className="sc-h2" style={{ margin: 0, marginBottom: 16, fontSize: 20 }}>{od.sitePhotos}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {order.sitePhotos.waterSource && (
              <div>
                <p style={{ fontSize: 14, color: 'var(--soft)', margin: '0 0 8px' }}>{od.waterSource}</p>
                <div style={{ width: '100%', height: 160, background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.sitePhotos.waterSource.url}
                    alt={od.waterSourceAlt}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
            {order.sitePhotos.productLocation && (
              <div>
                <p style={{ fontSize: 14, color: 'var(--soft)', margin: '0 0 8px' }}>{od.installationLocation}</p>
                <div style={{ width: '100%', height: 160, background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.sitePhotos.productLocation.url}
                    alt={od.installationLocationAlt}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
            {order.sitePhotos.fullShot && (
              <div>
                <p style={{ fontSize: 14, color: 'var(--soft)', margin: '0 0 8px' }}>{od.fullShot}</p>
                <div style={{ width: '100%', height: 160, background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.sitePhotos.fullShot.url}
                    alt={od.fullShotAlt}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
            {order.sitePhotos.waterRunningVideo && (
              <div>
                <p style={{ fontSize: 14, color: 'var(--soft)', margin: '0 0 8px' }}>{od.waterRunning}</p>
                <video
                  src={order.sitePhotos.waterRunningVideo.url}
                  controls
                  style={{ width: '100%', height: 160, borderRadius: 'var(--radius-md)', background: '#000' }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
