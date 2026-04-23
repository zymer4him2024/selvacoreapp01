'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Eye, Trash2, Package as PackageIcon, Calendar, User } from 'lucide-react';
import { Order } from '@/types';
import { getOrdersPaginated, deleteOrder } from '@/lib/services/orderService';
import { formatCurrency, formatDate, formatOptionalString } from '@/lib/utils/formatters';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const { t } = useTranslation();
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
      const message = error instanceof Error ? error.message : 'Failed to load orders';
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

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

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
    try {
      setDeletingId(orderId);
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Order deleted');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete order';
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{o.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{o.title}</h1>
        <p className="text-text-secondary">{o.subtitle}</p>
      </div>

      {/* Filters */}
      <div className="apple-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder={o.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
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

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="apple-card text-center py-16">
          <PackageIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">{o.noOrders}</h3>
          <p className="text-text-secondary">
            {searchTerm || statusFilter !== 'all'
              ? o.tryAdjusting
              : o.ordersWillAppear}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="apple-card hover:scale-[1.005] transition-all">
              <div className="flex items-start justify-between">
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {order.productSnapshot?.name?.en || t.admin.orderDetail.na} - {order.serviceSnapshot?.name?.en || t.admin.orderDetail.na}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {order.payment?.amount ? formatCurrency(order.payment.amount, order.payment.currency) : t.admin.orderDetail.na}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {order.payment?.status || t.admin.orderDetail.na}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <User className="w-4 h-4" />
                      <span>{formatOptionalString(order.customerInfo?.name)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Calendar className="w-4 h-4" />
                      <span>{order.installationDate ? formatDate(order.installationDate, 'short') : t.admin.orderDetail.na}</span>
                      {order.timeSlot && (
                        <span className="text-xs bg-surface-elevated px-2 py-0.5 rounded">
                          {order.timeSlot}
                        </span>
                      )}
                    </div>
                    <div className="text-text-tertiary">
                      {o.created} {order.createdAt ? formatDate(order.createdAt, 'short') : t.admin.orderDetail.na}
                    </div>
                  </div>

                  {order.technicianInfo && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-text-tertiary mb-1">{o.technician}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {order.technicianInfo.name?.charAt(0) || 'T'}
                          </span>
                        </div>
                        <span className="text-sm">{formatOptionalString(order.technicianInfo.name)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-4 flex flex-col gap-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="p-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    disabled={deletingId === order.id}
                    className="p-2 bg-surface-elevated hover:bg-error/20 text-text-secondary hover:text-error rounded-apple transition-all disabled:opacity-50"
                    aria-label="Delete order"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => loadOrders(false)}
            disabled={loadingMore}
            className="px-8 py-3 bg-surface-elevated hover:bg-surface-secondary text-text-primary font-medium rounded-apple transition-all disabled:opacity-50"
          >
            {loadingMore ? t.common.loading : t.common.loadMore}
          </button>
        </div>
      )}

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">{o.loaded}</p>
            <p className="text-2xl font-bold mt-1">{filteredOrders.length}</p>
          </div>
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">{o.pending}</p>
            <p className="text-2xl font-bold mt-1 text-warning">
              {filteredOrders.filter((ord) => ord.status === 'pending').length}
            </p>
          </div>
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">{o.inProgress}</p>
            <p className="text-2xl font-bold mt-1 text-secondary">
              {filteredOrders.filter((ord) => ord.status === 'in_progress').length}
            </p>
          </div>
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">{o.completed}</p>
            <p className="text-2xl font-bold mt-1 text-success">
              {filteredOrders.filter((ord) => ord.status === 'completed').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

