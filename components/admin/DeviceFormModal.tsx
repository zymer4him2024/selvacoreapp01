'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Device } from '@/types/device';
import { Product } from '@/types/product';
import { getAllProducts } from '@/lib/services/productService';
import { useTranslation } from '@/hooks/useTranslation';

interface DeviceFormModalProps {
  device?: Device | null;
  onSubmit: (data: DeviceFormData) => Promise<void>;
  onClose: () => void;
}

export interface DeviceFormData {
  qrCodeData: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerWhatsapp: string;
  productName: string;
  productVariation: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark: string;
  status: string;
  ezerIntervalDays: number;
  filters: Array<{ name: string; intervalDays: number }>;
}

export default function DeviceFormModal({ device, onSubmit, onClose }: DeviceFormModalProps) {
  const { t } = useTranslation();
  const df = t.admin.deviceForm;
  const isEdit = !!device;

  const INTERVAL_OPTIONS = [
    { label: df.threeMonths, days: 90 },
    { label: df.sixMonths, days: 180 },
    { label: df.twelveMonths, days: 365 },
  ];

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    if (!isEdit) {
      getAllProducts().then(setProducts).catch(() => {});
    }
  }, [isEdit]);

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const updates: Partial<DeviceFormData> = {
      productName: product.name.en,
    };

    if (product.maintenanceTemplate) {
      updates.ezerIntervalDays = product.maintenanceTemplate.ezerIntervalDays;
      updates.filters = product.maintenanceTemplate.filters.length > 0
        ? product.maintenanceTemplate.filters.map((f) => ({
            name: f.name,
            intervalDays: f.intervalDays,
          }))
        : [{ name: 'Sediment Filter', intervalDays: 180 }];
    }

    setForm((prev) => ({ ...prev, ...updates }));
  };

  const [form, setForm] = useState<DeviceFormData>({
    qrCodeData: device?.qrCodeData || '',
    customerName: device?.customerInfo?.name || '',
    customerEmail: device?.customerInfo?.email || '',
    customerPhone: device?.customerInfo?.phone || '',
    customerWhatsapp: device?.customerInfo?.whatsapp || '',
    productName: device?.productSnapshot?.name?.en || '',
    productVariation: device?.productSnapshot?.variation || '',
    street: device?.installationAddress?.street || '',
    city: device?.installationAddress?.city || '',
    state: device?.installationAddress?.state || '',
    postalCode: device?.installationAddress?.postalCode || '',
    country: device?.installationAddress?.country || 'Brazil',
    landmark: device?.installationAddress?.landmark || '',
    status: device?.status || 'active',
    ezerIntervalDays: 180,
    filters: [{ name: 'Sediment Filter', intervalDays: 180 }],
  });

  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof DeviceFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addFilter = () => {
    if (form.filters.length >= 2) return;
    update('filters', [...form.filters, { name: 'Carbon Filter', intervalDays: 365 }]);
  };

  const removeFilter = (index: number) => {
    update('filters', form.filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: string, value: string | number) => {
    update('filters', form.filters.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  };

  const isValid =
    form.qrCodeData.trim() &&
    form.customerName.trim() &&
    form.customerEmail.trim() &&
    form.customerPhone.trim() &&
    form.productName.trim() &&
    form.street.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.postalCode.trim() &&
    form.country.trim();

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      setSubmitting(true);
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-apple shadow-xl w-full max-w-2xl my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold">{isEdit ? df.editDevice : df.addNewDevice}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-elevated rounded-apple transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* QR Code */}
          <div>
            <label className="block text-sm font-medium mb-2">{df.qrCode} *</label>
            <input
              type="text"
              value={form.qrCodeData}
              onChange={(e) => update('qrCodeData', e.target.value)}
              placeholder={df.qrPlaceholder}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          {/* Product Template Selector (add mode only) */}
          {!isEdit && products.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">{df.selectProduct}</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              >
                <option value="">{df.noProductSelected}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.en}{p.maintenanceTemplate ? ' (has template)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Customer Info */}
          <div>
            <h3 className="font-semibold mb-3">{df.customerInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">{df.name} *</label>
                <input type="text" value={form.customerName} onChange={(e) => update('customerName', e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">{df.email} *</label>
                <input type="email" value={form.customerEmail} onChange={(e) => update('customerEmail', e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">{df.phone} *</label>
                <input type="text" value={form.customerPhone} onChange={(e) => update('customerPhone', e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">{df.whatsapp}</label>
                <input type="text" value={form.customerWhatsapp} onChange={(e) => update('customerWhatsapp', e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div>
            <h3 className="font-semibold mb-3">{df.product}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">{df.productName} *</label>
                <input type="text" value={form.productName} onChange={(e) => update('productName', e.target.value)}
                  placeholder={df.productNamePlaceholder}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">{df.variation}</label>
                <input type="text" value={form.productVariation} onChange={(e) => update('productVariation', e.target.value)}
                  placeholder={df.variationPlaceholder}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="font-semibold mb-3">{df.installationAddress}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">{df.street} *</label>
                <input type="text" value={form.street} onChange={(e) => update('street', e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">{df.city} *</label>
                  <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">{df.state} *</label>
                  <input type="text" value={form.state} onChange={(e) => update('state', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">{df.postalCode} *</label>
                  <input type="text" value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">{df.country} *</label>
                  <input type="text" value={form.country} onChange={(e) => update('country', e.target.value)}
                    className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">{df.landmark}</label>
                <input type="text" value={form.landmark} onChange={(e) => update('landmark', e.target.value)}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all" />
              </div>
            </div>
          </div>

          {/* Status (edit mode) */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium mb-2">{df.status}</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all">
                <option value="active">{df.active}</option>
                <option value="inactive">{df.inactive}</option>
                <option value="decommissioned">{df.decommissioned}</option>
              </select>
            </div>
          )}

          {/* Maintenance Schedules (add mode only) */}
          {!isEdit && (
            <>
              <div>
                <h3 className="font-semibold mb-3">{df.ezerMaintenance}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <button key={opt.days} type="button"
                      onClick={() => update('ezerIntervalDays', opt.days)}
                      className={`px-3 py-2 rounded-apple text-sm font-medium transition-all ${
                        form.ezerIntervalDays === opt.days
                          ? 'bg-primary text-white'
                          : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{df.filterReplacements}</h3>
                  {form.filters.length < 2 && (
                    <button type="button" onClick={addFilter}
                      className="flex items-center gap-1 text-sm text-primary font-medium hover:text-primary/80 transition-all">
                      <Plus className="w-4 h-4" /> {df.addFilter}
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {form.filters.map((filter, index) => (
                    <div key={index} className="p-4 bg-surface-elevated rounded-apple space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-secondary">{df.filterLabel} {index + 1}</span>
                        {form.filters.length > 1 && (
                          <button type="button" onClick={() => removeFilter(index)}
                            className="p-1 text-text-tertiary hover:text-error transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input type="text" value={filter.name}
                        onChange={(e) => updateFilter(index, 'name', e.target.value)}
                        placeholder={df.filterNamePlaceholder}
                        className="w-full px-4 py-2 bg-background border border-border rounded-apple focus:border-primary focus:outline-none transition-all text-sm" />
                      <div className="grid grid-cols-3 gap-2">
                        {INTERVAL_OPTIONS.map((opt) => (
                          <button key={opt.days} type="button"
                            onClick={() => updateFilter(index, 'intervalDays', opt.days)}
                            className={`px-3 py-2 rounded-apple text-sm font-medium transition-all ${
                              filter.intervalDays === opt.days
                                ? 'bg-primary text-white'
                                : 'bg-background text-text-secondary hover:text-text-primary'
                            }`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button onClick={onClose}
            className="px-6 py-3 text-text-secondary hover:text-text-primary font-medium rounded-apple transition-all">
            {t.common.cancel}
          </button>
          <button onClick={handleSubmit} disabled={!isValid || submitting}
            className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold rounded-apple transition-all">
            {submitting ? t.common.saving : isEdit ? df.saveChanges : df.createDevice}
          </button>
        </div>
      </div>
    </div>
  );
}
