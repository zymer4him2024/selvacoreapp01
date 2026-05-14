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
      <div className="sc" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="sc-spinner" />
          <p className="sc-helper">{an.loading}</p>
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
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 className="sc-h1" style={{ marginTop: 0, marginBottom: 8 }}>{an.title}</h1>
        <p className="sc-helper" style={{ margin: 0 }}>{an.subtitle}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {metricsData.map((metric) => (
          <div key={metric.name} className="sc-card-static">
            <p className="sc-helper" style={{ margin: 0, marginBottom: 4 }}>{metric.name}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="sc-card-static">
        <h2 className="sc-h2" style={{ marginTop: 0, marginBottom: 24 }}>{an.topProducts}</h2>
        {topProducts.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <PackageIcon size={64} color="var(--soft)" style={{ margin: '0 auto 16px' }} />
            <p className="sc-helper" style={{ marginBottom: 8 }}>{an.noOrders}</p>
            <p className="sc-helper" style={{ fontSize: 13, margin: 0 }}>{an.topProductsAppear}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topProducts.map((product, index) => (
              <div
                key={product.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--off-paper)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-tint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--brand)' }}>#{index + 1}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{product.name}</p>
                    <p className="sc-helper" style={{ fontSize: 13, margin: 0, marginTop: 2 }}>{product.sales} {an.sales}</p>
                  </div>
                </div>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand)', margin: 0 }}>
                  {formatCurrency(product.revenue, DEFAULT_CURRENCY)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sc-card-static">
        <h2 className="sc-h2" style={{ marginTop: 0, marginBottom: 24 }}>{an.revenueTrend}</h2>
        <div style={{
          height: 256,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--off-paper)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <BarChart3 size={64} color="var(--soft)" style={{ margin: '0 auto 16px' }} />
            <p className="sc-helper" style={{ marginBottom: 8 }}>{an.chartsComingSoon}</p>
            <p className="sc-helper" style={{ fontSize: 13, margin: 0 }}>{an.chartsDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
