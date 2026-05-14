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

const intervalBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  fontWeight: 500,
  border: `1px solid ${active ? 'var(--brand)' : 'var(--hairline)'}`,
  background: active ? 'var(--brand)' : 'var(--off-paper)',
  color: active ? '#fff' : 'var(--soft)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

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
    <div
      className="sc"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 16,
        overflowY: 'auto',
      }}
    >
      <div
        className="sc-card-static"
        style={{ width: '100%', maxWidth: 640, marginTop: 32, marginBottom: 32, padding: 0, background: 'var(--paper)' }}
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
          <h2 className="sc-h2" style={{ margin: 0 }}>{isEdit ? df.editDevice : df.addNewDevice}</h2>
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

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxHeight: '70vh', overflowY: 'auto' }}>
          <div>
            <label className="sc-label">{df.qrCode} *</label>
            <input
              type="text"
              value={form.qrCodeData}
              onChange={(e) => update('qrCodeData', e.target.value)}
              placeholder={df.qrPlaceholder}
              className="sc-input"
            />
          </div>

          {!isEdit && products.length > 0 && (
            <div>
              <label className="sc-label">{df.selectProduct}</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="sc-select"
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

          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>{df.customerInfo}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label className="sc-label">{df.name} *</label>
                <input type="text" value={form.customerName} onChange={(e) => update('customerName', e.target.value)} className="sc-input" />
              </div>
              <div>
                <label className="sc-label">{df.email} *</label>
                <input type="email" value={form.customerEmail} onChange={(e) => update('customerEmail', e.target.value)} className="sc-input" />
              </div>
              <div>
                <label className="sc-label">{df.phone} *</label>
                <input type="text" value={form.customerPhone} onChange={(e) => update('customerPhone', e.target.value)} className="sc-input" />
              </div>
              <div>
                <label className="sc-label">{df.whatsapp}</label>
                <input type="text" value={form.customerWhatsapp} onChange={(e) => update('customerWhatsapp', e.target.value)} className="sc-input" />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>{df.product}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label className="sc-label">{df.productName} *</label>
                <input type="text" value={form.productName} onChange={(e) => update('productName', e.target.value)} placeholder={df.productNamePlaceholder} className="sc-input" />
              </div>
              <div>
                <label className="sc-label">{df.variation}</label>
                <input type="text" value={form.productVariation} onChange={(e) => update('productVariation', e.target.value)} placeholder={df.variationPlaceholder} className="sc-input" />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>{df.installationAddress}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="sc-label">{df.street} *</label>
                <input type="text" value={form.street} onChange={(e) => update('street', e.target.value)} className="sc-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label className="sc-label">{df.city} *</label>
                  <input type="text" value={form.city} onChange={(e) => update('city', e.target.value)} className="sc-input" />
                </div>
                <div>
                  <label className="sc-label">{df.state} *</label>
                  <input type="text" value={form.state} onChange={(e) => update('state', e.target.value)} className="sc-input" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <label className="sc-label">{df.postalCode} *</label>
                  <input type="text" value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} className="sc-input" />
                </div>
                <div>
                  <label className="sc-label">{df.country} *</label>
                  <input type="text" value={form.country} onChange={(e) => update('country', e.target.value)} className="sc-input" />
                </div>
              </div>
              <div>
                <label className="sc-label">{df.landmark}</label>
                <input type="text" value={form.landmark} onChange={(e) => update('landmark', e.target.value)} className="sc-input" />
              </div>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="sc-label">{df.status}</label>
              <select value={form.status} onChange={(e) => update('status', e.target.value)} className="sc-select">
                <option value="active">{df.active}</option>
                <option value="inactive">{df.inactive}</option>
                <option value="decommissioned">{df.decommissioned}</option>
              </select>
            </div>
          )}

          {!isEdit && (
            <>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>{df.ezerMaintenance}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => update('ezerIntervalDays', opt.days)}
                      style={intervalBtnStyle(form.ezerIntervalDays === opt.days)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{df.filterReplacements}</h3>
                  {form.filters.length < 2 && (
                    <button
                      type="button"
                      onClick={addFilter}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 13,
                        color: 'var(--brand)',
                        fontWeight: 600,
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={16} /> {df.addFilter}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {form.filters.map((filter, index) => (
                    <div
                      key={index}
                      style={{
                        padding: 16,
                        background: 'var(--off-paper)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--soft)' }}>{df.filterLabel} {index + 1}</span>
                        {form.filters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFilter(index)}
                            style={{
                              padding: 4,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--soft)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--soft)'; }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={filter.name}
                        onChange={(e) => updateFilter(index, 'name', e.target.value)}
                        placeholder={df.filterNamePlaceholder}
                        className="sc-input"
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {INTERVAL_OPTIONS.map((opt) => (
                          <button
                            key={opt.days}
                            type="button"
                            onClick={() => updateFilter(index, 'intervalDays', opt.days)}
                            style={intervalBtnStyle(filter.intervalDays === opt.days)}
                          >
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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 12,
            padding: 24,
            borderTop: '1px solid var(--hairline)',
          }}
        >
          <button onClick={onClose} className="sc-cta-ghost">
            {t.common.cancel}
          </button>
          <button onClick={handleSubmit} disabled={!isValid || submitting} className="sc-cta">
            {submitting ? t.common.saving : isEdit ? df.saveChanges : df.createDevice}
          </button>
        </div>
      </div>
    </div>
  );
}
