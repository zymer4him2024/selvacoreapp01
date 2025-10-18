'use client';

import { Package, Wrench, Building2, ShoppingCart, TrendingUp, Users } from 'lucide-react';

export default function AdminDashboard() {
  // Mock data - will be replaced with real data from Firestore
  const stats = [
    { name: 'Total Products', value: '24', icon: Package, change: '+12%', trend: 'up' },
    { name: 'Total Services', value: '8', icon: Wrench, change: '+5%', trend: 'up' },
    { name: 'Sub-Contractors', value: '12', icon: Building2, change: '+2', trend: 'up' },
    { name: 'Total Orders', value: '156', icon: ShoppingCart, change: '+23%', trend: 'up' },
    { name: 'Revenue (MTD)', value: '$24,500', icon: TrendingUp, change: '+18%', trend: 'up' },
    { name: 'Active Installers', value: '34', icon: Users, change: '+6', trend: 'up' },
  ];

  const recentOrders = [
    { id: 'ORD-202501-0042', customer: 'John Doe', product: 'Water Filter Pro', status: 'pending', amount: '$450' },
    { id: 'ORD-202501-0041', customer: 'Jane Smith', product: 'UV System', status: 'accepted', amount: '$680' },
    { id: 'ORD-202501-0040', customer: 'Mike Johnson', product: 'RO System', status: 'completed', amount: '$1,200' },
    { id: 'ORD-202501-0039', customer: 'Sarah Williams', product: 'Water Softener', status: 'in_progress', amount: '$890' },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-warning bg-warning/10',
      accepted: 'text-primary bg-primary/10',
      in_progress: 'text-secondary bg-secondary/10',
      completed: 'text-success bg-success/10',
      cancelled: 'text-error bg-error/10',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-text-secondary">
          Welcome back! Here's what's happening with your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="apple-card group hover:scale-[1.02] transition-transform cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-text-tertiary text-sm font-medium mb-1">
                    {stat.name}
                  </p>
                  <p className="text-3xl font-bold mb-2">{stat.value}</p>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-success' : 'text-error'}`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-text-tertiary">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-apple bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="apple-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Recent Orders</h2>
            <p className="text-text-secondary text-sm mt-1">
              Latest orders from customers
            </p>
          </div>
          <a
            href="/admin/orders"
            className="px-4 py-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple text-sm font-medium transition-colors"
          >
            View All
          </a>
        </div>

        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 rounded-apple bg-surface hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <div className="flex-1">
                <p className="font-medium">{order.customer}</p>
                <p className="text-sm text-text-secondary">{order.product}</p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.replace('_', ' ')}
                </span>
                <span className="text-sm text-text-tertiary">{order.id}</span>
                <span className="font-semibold">{order.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href="/admin/products/new"
          className="apple-card hover:scale-[1.02] transition-transform text-center py-8"
        >
          <Package className="w-10 h-10 mx-auto mb-3 text-primary" />
          <h3 className="font-semibold mb-1">Add Product</h3>
          <p className="text-sm text-text-tertiary">Create new product</p>
        </a>

        <a
          href="/admin/services/new"
          className="apple-card hover:scale-[1.02] transition-transform text-center py-8"
        >
          <Wrench className="w-10 h-10 mx-auto mb-3 text-secondary" />
          <h3 className="font-semibold mb-1">Add Service</h3>
          <p className="text-sm text-text-tertiary">Create new service</p>
        </a>

        <a
          href="/admin/sub-contractors"
          className="apple-card hover:scale-[1.02] transition-transform text-center py-8"
        >
          <Building2 className="w-10 h-10 mx-auto mb-3 text-success" />
          <h3 className="font-semibold mb-1">Manage Sub-Contractors</h3>
          <p className="text-sm text-text-tertiary">View all contractors</p>
        </a>

        <a
          href="/admin/analytics"
          className="apple-card hover:scale-[1.02] transition-transform text-center py-8"
        >
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-warning" />
          <h3 className="font-semibold mb-1">View Analytics</h3>
          <p className="text-sm text-text-tertiary">Business insights</p>
        </a>
      </div>
    </div>
  );
}

