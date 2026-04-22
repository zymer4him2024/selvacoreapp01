'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface CancelOrderModalProps {
  orderNumber: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export default function CancelOrderModal({ orderNumber, onConfirm, onClose }: CancelOrderModalProps) {
  const { t } = useTranslation();
  const o = t.orders;
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const CANCEL_REASONS = [
    { value: 'changed_mind', label: o.changedMind },
    { value: 'found_cheaper', label: o.foundCheaper },
    { value: 'no_longer_needed', label: o.noLongerNeeded },
    { value: 'wrong_product', label: o.wrongProduct },
    { value: 'other', label: o.otherReason },
  ];

  const reason = selectedReason === 'other'
    ? otherReason.trim()
    : CANCEL_REASONS.find(r => r.value === selectedReason)?.label || '';

  const canSubmit = selectedReason && (selectedReason !== 'other' || otherReason.trim().length > 0);

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setProcessing(true);
    try {
      await onConfirm(reason);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-apple-lg animate-scale-in overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-error" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{o.cancelOrderTitle}</h2>
                <p className="text-sm text-text-secondary">{orderNumber}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-elevated rounded-apple transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-text-secondary mb-4">
            {o.cancelRefundNotice}
          </p>

          <div className="space-y-2 mb-4">
            {CANCEL_REASONS.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-3 rounded-apple border cursor-pointer transition-all ${
                  selectedReason === r.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-text-tertiary'
                }`}
              >
                <input
                  type="radio"
                  name="cancelReason"
                  value={r.value}
                  checked={selectedReason === r.value}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedReason === r.value ? 'border-primary' : 'border-text-tertiary'
                }`}>
                  {selectedReason === r.value && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-sm font-medium">{r.label}</span>
              </label>
            ))}
          </div>

          {selectedReason === 'other' && (
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder={o.describeReason}
              rows={3}
              className="w-full px-4 py-3 rounded-apple border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none mb-4"
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="flex-1 px-4 py-3 bg-surface-elevated hover:bg-border text-text-primary font-medium rounded-apple transition-all"
            >
              {o.keepOrder}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canSubmit || processing}
              className="flex-1 px-4 py-3 bg-error hover:bg-error/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-apple transition-all"
            >
              {processing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {o.cancelling}
                </div>
              ) : (
                o.cancelOrder
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
