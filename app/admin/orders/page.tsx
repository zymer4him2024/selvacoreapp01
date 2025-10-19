'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Eye, Package as PackageIcon, Calendar, User } from 'lucide-react';
import { Order } from '@/types';
import { getAllOrders } from '@/lib/services/orderService';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders();
      setOrders(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load orders');
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase());
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
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Orders</h1>
        <p className="text-text-secondary">Manage all installation orders</p>
      </div>

      {/* Filters */}
      <div className="apple-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search by order number or customer name..."
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

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="apple-card text-center py-16">
          <PackageIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">No orders found</h3>
          <p className="text-text-secondary">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Orders will appear here once customers place them'}
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
                        {order.productSnapshot.name.en} - {order.serviceSnapshot.name.en}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(order.payment.amount, order.payment.currency)}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {order.payment.status}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <User className="w-4 h-4" />
                      <span>{order.customerInfo.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(order.installationDate, 'short')}</span>
                      <span className="text-xs bg-surface-elevated px-2 py-0.5 rounded">
                        {order.timeSlot}
                      </span>
                    </div>
                    <div className="text-text-tertiary">
                      Created {formatDate(order.createdAt, 'short')}
                    </div>
                  </div>

                  {order.technicianInfo && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-text-tertiary mb-1">Technician</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {order.technicianInfo.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm">{order.technicianInfo.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action */}
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="ml-4 p-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
                >
                  <Eye className="w-5 h-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="apple-card text-center">
            <p className="text-text-tertiary text-sm">Total Orders</p>
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
              {filteredOrders.filter((o) => o.status === 'in_progress').length}
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

