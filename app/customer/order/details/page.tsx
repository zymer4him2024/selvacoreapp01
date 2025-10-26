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
import { useTranslation } from '@/hooks/useTranslation';
import { getFallbackAddresses, saveFallbackAddress } from '@/lib/services/fallbackAddressService';
import toast from 'react-hot-toast';

export default function OrderDetailsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  
  // Inline address addition
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'home' as 'home' | 'office' | 'other',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    landmark: '',
    isDefault: true
  });

  useEffect(() => {
    loadOrderData();
  }, []);

  const loadOrderData = async () => {
    try {
      setLoading(true);
      console.log('🔍 ORDER DETAILS DEBUG - Starting to load order data...');

      // Get order data from sessionStorage
      const orderDataStr = sessionStorage.getItem('orderData');
      console.log('🔍 ORDER DETAILS DEBUG - Order data from session:', orderDataStr);
      
      if (!orderDataStr) {
        console.error('❌ ORDER DETAILS DEBUG - No order data found in session');
        toast.error('No order data found');
        router.push('/customer');
        return;
      }

      const orderData = JSON.parse(orderDataStr);
      console.log('🔍 ORDER DETAILS DEBUG - Parsed order data:', orderData);

      // Load product (service is optional)
      console.log('🔍 ORDER DETAILS DEBUG - Loading product with ID:', orderData.productId);
      const productData = await getProductById(orderData.productId);
      console.log('🔍 ORDER DETAILS DEBUG - Product data loaded:', productData);
      
      if (!productData) {
        console.error('❌ ORDER DETAILS DEBUG - Product not found');
        toast.error('Product not found');
        router.push('/customer');
        return;
      }

      setProduct(productData);
      
      // Load service only if serviceId exists
      if (orderData.serviceId) {
        console.log('🔍 ORDER DETAILS DEBUG - Loading service with ID:', orderData.serviceId);
        try {
          const serviceData = await getServiceById(orderData.serviceId);
          console.log('🔍 ORDER DETAILS DEBUG - Service data loaded:', serviceData);
          setService(serviceData);
        } catch (error) {
          console.warn('⚠️ ORDER DETAILS DEBUG - Service not found, continuing without service:', error);
          setService(null);
        }
      } else {
        console.log('🔍 ORDER DETAILS DEBUG - No serviceId provided, skipping service loading');
        setService(null);
      }

      // Load customer addresses
      if (user) {
        try {
          const customerDoc = await getDoc(doc(db, 'customers', user.uid));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            const firestoreAddresses = customerData.addresses || [];
            setAddresses(firestoreAddresses);
            
            // Pre-select default address
            const defaultAddress = firestoreAddresses.find((a: Address) => a.isDefault);
            if (defaultAddress) {
              setSelectedAddressId(defaultAddress.id);
            }
            
            console.log('✅ Loaded addresses from Firestore:', firestoreAddresses.length);
          } else {
            console.warn('⚠️ No customer document found, using fallback addresses');
            throw new Error('No customer document found');
          }
        } catch (firestoreError: any) {
          console.warn('⚠️ Firestore address loading failed, using fallback:', firestoreError.message);
          
          // Use fallback addresses
          const fallbackAddresses = getFallbackAddresses();
          setAddresses(fallbackAddresses);
          
          // Pre-select default address from fallback
          const defaultAddress = fallbackAddresses.find((a: Address) => a.isDefault);
          if (defaultAddress) {
            setSelectedAddressId(defaultAddress.id);
          }
          
          if (fallbackAddresses.length > 0) {
            toast.success('Using saved addresses. Will sync to server when possible.');
          } else {
            toast.success('No addresses found. Please add an address below.');
          }
        }
      }
    } catch (error: any) {
      console.error('❌ ORDER DETAILS DEBUG - Failed to load order data:', error);
      console.error('❌ ORDER DETAILS DEBUG - Error message:', error.message);
      console.error('❌ ORDER DETAILS DEBUG - Error stack:', error.stack);
      toast.error('Failed to load order details');
    } finally {
      console.log('🔍 ORDER DETAILS DEBUG - Setting loading to false');
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.street.trim() || !newAddress.city.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const address: Address = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...newAddress
      };

      // Save to fallback storage
      saveFallbackAddress(address);
      
      // Add to current addresses list
      setAddresses(prev => [...prev, address]);
      setSelectedAddressId(address.id);
      setShowAddAddress(false);
      
      // Reset form
      setNewAddress({
        label: 'home',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
        landmark: '',
        isDefault: true
      });
      
      toast.success('Address added successfully!');
    } catch (error: any) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }
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
          <p className="text-text-secondary">{t.common.loading}</p>
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
              {service && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Service</span>
                  <span className="font-medium">{service.name[lang]}</span>
                </div>
              )}
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(product.basePrice + (service?.price || 0), product.currency)}
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
              <div className="space-y-4">
                <p className="text-text-secondary text-center py-4">
                  No addresses found. Add an address below to continue.
                </p>
                
                {!showAddAddress ? (
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(true)}
                    className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
                  >
                    + Add Address
                  </button>
                ) : (
                  <div className="space-y-4 p-4 bg-surface-elevated rounded-apple border border-border">
                    <h3 className="font-semibold text-lg">Add New Address</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Label</label>
                        <select
                          value={newAddress.label}
                          onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value as 'home' | 'office' | 'other' }))}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none"
                        >
                          <option value="home">Home</option>
                          <option value="office">Office</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Country</label>
                        <input
                          type="text"
                          value={newAddress.country}
                          onChange={(e) => setNewAddress(prev => ({ ...prev, country: e.target.value }))}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Street Address *</label>
                      <input
                        type="text"
                        value={newAddress.street}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, street: e.target.value }))}
                        placeholder="123 Main Street"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">City *</label>
                        <input
                          type="text"
                          value={newAddress.city}
                          onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="New York"
                          className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">State</label>
                        <input
                          type="text"
                          value={newAddress.state}
                          onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="NY"
                          className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Postal Code</label>
                        <input
                          type="text"
                          value={newAddress.postalCode}
                          onChange={(e) => setNewAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                          placeholder="10001"
                          className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Landmark (optional)</label>
                      <input
                        type="text"
                        value={newAddress.landmark}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, landmark: e.target.value }))}
                        placeholder="Near the blue building"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-apple focus:border-primary focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleAddAddress}
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
                      >
                        Add Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        className="flex-1 px-4 py-2 bg-surface hover:bg-surface-elevated text-text border border-border rounded-apple transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
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

