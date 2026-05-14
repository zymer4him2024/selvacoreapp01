'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Eye, Trash2, Package as PackageIcon, Calendar, User } from 'lucide-react';
import { Order } from '@/types';
import { getOrdersPaginated, deleteOrder } from '@/lib/services/orderService';
import { formatOptionalString, getOrderStatusLabel } from '@/lib/utils/formatters';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pending: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  accepted: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  in_progress: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  completed: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  refunded: { color: 'var(--soft)', bg: 'var(--off-paper)' },
};

const getStatusStyle = (status: string) => STATUS_STYLES[status] ?? STATUS_STYLES.pending;

export default function OrdersPage() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useLocaleFormatters();
  const { userData } = useAuth();
  const isSubAdmin = userData?.role === 'sub-admin';
  const o = t.admin.orders;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const loadOrders = useCallback(async (reset: boolean = true) => {
    try {
      if (reset) {
        setLoading(true);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }
      const result = await getOrdersPaginated(
        PAGE_SIZE,
        reset ? null : lastDocRef.current,
        statusFilter
      );
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
      setOrders((prev) => (reset ? result.items : [...prev, ...result.items]));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : o.loadOrdersError;
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter, o.loadOrdersError]);

  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm(o.confirmDelete)) return;
    try {
      setDeletingId(orderId);
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(ord => ord.id !== orderId));
      toast.success(o.orderDeleted);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : o.deleteOrderError;
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const customerName = order.customerInfo?.name || '';
    const matchesSearch =
      (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="sc-spinner" style={{ margin: '0 auto' }} />
          <p className="sc-helper" style={{ margin: 0 }}>{o.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{o.title}</h1>
        <p className="sc-helper" style={{ margin: 0 }}>{o.subtitle}</p>
      </div>

      <div className="sc-card-static">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <Search
              className="w-5 h-5"
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--soft)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder={o.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sc-input"
              style={{ paddingLeft: 44, width: '100%' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sc-select"
          >
            <option value="all">{o.allStatuses}</option>
            <option value="pending">{o.pending}</option>
            <option value="accepted">{o.accepted}</option>
            <option value="in_progress">{o.inProgress}</option>
            <option value="completed">{o.completed}</option>
            <option value="cancelled">{o.cancelled}</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <PackageIcon className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--soft)' }} />
          <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>{o.noOrders}</h3>
          <p className="sc-helper" style={{ margin: 0 }}>
            {searchTerm || statusFilter !== 'all' ? o.tryAdjusting : o.ordersWillAppear}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredOrders.map((order) => {
            const statusStyle = getStatusStyle(order.status);
            return (
              <div key={order.id} className="sc-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>{order.orderNumber}</h3>
                          <span
                            style={{
                              padding: '4px 12px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 12,
                              fontWeight: 500,
                              color: statusStyle.color,
                              background: statusStyle.bg,
                            }}
                          >
                            {getOrderStatusLabel(order.status, 'admin', t)}
                          </span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>
                          {order.productSnapshot?.name?.en || t.admin.orderDetail.na} - {order.serviceSnapshot?.name?.en || t.admin.orderDetail.na}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)', margin: 0 }}>
                          {order.payment?.amount ? formatCurrency(order.payment.amount, order.payment.currency) : t.admin.orderDetail.na}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--soft)', margin: '4px 0 0' }}>
                          {order.payment?.status || t.admin.orderDetail.na}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, fontSize: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--soft)' }}>
                        <User className="w-4 h-4" />
                        <span>{formatOptionalString(order.customerInfo?.name)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--soft)' }}>
                        <Calendar className="w-4 h-4" />
                        <span>{order.installationDate ? formatDate(order.installationDate, 'short') : t.admin.orderDetail.na}</span>
                        {order.timeSlot && (
                          <span
                            style={{
                              fontSize: 12,
                              background: 'var(--off-paper)',
                              border: '1px solid var(--hairline)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {order.timeSlot}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--soft)' }}>
                        {o.created} {order.createdAt ? formatDate(order.createdAt, 'short') : t.admin.orderDetail.na}
                      </div>
                    </div>

                    {order.technicianInfo && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                        <p style={{ fontSize: 12, color: 'var(--soft)', margin: '0 0 4px' }}>{o.technician}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--brand-tint)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand)' }}>
                              {order.technicianInfo.name?.charAt(0) || 'T'}
                            </span>
                          </div>
                          <span style={{ fontSize: 14, color: 'var(--ink)' }}>{formatOptionalString(order.technicianInfo.name)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      style={{
                        padding: 8,
                        background: 'var(--off-paper)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--ink)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; }}
                    >
                      <Eye className="w-5 h-5" />
                    </Link>
                    {!isSubAdmin && (
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={deletingId === order.id}
                        aria-label={o.deleteOrderAria}
                        style={{
                          padding: 8,
                          background: 'var(--off-paper)',
                          border: '1px solid var(--hairline)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--soft)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: deletingId === order.id ? 'not-allowed' : 'pointer',
                          opacity: deletingId === order.id ? 0.5 : 1,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (deletingId !== order.id) {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                            e.currentTarget.style.color = '#ef4444';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--off-paper)';
                          e.currentTarget.style.color = 'var(--soft)';
                        }}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => loadOrders(false)}
            disabled={loadingMore}
            className="sc-cta-ghost"
            style={{ opacity: loadingMore ? 0.5 : 1 }}
          >
            {loadingMore ? t.common.loading : t.common.loadMore}
          </button>
        </div>
      )}

      {filteredOrders.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <div className="sc-card-static" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>{o.loaded}</p>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--ink)' }}>{filteredOrders.length}</p>
          </div>
          <div className="sc-card-static" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>{o.pending}</p>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--warn)' }}>
              {filteredOrders.filter((ord) => ord.status === 'pending').length}
            </p>
          </div>
          <div className="sc-card-static" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>{o.inProgress}</p>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--brand)' }}>
              {filteredOrders.filter((ord) => ord.status === 'in_progress').length}
            </p>
          </div>
          <div className="sc-card-static" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>{o.completed}</p>
            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--brand)' }}>
              {filteredOrders.filter((ord) => ord.status === 'completed').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
