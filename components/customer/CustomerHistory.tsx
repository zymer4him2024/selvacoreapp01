'use client';

import { useState, useEffect } from 'react';
import { Clock, CreditCard, Package, CheckCircle, XCircle } from 'lucide-react';
import { CustomerHistoryRecord, getCustomerHistory } from '@/lib/services/customerHistoryService';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';

interface CustomerHistoryProps {
  customerId: string;
  limit?: number;
}

const ERROR_COLOR = '#ef4444';

export default function CustomerHistory({ customerId, limit = 5 }: CustomerHistoryProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<CustomerHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [customerId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const historyData = await getCustomerHistory(customerId);
      setHistory(historyData.slice(0, limit));
    } catch {
      // Silently ignore - UI will show empty state
    } finally {
      setLoading(false);
    }
  };

  const getHistoryIcon = (type: CustomerHistoryRecord['type']) => {
    switch (type) {
      case 'payment_made':
        return <CreditCard className="w-4 h-4" style={{ color: 'var(--brand)' }} />;
      case 'order_placed':
        return <Package className="w-4 h-4" style={{ color: 'var(--brand)' }} />;
      case 'service_completed':
        return <CheckCircle className="w-4 h-4" style={{ color: 'var(--brand)' }} />;
      case 'order_cancelled':
        return <XCircle className="w-4 h-4" style={{ color: ERROR_COLOR }} />;
      default:
        return <Clock className="w-4 h-4" style={{ color: 'var(--soft)' }} />;
    }
  };

  const getHistoryColor = (type: CustomerHistoryRecord['type']) => {
    switch (type) {
      case 'payment_made':
      case 'order_placed':
      case 'service_completed':
        return 'var(--brand)';
      case 'order_cancelled':
        return ERROR_COLOR;
      default:
        return 'var(--soft)';
    }
  };

  if (loading) {
    return (
      <div className="sc-card-static">
        <h2 className="sc-h2" style={{ marginBottom: 16 }}>
          {t.components.customerHistory.recentActivity}
        </h2>
        <div className="sc-stack" style={{ gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="sc-row" style={{ alignItems: 'center', gap: 12, opacity: 0.6 }}>
              <div style={{ width: 16, height: 16, background: 'var(--off-paper)', borderRadius: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 16, background: 'var(--off-paper)', borderRadius: 4, width: '75%', marginBottom: 8 }} />
                <div style={{ height: 12, background: 'var(--off-paper)', borderRadius: 4, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="sc-card-static">
        <h2 className="sc-h2" style={{ marginBottom: 16 }}>
          {t.components.customerHistory.recentActivity}
        </h2>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Clock className="w-12 h-12" style={{ color: 'var(--soft)', margin: '0 auto 12px' }} />
          <p className="sc-helper">{t.components.customerHistory.noRecentActivity}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-card-static">
      <h2 className="sc-h2" style={{ marginBottom: 16 }}>
        {t.components.customerHistory.recentActivity}
      </h2>

      <div className="sc-stack" style={{ gap: 16 }}>
        {history.map((record) => (
          <div
            key={record.id}
            className="sc-row"
            style={{
              alignItems: 'flex-start',
              gap: 12,
              padding: 12,
              background: 'var(--off-paper)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 4 }}>
              {getHistoryIcon(record.type)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sc-row-between" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: getHistoryColor(record.type), margin: 0 }}>
                    {record.title}
                  </p>
                  <p className="sc-helper" style={{ marginTop: 4 }}>
                    {record.description}
                  </p>

                  {record.amount && (
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand)', marginTop: 4 }}>
                      {formatCurrency(record.amount, record.currency || 'USD')}
                    </p>
                  )}
                </div>

                <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--soft)', marginLeft: 16, flexShrink: 0 }}>
                  <p style={{ margin: 0 }}>{formatDateTime(record.timestamp)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {history.length >= limit && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
          <button
            type="button"
            style={{
              width: '100%',
              fontSize: 14,
              color: 'var(--brand)',
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}
