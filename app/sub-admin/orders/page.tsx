'use client';

import { useState, useEffect } from 'react';
import { Package, Calendar, User, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubAdminOrders } from '@/lib/services/subAdminService';
import { Order } from '@/types';
import { formatCurrency, formatDate, formatOptionalString, getOrderStatusLabel } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

export default function SubAdminOrdersPage() {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!userData?.subContractorId) {
      setLoading(false);
      return;
    }
    loadOrders(userData.subContractorId);
  }, [userData]);

  const loadOrders = async (subContractorId: string) => {
    try {
      const data = await getSubAdminOrders(subContractorId);
      setOrders(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load orders';
      toast.error(message);
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
    };
    return colors[status] || colors.pending;
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
          <p className="text-text-secondary">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Orders</h1>
        <p className="text-text-secondary">Orders assigned to your technicians</p>
      </div>

      <div className="apple-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by order number or customer..."
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
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="apple-card text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">No orders found</h3>
          <p className="text-text-secondary">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Orders assigned to your team will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="apple-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getOrderStatusLabel(order.status, 'admin', t)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {order.productSnapshot?.name?.en || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {order.payment?.amount ? formatCurrency(order.payment.amount, order.payment.currency) : 'N/A'}
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
                  <span>{order.installationDate ? formatDate(order.installationDate, 'short') : 'N/A'}</span>
                </div>
                <div className="text-text-tertiary">
                  {order.technicianInfo ? (
                    <span>Technician: {order.technicianInfo.name}</span>
                  ) : (
                    <span>Unassigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredOrders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">Total</p>
            <p className="text-2xl font-bold mt-1">{filteredOrders.length}</p>
          </div>
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">Pending</p>
            <p className="text-2xl font-bold mt-1 text-warning">
              {filteredOrders.filter((o) => o.status === 'pending').length}
            </p>
          </div>
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">In Progress</p>
            <p className="text-2xl font-bold mt-1 text-secondary">
              {filteredOrders.filter((o) => o.status === 'in_progress' || o.status === 'accepted').length}
            </p>
          </div>
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">Completed</p>
            <p className="text-2xl font-bold mt-1 text-success">
              {filteredOrders.filter((o) => o.status === 'completed').length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
