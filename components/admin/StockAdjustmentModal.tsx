'use client';

import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { InventoryItem, AdjustmentType } from '@/types/inventory';

const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string; color: string }[] = [
  { value: 'restock', label: 'Restock', color: 'text-success' },
  { value: 'used', label: 'Used', color: 'text-warning' },
  { value: 'adjustment', label: 'Adjustment', color: 'text-primary' },
  { value: 'returned', label: 'Returned', color: 'text-primary' },
];

interface StockAdjustmentModalProps {
  item: InventoryItem;
  onSubmit: (type: AdjustmentType, quantity: number, reason: string) => Promise<void>;
  onClose: () => void;
}

export default function StockAdjustmentModal({ item, onSubmit, onClose }: StockAdjustmentModalProps) {
  const [type, setType] = useState<AdjustmentType>('restock');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const delta = type === 'used' ? -Math.abs(quantity) : Math.abs(quantity);
  const newQuantity = Math.max(0, item.quantity + delta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    try {
      setSubmitting(true);
      await onSubmit(type, quantity, reason);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-apple shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold">Adjust Stock</h2>
            <p className="text-sm text-text-secondary">{item.name} ({item.sku})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-elevated rounded-apple transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ADJUSTMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`px-4 py-2.5 rounded-apple text-sm font-medium transition-all border ${
                    type === t.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-elevated text-text-secondary border-border hover:border-primary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {/* Preview */}
          <div className="flex items-center justify-center gap-3 p-4 bg-surface-elevated rounded-apple">
            <div className="text-center">
              <p className="text-xs text-text-tertiary">Current</p>
              <p className="text-2xl font-bold">{item.quantity}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-text-tertiary" />
            <div className="text-center">
              <p className="text-xs text-text-tertiary">New</p>
              <p className={`text-2xl font-bold ${
                newQuantity <= 0 ? 'text-error' :
                newQuantity <= item.minQuantity ? 'text-warning' :
                'text-success'
              }`}>{newQuantity}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this adjustment being made?"
              rows={2}
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 text-text-secondary hover:text-text-primary font-medium rounded-apple transition-all border border-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || quantity <= 0}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold rounded-apple transition-all"
            >
              {submitting ? 'Adjusting...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
