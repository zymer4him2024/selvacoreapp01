'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package as PackageIcon, Users } from 'lucide-react';
import { getAnalyticsMetrics, getTopProducts, AnalyticsMetrics, TopProduct } from '@/lib/services/adminStatsService';
import { formatCurrency, formatOptionalNumber } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsData, products] = await Promise.all([
        getAnalyticsMetrics(),
        getTopProducts(10)
      ]);
      
      setMetrics(analyticsData);
      setTopProducts(products);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Format metrics for display
  const metricsData = [
    { 
      name: 'Total Revenue', 
      value: formatCurrency(metrics.totalRevenue, 'BRL'), 
      change: '+18.2%', 
      trend: 'up' as const 
    },
    { 
      name: 'Total Orders', 
      value: formatOptionalNumber(metrics.totalOrders), 
      change: '+12.5%', 
      trend: 'up' as const 
    },
    { 
      name: 'Avg Order Value', 
      value: formatOptionalNumber(Math.round(metrics.avgOrderValue)) === 'N/A' 
        ? 'N/A' 
        : formatCurrency(metrics.avgOrderValue, 'BRL'), 
      change: '+5.3%', 
      trend: 'up' as const 
    },
    { 
      name: 'Conversion Rate', 
      value: `${metrics.conversionRate.toFixed(2)}%`, 
      change: '-0.5%', 
      trend: 'down' as const 
    },
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
        {metricsData.map((metric) => (
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
        {topProducts.length === 0 ? (
          <div className="py-12 text-center">
            <PackageIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <p className="text-text-secondary">No completed orders yet</p>
            <p className="text-sm text-text-tertiary mt-2">Top products will appear here once orders are completed</p>
          </div>
        ) : (
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
                <p className="text-xl font-bold text-success">{formatCurrency(product.revenue, 'BRL')}</p>
              </div>
            ))}
          </div>
        )}
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

