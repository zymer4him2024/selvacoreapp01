'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Package as PackageIcon } from 'lucide-react';
import { getAnalyticsMetrics, getTopProducts, AnalyticsMetrics, TopProduct } from '@/lib/services/adminStatsService';
import { formatOptionalNumber } from '@/lib/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { userData } = useAuth();
  const router = useRouter();
  const { formatCurrency } = useLocaleFormatters();
  const an = t.admin.analytics;
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.replace('/admin');
    }
  }, [userData, router]);

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
    } catch {
      toast.error(an.loadError);
    } finally {
      setLoading(false);
    }
  };

  if (userData && userData.role !== 'admin') return null;

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{an.loading}</p>
        </div>
      </div>
    );
  }

  const metricsData = [
    {
      name: an.totalRevenue,
      value: formatCurrency(metrics.totalRevenue, DEFAULT_CURRENCY),
    },
    {
      name: an.totalOrders,
      value: formatOptionalNumber(metrics.totalOrders),
    },
    {
      name: an.avgOrderValue,
      value: formatOptionalNumber(Math.round(metrics.avgOrderValue)) === 'N/A'
        ? an.naLabel
        : formatCurrency(metrics.avgOrderValue, DEFAULT_CURRENCY),
    },
    {
      name: an.conversionRate,
      value: `${metrics.conversionRate.toFixed(2)}%`,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{an.title}</h1>
        <p className="text-text-secondary">{an.subtitle}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsData.map((metric) => (
          <div key={metric.name} className="apple-card">
            <p className="text-text-tertiary text-sm mb-1">{metric.name}</p>
            <p className="text-3xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Top Products */}
      <div className="apple-card">
        <h2 className="text-2xl font-semibold mb-6">{an.topProducts}</h2>
        {topProducts.length === 0 ? (
          <div className="py-12 text-center">
            <PackageIcon className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <p className="text-text-secondary">{an.noOrders}</p>
            <p className="text-sm text-text-tertiary mt-2">{an.topProductsAppear}</p>
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
                    <p className="text-sm text-text-secondary">{product.sales} {an.sales}</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-success">{formatCurrency(product.revenue, DEFAULT_CURRENCY)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charts Placeholder */}
      <div className="apple-card">
        <h2 className="text-2xl font-semibold mb-6">{an.revenueTrend}</h2>
        <div className="h-64 flex items-center justify-center bg-surface-elevated rounded-apple">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <p className="text-text-secondary">{an.chartsComingSoon}</p>
            <p className="text-sm text-text-tertiary mt-2">
              {an.chartsDescription}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

