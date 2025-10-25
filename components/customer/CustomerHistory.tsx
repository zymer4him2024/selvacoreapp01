'use client';

import { useState, useEffect } from 'react';
import { Clock, CreditCard, Package, CheckCircle, XCircle } from 'lucide-react';
import { CustomerHistoryRecord, getCustomerHistory } from '@/lib/services/customerHistoryService';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';

interface CustomerHistoryProps {
  customerId: string;
  limit?: number;
}

export default function CustomerHistory({ customerId, limit = 5 }: CustomerHistoryProps) {
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
    } catch (error) {
      console.error('Failed to load customer history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHistoryIcon = (type: CustomerHistoryRecord['type']) => {
    switch (type) {
      case 'payment_made':
        return <CreditCard className="w-4 h-4 text-success" />;
      case 'order_placed':
        return <Package className="w-4 h-4 text-primary" />;
      case 'service_completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'order_cancelled':
        return <XCircle className="w-4 h-4 text-error" />;
      default:
        return <Clock className="w-4 h-4 text-text-tertiary" />;
    }
  };

  const getHistoryColor = (type: CustomerHistoryRecord['type']) => {
    switch (type) {
      case 'payment_made':
        return 'text-success';
      case 'order_placed':
        return 'text-primary';
      case 'service_completed':
        return 'text-success';
      case 'order_cancelled':
        return 'text-error';
      default:
        return 'text-text-secondary';
    }
  };

  if (loading) {
    return (
      <div className="apple-card">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-4 h-4 bg-surface-elevated rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-surface-elevated rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-surface-elevated rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="apple-card">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="apple-card">
      <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
      
      <div className="space-y-4">
        {history.map((record) => (
          <div key={record.id} className="flex items-start gap-3 p-3 bg-surface-elevated rounded-apple">
            <div className="flex-shrink-0 mt-1">
              {getHistoryIcon(record.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`font-medium ${getHistoryColor(record.type)}`}>
                    {record.title}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    {record.description}
                  </p>
                  
                  {record.amount && (
                    <p className="text-sm font-semibold text-success mt-1">
                      {formatCurrency(record.amount, record.currency || 'USD')}
                    </p>
                  )}
                </div>
                
                <div className="text-right text-xs text-text-tertiary ml-4">
                  <p>{formatDateTime(record.timestamp)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {history.length >= limit && (
        <div className="mt-4 pt-4 border-t border-border">
          <button className="w-full text-sm text-primary hover:text-primary-hover font-medium">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}
