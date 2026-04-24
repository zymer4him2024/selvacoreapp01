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
  Pencil,
  X,
  Info,
  Wrench,
  Droplet,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Product, Service, Address } from '@/types';
import { getProductById } from '@/lib/services/productService';
import { getServiceById } from '@/lib/services/serviceService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TIME_SLOTS } from '@/lib/utils/constants';
import { formatCurrency } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import { getFallbackAddresses, saveFallbackAddress } from '@/lib/services/fallbackAddressService';
import AddressAutocompleteField from '@/components/common/AddressAutocompleteField';
import toast from 'react-hot-toast';

type AddressForm = Omit<Address, 'id'>;

const EMPTY_ADDRESS_FORM: AddressForm = {
  label: 'home',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  landmark: '',
  isDefault: true,
};

export default function OrderDetailsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();

  const [product, setProduct] = useState<Product | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [variationId, setVariationId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  // One-off address override (not saved to address book)
  const [overrideForAddressId, setOverrideForAddressId] = useState<string | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<AddressForm>(EMPTY_ADDRESS_FORM);
  const [overrideSaved, setOverrideSaved] = useState<Address | null>(null);

  // Inline address addition
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressForm>(EMPTY_ADDRESS_FORM);

  useEffect(() => {
    loadOrderData();
  }, []);

  const loadOrderData = async () => {
    try {
      setLoading(true);

      const orderDataStr = sessionStorage.getItem('orderData');
      if (!orderDataStr) {
        toast.error('No order data found');
        router.push('/customer');
        return;
      }

      const orderData = JSON.parse(orderDataStr);

      const productData = await getProductById(orderData.productId);
      if (!productData) {
        toast.error('Product not found');
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

      if (user) {
        try {
          const customerDoc = await getDoc(doc(db, 'customers', user.uid));
          if (customerDoc.exists()) {
            const firestoreAddresses: Address[] = customerDoc.data().addresses || [];
            setAddresses(firestoreAddresses);
            const defaultAddress = firestoreAddresses.find((a) => a.isDefault);
            if (defaultAddress) setSelectedAddressId(defaultAddress.id);
          } else {
            throw new Error('No customer document found');
          }
        } catch {
          const fallbackAddresses = getFallbackAddresses();
          setAddresses(fallbackAddresses);
          const defaultAddress = fallbackAddresses.find((a) => a.isDefault);
          if (defaultAddress) setSelectedAddressId(defaultAddress.id);
          if (fallbackAddresses.length === 0) {
            toast('No addresses found. Please add an address below.');
          }
        }
      }
    } catch {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.street.trim() || !newAddress.city.trim()) {
      toast.error('Please fill in street and city');
      return;
    }
    const address: Address = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      ...newAddress,
    };
    saveFallbackAddress(address);
    setAddresses((prev) => [...prev, address]);
    setSelectedAddressId(address.id);
    setShowAddAddress(false);
    setNewAddress(EMPTY_ADDRESS_FORM);
    toast.success('Address added');
  };

  const startOverride = (address: Address) => {
    setSelectedAddressId(address.id);
    setOverrideForAddressId(address.id);
    setOverrideDraft({
      label: address.label,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      landmark: address.landmark ?? '',
      isDefault: address.isDefault,
    });
    setOverrideSaved(null);
  };

  const cancelOverride = () => {
    setOverrideForAddressId(null);
    setOverrideDraft(EMPTY_ADDRESS_FORM);
    setOverrideSaved(null);
  };

  const saveOverride = () => {
    if (!overrideForAddressId) return;
    if (!overrideDraft.street.trim() || !overrideDraft.city.trim()) {
      toast.error('Please fill in street and city');
      return;
    }
    const overrideAddress: Address = {
      id: `override_${overrideForAddressId}`,
      ...overrideDraft,
    };
    setOverrideSaved(overrideAddress);
    setOverrideForAddressId(null);
    toast.success('One-off address applied for this installation');
  };

  const clearSavedOverride = () => {
    setOverrideSaved(null);
    toast('Reverted to saved address');
  };

  const handleContinue = () => {
    if (!selectedAddressId) {
      toast.error(t.orders.selectAddress);
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

    // Resolve the full address object now so downstream steps don't need to
    // hit Firestore or localStorage again. Override wins when present.
    const resolvedAddress =
      overrideSaved ?? addresses.find((a) => a.id === selectedAddressId) ?? null;
    if (!resolvedAddress) {
      toast.error(t.orders.selectAddress);
      return;
    }

    const orderData = JSON.parse(sessionStorage.getItem('orderData') || '{}');
    sessionStorage.setItem(
      'orderData',
      JSON.stringify({
        ...orderData,
        addressId: selectedAddressId,
        addressOverride: overrideSaved ?? null,
        resolvedAddress,
        installationDate,
        timeSlot,
      })
    );
    router.push('/customer/order/photos');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const lang = userData?.preferredLanguage || 'en';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const variation = product.variations?.find((v) => v.id === variationId);
  const productImage = product.images?.[0];
  const productDescription = product.description?.[lang] || '';
  const specEntries = Object.entries(product.specifications || {}).slice(0, 4);
  const total = product.basePrice + (service?.price || 0);
  const maint = product.maintenanceTemplate;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10 backdrop-blur-lg bg-surface/80">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t.orders.back}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-sm font-bold">1</div>
            <div className="w-16 h-1 bg-success" />
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">2</div>
            <div className="w-16 h-1 bg-border" />
            <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center text-sm font-bold text-text-tertiary">3</div>
            <div className="w-16 h-1 bg-border" />
            <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center text-sm font-bold text-text-tertiary">4</div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{t.orders.installationDetails}</h1>
            <p className="text-text-secondary">{t.orders.installationDetailsDesc}</p>
          </div>

          {/* Rich Order Summary */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-5">{t.orders.yourOrder}</h2>

            {/* Product block */}
            <div className="flex gap-4">
              {productImage ? (
                <div className="relative w-24 h-24 rounded-apple overflow-hidden bg-surface-elevated flex-shrink-0">
                  <Image src={productImage} alt={product.name[lang]} fill className="object-cover" sizes="96px" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-apple bg-surface-elevated flex items-center justify-center flex-shrink-0">
                  <Droplet className="w-8 h-8 text-text-tertiary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg leading-tight">{product.name[lang]}</p>
                {product.brand && <p className="text-sm text-text-secondary">{product.brand}</p>}
                {variation && (
                  <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {variation.name}
                  </span>
                )}
                <p className="mt-2 font-semibold">
                  {formatCurrency(product.basePrice, product.currency)}
                </p>
              </div>
            </div>

            {productDescription && (
              <p className="text-sm text-text-secondary mt-4 leading-relaxed">
                {productDescription}
              </p>
            )}

            {specEntries.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {specEntries.map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-border/50 pb-1">
                    <span className="text-text-secondary capitalize">{key}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {product.installationTime > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
                <Wrench className="w-4 h-4 text-primary" />
                <span>
                  {t.orders.estimatedInstallTime}: <span className="font-medium text-text-primary">{product.installationTime}h</span>
                </span>
              </div>
            )}

            {/* Service block */}
            {service && (
              <div className="mt-6 pt-5 border-t border-border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{service.name[lang]}</p>
                    <p className="text-sm text-text-secondary">{service.duration}h service · {service.category}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(service.price, service.currency)}</p>
                </div>

                {service.includes && service.includes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-wide text-text-tertiary font-semibold mb-2">{t.orders.whatsIncluded}</p>
                    <ul className="space-y-1.5">
                      {service.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Maintenance preview */}
            {maint && (maint.ezerIntervalDays > 0 || maint.filters.length > 0) && (
              <div className="mt-6 pt-5 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-primary" />
                  <p className="text-xs uppercase tracking-wide text-text-tertiary font-semibold">
                    {t.orders.maintenanceSchedule}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {maint.ezerIntervalDays > 0 && (
                    <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                      {t.orders.ezerCheck} · {t.orders.every} {maint.ezerIntervalDays}d
                    </span>
                  )}
                  {maint.filters.map((f, i) => (
                    <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-surface-elevated border border-border font-medium">
                      {f.name} · {t.orders.every} {f.intervalDays}d
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="mt-6 pt-5 border-t border-border flex justify-between items-center">
              <span className="text-lg font-semibold">{t.orders.total}</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(total, product.currency)}
              </span>
            </div>
          </div>

          {/* Installation Address */}
          <div className="apple-card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">{t.orders.installationAddress}</h2>
            </div>

            {overrideSaved && (
              <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-apple flex items-start justify-between gap-3">
                <div className="text-sm">
                  <p className="font-medium text-warning">{t.orders.usingOneOffAddress}</p>
                  <p className="text-text-secondary text-xs mt-0.5">
                    {overrideSaved.street}, {overrideSaved.city}
                    {overrideSaved.state && `, ${overrideSaved.state}`} {overrideSaved.postalCode}
                  </p>
                  <p className="text-text-tertiary text-xs mt-1">{t.orders.savedAddressNotChanged}</p>
                </div>
                <button
                  type="button"
                  onClick={clearSavedOverride}
                  className="text-xs text-warning hover:underline whitespace-nowrap"
                >
                  {t.orders.revert}
                </button>
              </div>
            )}

            {addresses.length > 0 && (
              <div className="space-y-3">
                {addresses.map((address) => {
                  const selected = selectedAddressId === address.id;
                  const editing = overrideForAddressId === address.id;
                  const hasOverride = overrideSaved?.id === `override_${address.id}` && selected;

                  return (
                    <div
                      key={address.id}
                      className={`rounded-apple transition-all ${
                        selected
                          ? 'bg-primary text-white shadow-apple'
                          : 'bg-surface hover:bg-surface-elevated border border-border'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAddressId(address.id)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                                selected ? 'bg-white/20' : 'bg-surface-elevated'
                              }`}>
                                {address.label}
                              </span>
                              {address.isDefault && (
                                <span className="text-xs px-2 py-0.5 rounded bg-success/20 text-success">
                                  Default
                                </span>
                              )}
                              {hasOverride && (
                                <span className="text-xs px-2 py-0.5 rounded bg-warning/20 text-warning">
                                  One-off override
                                </span>
                              )}
                            </div>
                            <p className="font-medium mb-1 truncate">{address.street}</p>
                            <p className={`text-sm ${selected ? 'text-white/80' : 'text-text-secondary'}`}>
                              {address.city}
                              {address.state && `, ${address.state}`} {address.postalCode}
                            </p>
                            {address.landmark && (
                              <p className={`text-xs mt-1 ${selected ? 'text-white/60' : 'text-text-tertiary'}`}>
                                📍 {address.landmark}
                              </p>
                            )}
                          </div>
                          {selected && (
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                              <Check className="w-4 h-4 text-primary" />
                            </div>
                          )}
                        </div>
                      </button>

                      {selected && !editing && (
                        <div className={`px-4 pb-3 flex ${hasOverride ? 'justify-end' : 'justify-end'}`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startOverride(address);
                            }}
                            className={`text-xs font-medium inline-flex items-center gap-1 ${
                              selected ? 'text-white/90 hover:text-white' : 'text-primary hover:text-primary-hover'
                            }`}
                          >
                            <Pencil className="w-3 h-3" />
                            {hasOverride ? t.orders.editOneOff : t.orders.useOneOff}
                          </button>
                        </div>
                      )}

                      {editing && (
                        <div className="bg-surface text-text-primary rounded-b-apple border-t border-border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{t.orders.oneOffTitle}</h4>
                            <button
                              type="button"
                              onClick={cancelOverride}
                              className="text-text-tertiary hover:text-text-primary"
                              aria-label="Close"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-text-secondary">
                            {t.orders.oneOffDesc}
                          </p>

                          <AddressAutocompleteField
                            value={overrideDraft}
                            onChange={setOverrideDraft}
                            showLabel={false}
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={saveOverride}
                              className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-apple"
                            >
                              {t.orders.applyForInstallation}
                            </button>
                            <button
                              type="button"
                              onClick={cancelOverride}
                              className="px-4 py-2 bg-surface border border-border text-sm font-semibold rounded-apple hover:bg-surface-elevated"
                            >
                              {t.common.cancel}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new saved address */}
            <div className="mt-4">
              {!showAddAddress ? (
                <button
                  type="button"
                  onClick={() => setShowAddAddress(true)}
                  className="w-full px-4 py-3 bg-surface hover:bg-surface-elevated border border-dashed border-border text-text-primary font-medium rounded-apple transition-all"
                >
                  {t.orders.addNewAddress}
                </button>
              ) : (
                <div className="space-y-3 p-4 bg-surface-elevated rounded-apple border border-border">
                  <h3 className="font-semibold">{t.orders.addSavedAddress}</h3>

                  <AddressAutocompleteField
                    value={newAddress}
                    onChange={setNewAddress}
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddAddress}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-apple"
                    >
                      {t.orders.saveAddress}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddAddress(false);
                        setNewAddress(EMPTY_ADDRESS_FORM);
                      }}
                      className="px-4 py-2 bg-surface border border-border text-sm font-semibold rounded-apple hover:bg-surface-elevated"
                    >
                      {t.common.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="apple-card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">{t.orders.installationDate}</h2>
            </div>
            <input
              type="date"
              value={installationDate}
              onChange={(e) => setInstallationDate(e.target.value)}
              min={minDate}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all text-lg"
            />
          </div>

          {/* Time Slot */}
          <div className="apple-card">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">{t.orders.timeSlot}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => setTimeSlot(slot.value)}
                  className={`p-4 rounded-apple font-medium transition-all ${
                    timeSlot === slot.value
                      ? 'bg-primary text-white shadow-apple'
                      : 'bg-surface hover:bg-surface-elevated border border-border'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          {/* Continue */}
          <button
            onClick={handleContinue}
            disabled={!selectedAddressId || !installationDate || !timeSlot}
            className="w-full px-8 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            {t.orders.continueToPhotos}
          </button>
        </div>
      </div>
    </div>
  );
}
