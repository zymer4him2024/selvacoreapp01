'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { InventoryItem, InventoryCategory } from '@/types/inventory';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';

const CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'filter', label: 'Filter' },
  { value: 'part', label: 'Part' },
  { value: 'tool', label: 'Tool' },
  { value: 'supply', label: 'Supply' },
  { value: 'equipment', label: 'Equipment' },
];

interface InventoryFormModalProps {
  item: InventoryItem | null;
  onSubmit: (data: InventoryFormData) => Promise<void>;
  onClose: () => void;
}

export interface InventoryFormData {
  name: string;
  sku: string;
  category: InventoryCategory;
  description: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  currency: string;
  supplier: string;
  location: string;
  notes: string;
}

export default function InventoryFormModal({ item, onSubmit, onClose }: InventoryFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<InventoryFormData>({
    name: item?.name || '',
    sku: item?.sku || '',
    category: item?.category || 'part',
    description: item?.description || '',
    quantity: item?.quantity || 0,
    minQuantity: item?.minQuantity || 5,
    unitCost: item?.unitCost || 0,
    currency: item?.currency || DEFAULT_CURRENCY,
    supplier: item?.supplier || '',
    location: item?.location || '',
    notes: item?.notes || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) return;

    try {
      setSubmitting(true);
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: keyof InventoryFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 0,
          background: 'var(--paper)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 24,
            borderBottom: '1px solid var(--hairline)',
          }}
        >
          <h2 className="sc-h2" style={{ margin: 0 }}>{item ? 'Edit Item' : 'Add Item'}</h2>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label className="sc-label">{t.components.inventoryForm.name} *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
                className="sc-input"
              />
            </div>
            <div>
              <label className="sc-label">SKU *</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => update('sku', e.target.value)}
                required
                className="sc-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div>
              <label className="sc-label">Category</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="sc-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="sc-label">Supplier</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => update('supplier', e.target.value)}
                className="sc-input"
              />
            </div>
          </div>

          <div>
            <label className="sc-label">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
              className="sc-textarea"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
            <div>
              <label className="sc-label">Quantity</label>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => update('quantity', parseInt(e.target.value) || 0)}
                className="sc-input"
              />
            </div>
            <div>
              <label className="sc-label">{t.components.inventoryForm.minQty}</label>
              <input
                type="number"
                min={0}
                value={form.minQuantity}
                onChange={(e) => update('minQuantity', parseInt(e.target.value) || 0)}
                className="sc-input"
              />
            </div>
            <div>
              <label className="sc-label">{t.components.inventoryForm.unitCost}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.unitCost}
                onChange={(e) => update('unitCost', parseFloat(e.target.value) || 0)}
                className="sc-input"
              />
            </div>
            <div>
              <label className="sc-label">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className="sc-select"
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="KRW">KRW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="sc-label">{t.components.inventoryForm.storageLocation}</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder={t.components.inventoryForm.storagePlaceholder}
              className="sc-input"
            />
          </div>

          <div>
            <label className="sc-label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              className="sc-textarea"
            />
          </div>

          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              className="sc-cta-ghost"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.name.trim() || !form.sku.trim()}
              className="sc-cta"
              style={{ flex: 1 }}
            >
              {submitting ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
