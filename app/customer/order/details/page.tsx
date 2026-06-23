'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Check,
  Info,
  Wrench,
  Droplet,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Product, Service, Address } from '@/types';
import { getProductById } from '@/lib/services/productService';
import { getServiceById } from '@/lib/services/serviceService';
import { TIME_SLOTS } from '@/lib/utils/constants';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useTranslation } from '@/hooks/useTranslation';
import AddressAutocompleteField from '@/components/common/AddressAutocompleteField';
import OrderProgressTracker from '@/components/customer/OrderProgressTracker';
import toast from 'react-hot-toast';

type AddressForm = Omit<Address, 'id'>;

const EMPTY_ADDRESS_FORM: AddressForm = {
  label: 'home',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  landmark: '',
  isDefault: false,
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
  const o = t.orders;

  const [product, setProduct] = useState<Product | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [variationId, setVariationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Installation address is entered fresh for each order (no saved address book).
  const [installAddress, setInstallAddress] = useState<AddressForm>(EMPTY_ADDRESS_FORM);
  const [installationDate, setInstallationDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  useEffect(() => {
    loadOrderData();
  }, []);

  const loadOrderData = async () => {
    try {
      setLoading(true);

      const orderDataStr = sessionStorage.getItem('orderData');
      if (!orderDataStr) {
        toast.error(o.noOrderData);
        router.push('/customer');
        return;
      }

      const orderData = JSON.parse(orderDataStr);

      const productData = await getProductById(orderData.productId);
      if (!productData) {
        toast.error(o.productNotFound);
        router.push('/customer');
        return;
      }
      setProduct(productData);
      setVariationId(orderData.variationId ?? null);

      if (orderData.serviceId) {
        try {
          const serviceData = await getServiceById(orderData.serviceId);
          setService(serviceData);
        } catch {
          setService(null);
        }
      }
    } catch {
      toast.error(o.loadOrderDetailsError);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!installAddress.street.trim() || !installAddress.city.trim()) {
      toast.error(o.streetCityRequired);
      return;
    }
    if (!installationDate) {
      toast.error(t.orders.selectDate);
      return;
    }
    if (!timeSlot) {
      toast.error(t.orders.selectTimeSlot);
      return;
    }

    // The installation address is entered fresh each order; resolve it now so
    // downstream steps don't need another lookup.
    const resolvedAddress: Address = {
      id: `install_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      ...installAddress,
    };

    const orderData = JSON.parse(sessionStorage.getItem('orderData') || '{}');
    sessionStorage.setItem(
      'orderData',
      JSON.stringify({
        ...orderData,
        addressId: resolvedAddress.id,
        addressOverride: null,
        resolvedAddress,
        installationDate,
        timeSlot,
      })
    );
    router.push('/customer/order/photos');
  };

  if (loading) {
    return (
      <div className="sc">
        <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
      </div>
    );
  }

  if (!product) return null;

  const lang = userData?.preferredLanguage || 'en';
  // Earliest selectable install date is tomorrow, in the user's LOCAL timezone.
  // toISOString() returns UTC, which rolls over a day early for users behind UTC.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  const minDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

  const variation = product.variations?.find((v) => v.id === variationId);
  const productImage = product.images?.[0];
  const productDescription = product.description?.[lang] || '';
  const specEntries = Object.entries(product.specifications || {}).slice(0, 4);
  const total = product.basePrice + (service?.price || 0);
  const maint = product.maintenanceTemplate;

  return (
    <div className="sc">
      <header className="sc-nav">
        <div className="sc-nav-inner">
          <button
            type="button"
            onClick={() => router.back()}
            className="sc-nav-link"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="sc-nav-text">{t.orders.back}</span>
          </button>
        </div>
      </header>

      <main className="sc-main" style={{ maxWidth: 720 }}>
        <div className="sc-stack-lg">
          <OrderProgressTracker currentStep={2} />

          <div style={{ textAlign: 'center' }}>
            <h1 className="sc-h1">{t.orders.installationDetails}</h1>
            <p className="sc-lede">{t.orders.installationDetailsDesc}</p>
          </div>

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 20 }}>{t.orders.yourOrder}</h2>

            <div className="sc-row" style={{ gap: 16, alignItems: 'flex-start' }}>
              {productImage ? (
                <div style={{ position: 'relative', width: 96, height: 96, borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--off-paper)', flexShrink: 0 }}>
                  <Image src={productImage} alt={product.name[lang]} fill className="object-cover" sizes="96px" />
                </div>
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: 'var(--radius-sm)', background: 'var(--off-paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Droplet className="w-8 h-8" style={{ color: 'var(--soft)' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 18, lineHeight: 1.2, margin: 0 }}>{product.name[lang]}</p>
                {product.brand && <p className="sc-helper" style={{ margin: '4px 0 0' }}>{product.brand}</p>}
                {variation && (
                  <span className="sc-badge-inline" style={{ marginTop: 8, color: 'var(--brand)', background: 'var(--brand-tint)' }}>
                    {variation.name}
                  </span>
                )}
                <p style={{ marginTop: 8, fontWeight: 600 }}>
                  {formatCurrency(product.basePrice, product.currency)}
                </p>
              </div>
            </div>

            {productDescription && (
              <p className="sc-helper" style={{ marginTop: 16, lineHeight: 1.6 }}>
                {productDescription}
              </p>
            )}

            {specEntries.length > 0 && (
              <div className="grid grid-cols-2" style={{ marginTop: 16, columnGap: 24, rowGap: 8, fontSize: 14 }}>
                {specEntries.map(([key, value]) => (
                  <div key={key} className="sc-row-between" style={{ borderBottom: '1px solid var(--hairline)', paddingBottom: 4 }}>
                    <span style={{ color: 'var(--soft)', textTransform: 'capitalize' }}>{key}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {product.installationTime > 0 && (
              <div className="sc-row" style={{ marginTop: 16, gap: 8, fontSize: 14, color: 'var(--soft)' }}>
                <Wrench className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                <span>
                  {t.orders.estimatedInstallTime}: <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{product.installationTime}h</span>
                </span>
              </div>
            )}

            {service && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--hairline)' }}>
                <div className="sc-row-between" style={{ alignItems: 'flex-start', gap: 16 }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}>{service.name[lang]}</p>
                    <p className="sc-helper" style={{ margin: '4px 0 0' }}>{service.duration}h service · {service.category}</p>
                  </div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{formatCurrency(service.price, service.currency)}</p>
                </div>

                {service.includes && service.includes.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p className="sc-eyebrow" style={{ marginBottom: 8 }}>{t.orders.whatsIncluded}</p>
                    <ul className="sc-stack" style={{ gap: 6, padding: 0, margin: 0, listStyle: 'none' }}>
                      {service.includes.map((item, i) => (
                        <li key={i} className="sc-row" style={{ gap: 8, alignItems: 'flex-start', fontSize: 14 }}>
                          <Check className="w-4 h-4 flex-shrink-0" style={{ marginTop: 2, color: 'var(--brand)' }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {maint && (maint.ezerIntervalDays > 0 || maint.filters.length > 0) && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--hairline)' }}>
                <div className="sc-row" style={{ gap: 8, marginBottom: 12 }}>
                  <Info className="w-4 h-4" style={{ color: 'var(--brand)' }} />
                  <p className="sc-eyebrow" style={{ margin: 0 }}>{t.orders.maintenanceSchedule}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {maint.ezerIntervalDays > 0 && (
                    <span className="sc-badge-inline" style={{ color: 'var(--brand)', background: 'var(--brand-tint)' }}>
                      {t.orders.ezerCheck} · {t.orders.every} {maint.ezerIntervalDays}d
                    </span>
                  )}
                  {maint.filters.map((f, i) => (
                    <span key={i} className="sc-badge-inline" style={{ background: 'var(--off-paper)', border: '1px solid var(--hairline)' }}>
                      {f.name} · {t.orders.every} {f.intervalDays}d
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="sc-row-between" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--hairline)' }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{t.orders.total}</span>
              <span className="sc-price" style={{ fontSize: 24 }}>
                {formatCurrency(total, product.currency)}
              </span>
            </div>
          </div>

          <div className="sc-card-static">
            <div className="sc-row" style={{ gap: 8, marginBottom: 16 }}>
              <MapPin className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              <h2 className="sc-h2" style={{ margin: 0 }}>{t.orders.installationAddress}</h2>
            </div>

            <AddressAutocompleteField
              value={installAddress}
              onChange={setInstallAddress}
              showLabel={false}
            />
          </div>

          <div className="sc-card-static">
            <div className="sc-row" style={{ gap: 8, marginBottom: 16 }}>
              <Calendar className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              <h2 className="sc-h2" style={{ margin: 0 }}>{t.orders.installationDate}</h2>
            </div>
            <input
              type="date"
              value={installationDate}
              onChange={(e) => setInstallationDate(e.target.value)}
              min={minDate}
              className="sc-input"
              style={{ fontSize: 16 }}
            />
          </div>

          <div className="sc-card-static">
            <div className="sc-row" style={{ gap: 8, marginBottom: 16 }}>
              <Clock className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              <h2 className="sc-h2" style={{ margin: 0 }}>{t.orders.timeSlot}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIME_SLOTS.map((slot) => {
                const active = timeSlot === slot.value;
                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setTimeSlot(slot.value)}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      background: active ? 'var(--brand-tint)' : 'var(--paper)',
                      color: active ? 'var(--brand)' : 'var(--ink)',
                      border: active ? '2px solid var(--brand)' : '1px solid var(--hairline)',
                      cursor: 'pointer',
                      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!installAddress.street.trim() || !installAddress.city.trim() || !installationDate || !timeSlot}
            className="sc-cta"
            style={{ width: '100%', padding: '14px 24px', fontSize: 15 }}
          >
            {t.orders.continueToPhotos}
          </button>
        </div>
      </main>
    </div>
  );
}
