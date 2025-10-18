'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, MapPin, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Product, Service, Address } from '@/types';
import { getProductById } from '@/lib/services/productService';
import { getServiceById } from '@/lib/services/serviceService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TIME_SLOTS } from '@/lib/utils/constants';
import { formatCurrency } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function OrderDetailsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  useEffect(() => {
    loadOrderData();
  }, []);

  const loadOrderData = async () => {
    try {
      setLoading(true);

      // Get order data from sessionStorage
      const orderDataStr = sessionStorage.getItem('orderData');
      if (!orderDataStr) {
        toast.error('No order data found');
        router.push('/customer');
        return;
      }

      const orderData = JSON.parse(orderDataStr);

      // Load product and service
      const [productData, serviceData] = await Promise.all([
        getProductById(orderData.productId),
        getServiceById(orderData.serviceId),
      ]);

      if (!productData || !serviceData) {
        toast.error('Product or service not found');
        router.push('/customer');
        return;
      }

      setProduct(productData);
      setService(serviceData);

      // Load customer addresses
      if (user) {
        const customerDoc = await getDoc(doc(db, 'customers', user.uid));
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          setAddresses(customerData.addresses || []);
          
          // Pre-select default address
          const defaultAddress = customerData.addresses?.find((a: Address) => a.isDefault);
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id);
          }
        }
      }
    } catch (error: any) {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedAddressId) {
      toast.error('Please select an address');
      return;
    }

    if (!installationDate) {
      toast.error('Please select installation date');
      return;
    }

    if (!timeSlot) {
      toast.error('Please select time slot');
      return;
    }

    // Store in sessionStorage
    const orderData = JSON.parse(sessionStorage.getItem('orderData') || '{}');
    sessionStorage.setItem('orderData', JSON.stringify({
      ...orderData,
      addressId: selectedAddressId,
      installationDate,
      timeSlot,
    }));

    router.push('/customer/order/photos');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!product || !service) return null;

  const lang = userData?.preferredLanguage || 'en';
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  // Get minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

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
            Back
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div className="w-16 h-1 bg-success"></div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div className="w-16 h-1 bg-border"></div>
            <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center text-sm font-bold text-text-tertiary">
              3
            </div>
            <div className="w-16 h-1 bg-border"></div>
            <div className="w-8 h-8 rounded-full bg-surface border-2 border-border flex items-center justify-center text-sm font-bold text-text-tertiary">
              4
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Installation Details</h1>
            <p className="text-text-secondary">When and where should we install?</p>
          </div>

          {/* Order Summary */}
          <div className="apple-card">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Product</span>
                <span className="font-medium">{product.name[lang]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Service</span>
                <span className="font-medium">{service.name[lang]}</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(product.basePrice + service.price, product.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Select Address */}
          <div className="apple-card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Installation Address</h2>
            </div>

            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`w-full p-4 rounded-apple text-left transition-all ${
                      selectedAddressId === address.id
                        ? 'bg-primary text-white shadow-apple'
                        : 'bg-surface hover:bg-surface-elevated border border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-white/20">
                            {address.label}
                          </span>
                          {address.isDefault && (
                            <span className="text-xs px-2 py-0.5 rounded bg-success/20 text-success">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="font-medium mb-1">{address.street}</p>
                        <p className={`text-sm ${
                          selectedAddressId === address.id ? 'text-white/80' : 'text-text-secondary'
                        }`}>
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                        {address.landmark && (
                          <p className={`text-xs mt-1 ${
                            selectedAddressId === address.id ? 'text-white/60' : 'text-text-tertiary'
                          }`}>
                            📍 {address.landmark}
                          </p>
                        )}
                      </div>
                      {selectedAddressId === address.id && (
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-center py-4">
                No addresses found. Please add an address in your profile.
              </p>
            )}
          </div>

          {/* Select Date */}
          <div className="apple-card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Installation Date</h2>
            </div>

            <input
              type="date"
              value={installationDate}
              onChange={(e) => setInstallationDate(e.target.value)}
              min={minDate}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all text-lg"
            />
          </div>

          {/* Select Time Slot */}
          <div className="apple-card">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Time Slot</h2>
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

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedAddressId || !installationDate || !timeSlot}
            className="w-full px-8 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            Continue to Site Photos
          </button>
        </div>
      </div>
    </div>
  );
}

