'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Receipt, Filter } from 'lucide-react';
import { Transaction } from '@/types';
import { getAllTransactions } from '@/lib/services/transactionService';
import { formatDateTime, formatCurrency } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getAllTransactions(200);
      setTransactions(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    if (type.includes('payment') || type.includes('completed')) return 'text-success';
    if (type.includes('cancelled') || type.includes('refund')) return 'text-error';
    if (type.includes('accepted') || type.includes('created')) return 'text-primary';
    return 'text-text-secondary';
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('payment')) return '💰';
    if (type.includes('order')) return '📦';
    if (type.includes('product')) return '🎁';
    if (type.includes('service')) return '🔧';
    if (type.includes('refund')) return '💸';
    return '📋';
  };

  const filteredTransactions = transactions.filter((tx) =>
    typeFilter === 'all' || tx.type === typeFilter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Transaction Log</h1>
        <p className="text-text-secondary">
          Complete audit trail of all system activities
        </p>
      </div>

      {/* Filters */}
      <div className="apple-card">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-text-tertiary" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex-1 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
          >
            <option value="all">All Transaction Types</option>
            <option value="order_created">Order Created</option>
            <option value="payment_received">Payment Received</option>
            <option value="order_accepted">Order Accepted</option>
            <option value="order_completed">Order Completed</option>
            <option value="order_cancelled">Order Cancelled</option>
            <option value="refund_issued">Refund Issued</option>
            <option value="product_created">Product Created</option>
            <option value="service_created">Service Created</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="apple-card text-center py-16">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">No transactions found</h3>
          <p className="text-text-secondary">
            {typeFilter !== 'all' ? 'Try a different filter' : 'Transactions will appear here'}
          </p>
        </div>
      ) : (
        <div className="apple-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    Performed By
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-surface transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getTypeIcon(tx.type)}</span>
                        <span className={`text-sm font-medium ${getTypeColor(tx.type)}`}>
                          {tx.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {tx.orderNumber ? (
                        <Link
                          href={`/admin/orders/${tx.orderId}`}
                          className="text-primary hover:underline text-sm"
                        >
                          {tx.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-text-tertiary text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {tx.amount ? (
                        <span className="font-semibold">
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      ) : (
                        <span className="text-text-tertiary text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm">{tx.performedByRole}</p>
                        <p className="text-xs text-text-tertiary truncate max-w-[150px]">
                          {tx.performedBy}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-text-secondary">
                        {formatDateTime(tx.timestamp)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-center text-sm text-text-tertiary">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
        </div>
      )}
    </div>
  );
}

