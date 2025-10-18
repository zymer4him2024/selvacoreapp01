'use client';

import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package as PackageIcon, Users } from 'lucide-react';

export default function AnalyticsPage() {
  // Mock data - will be replaced with real analytics
  const metrics = [
    { name: 'Total Revenue', value: '$125,430', change: '+18.2%', trend: 'up' },
    { name: 'Total Orders', value: '1,245', change: '+12.5%', trend: 'up' },
    { name: 'Avg Order Value', value: '$680', change: '+5.3%', trend: 'up' },
    { name: 'Conversion Rate', value: '3.2%', change: '-0.5%', trend: 'down' },
  ];

  const topProducts = [
    { name: 'Water Filter Pro', sales: 145, revenue: '$65,250' },
    { name: 'UV System Premium', sales: 98, revenue: '$48,900' },
    { name: 'RO System Advanced', sales: 87, revenue: '$52,200' },
    { name: 'Water Softener Plus', sales: 76, revenue: '$38,000' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Analytics</h1>
        <p className="text-text-secondary">Business insights and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <div key={metric.name} className="apple-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-text-tertiary text-sm mb-1">{metric.name}</p>
                <p className="text-3xl font-bold">{metric.value}</p>
              </div>
              {metric.trend === 'up' ? (
                <TrendingUp className="w-6 h-6 text-success" />
              ) : (
                <TrendingDown className="w-6 h-6 text-error" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <span
                className={`text-sm font-medium ${
                  metric.trend === 'up' ? 'text-success' : 'text-error'
                }`}
              >
                {metric.change}
              </span>
              <span className="text-xs text-text-tertiary">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top Products */}
      <div className="apple-card">
        <h2 className="text-2xl font-semibold mb-6">Top Products</h2>
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div
              key={product.name}
              className="flex items-center justify-between p-4 rounded-apple bg-surface hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-apple bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-primary">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-text-secondary">{product.sales} sales</p>
                </div>
              </div>
              <p className="text-xl font-bold text-success">{product.revenue}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="apple-card">
        <h2 className="text-2xl font-semibold mb-6">Revenue Trend</h2>
        <div className="h-64 flex items-center justify-center bg-surface-elevated rounded-apple">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <p className="text-text-secondary">Charts will be implemented soon</p>
            <p className="text-sm text-text-tertiary mt-2">
              Integration with Recharts for beautiful data visualization
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

