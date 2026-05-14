'use client';

import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { InventoryItem, AdjustmentType } from '@/types/inventory';
import { useTranslation } from '@/hooks/useTranslation';

const ADJUSTMENT_TYPES: { value: AdjustmentType; label: string }[] = [
  { value: 'restock', label: 'Restock' },
  { value: 'used', label: 'Used' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'returned', label: 'Returned' },
];

interface StockAdjustmentModalProps {
  item: InventoryItem;
  onSubmit: (type: AdjustmentType, quantity: number, reason: string) => Promise<void>;
  onClose: () => void;
}

export default function StockAdjustmentModal({ item, onSubmit, onClose }: StockAdjustmentModalProps) {
  const { t: tr } = useTranslation();
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

  const newQtyColor =
    newQuantity <= 0 ? '#ef4444' :
    newQuantity <= item.minQuantity ? 'var(--warn)' :
    'var(--brand)';

  return (
    <div
      className="sc"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="sc-card-static"
        style={{ width: '100%', maxWidth: 448, padding: 0, background: 'var(--paper)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 24,
            borderBottom: '1px solid var(--hairline)',
            gap: 12,
          }}
        >
          <div>
            <h2 className="sc-h2" style={{ margin: 0 }}>{tr.components.stockAdjustment.adjustStock}</h2>
            <p className="sc-helper" style={{ margin: '2px 0 0' }}>{item.name} ({item.sku})</p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 8,
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--soft)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="sc-label" style={{ marginBottom: 8 }}>Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {ADJUSTMENT_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 13,
                      fontWeight: 500,
                      border: `1px solid ${active ? 'var(--brand)' : 'var(--hairline)'}`,
                      background: active ? 'var(--brand)' : 'var(--off-paper)',
                      color: active ? '#fff' : 'var(--soft)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="sc-label">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="sc-input"
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 16,
              background: 'var(--off-paper)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p className="sc-helper" style={{ fontSize: 11, margin: 0 }}>Current</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{item.quantity}</p>
            </div>
            <ArrowRight size={20} color="var(--soft)" />
            <div style={{ textAlign: 'center' }}>
              <p className="sc-helper" style={{ fontSize: 11, margin: 0 }}>New</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: newQtyColor, margin: 0 }}>{newQuantity}</p>
            </div>
          </div>

          <div>
            <label className="sc-label">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tr.components.stockAdjustment.reasonPlaceholder}
              rows={2}
              className="sc-textarea"
            />
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button type="button" onClick={onClose} className="sc-cta-ghost" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || quantity <= 0}
              className="sc-cta"
              style={{ flex: 1 }}
            >
              {submitting ? 'Adjusting...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
