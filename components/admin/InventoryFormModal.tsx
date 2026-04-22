'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { InventoryItem, InventoryCategory } from '@/types/inventory';

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
  const [form, setForm] = useState<InventoryFormData>({
    name: item?.name || '',
    sku: item?.sku || '',
    category: item?.category || 'part',
    description: item?.description || '',
    quantity: item?.quantity || 0,
    minQuantity: item?.minQuantity || 5,
    unitCost: item?.unitCost || 0,
    currency: item?.currency || 'BRL',
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-background rounded-apple shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">{item ? 'Edit Item' : 'Add Item'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-elevated rounded-apple transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SKU *</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => update('sku', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Supplier</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => update('supplier', e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => update('quantity', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Qty</label>
              <input
                type="number"
                min={0}
                value={form.minQuantity}
                onChange={(e) => update('minQuantity', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit Cost</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.unitCost}
                onChange={(e) => update('unitCost', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="KRW">KRW</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Storage Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder="e.g. Warehouse A - Shelf 3"
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
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
              disabled={submitting || !form.name.trim() || !form.sku.trim()}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold rounded-apple transition-all"
            >
              {submitting ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
