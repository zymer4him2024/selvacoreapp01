'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Lock, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Product, Service } from '@/types';
import { getProductById } from '@/lib/services/productService';
import { getServiceById } from '@/lib/services/serviceService';
import { collection, doc, addDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency, generateOrderNumber } from '@/lib/utils/formatters';
import { processFakePayment } from '@/lib/services/fakePaymentService';
import { processAmazonPayment } from '@/lib/services/amazonPaymentService';
import { logTransaction } from '@/lib/services/transactionService';
import { addCustomerHistoryRecord } from '@/lib/services/customerHistoryService';
import { saveFallbackOrder } from '@/lib/services/fallbackOrderService';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'fake' | 'amazon'>('amazon');

  useEffect(() => {
    loadOrderSummary();
  }, []);

  const loadOrderSummary = async () => {
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
      
      // Load service only if serviceId exists
      if (orderData.serviceId) {
        try {
          const serviceData = await getServiceById(orderData.serviceId);
          setService(serviceData);
        } catch (error) {
          console.warn('Service not found, continuing without service:', error);
          setService(null);
        }
      } else {
        setService(null);
      }
    } catch (error: any) {
      toast.error('Failed to load order summary');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    console.log('🚀 PAYMENT DEBUG - Starting payment process...', {
      user: !!user,
      product: !!product,
      service: !!service,
      userId: user?.uid,
      productId: product?.id,
      serviceId: service?.id
    });

    if (!user || !product || !service) {
      console.error('❌ PAYMENT DEBUG - Missing required data:', { user: !!user, product: !!product, service: !!service });
      return;
    }

    try {
      setProcessing(true);
      console.log('🔄 PAYMENT DEBUG - Set processing to true');

      // Get order data
      const orderDataStr = sessionStorage.getItem('orderData');
      console.log('📋 PAYMENT DEBUG - Order data from session:', orderDataStr);
      
      if (!orderDataStr) {
        console.error('❌ PAYMENT DEBUG - No order data in session storage');
        throw new Error('No order data');
      }

      const orderData = JSON.parse(orderDataStr);
      console.log('📋 PAYMENT DEBUG - Parsed order data:', orderData);

      // Get customer data
      console.log('👤 PAYMENT DEBUG - Loading customer data for:', user.uid);
      const customerDoc = await getDoc(doc(db, 'customers', user.uid));
      
      if (!customerDoc.exists()) {
        console.error('❌ PAYMENT DEBUG - Customer profile not found for:', user.uid);
        throw new Error('Customer profile not found');
      }

      const customerData = customerDoc.data();
      console.log('👤 PAYMENT DEBUG - Customer data loaded:', customerData);
      
      const selectedAddress = customerData.addresses.find((a: any) => a.id === orderData.addressId);
      console.log('🏠 PAYMENT DEBUG - Selected address:', selectedAddress);

      if (!selectedAddress) {
        console.error('❌ PAYMENT DEBUG - Address not found for ID:', orderData.addressId);
        throw new Error('Address not found');
      }

      // Calculate total
      const productPrice = product.basePrice;
      const servicePrice = service?.price || 0;
      const subtotal = productPrice + servicePrice;
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;

      console.log('💰 PAYMENT DEBUG - Price calculation:', {
        productPrice,
        servicePrice,
        subtotal,
        tax,
        total,
        currency: product.currency
      });

      // Process payment based on selected method
      console.log('💳 PAYMENT DEBUG - Processing payment with method:', paymentMethod);
      const paymentResult = paymentMethod === 'amazon' 
        ? await processAmazonPayment(total, product.currency)
        : await processFakePayment(total, product.currency);
      
      console.log('✅ PAYMENT DEBUG - Payment result:', paymentResult);

      // Create order in Firestore
      console.log('📦 PAYMENT DEBUG - Creating order...');
      const orderNumber = generateOrderNumber();
      const variation = product.variations?.find((v) => v.id === orderData.variationId);
      
      console.log('📦 PAYMENT DEBUG - Order details:', {
        orderNumber,
        customerId: user.uid,
        productId: product.id,
        serviceId: service.id,
        variation: variation?.name || 'No variation',
        total
      });

      const newOrder = {
        orderNumber,
        customerId: user.uid,
        technicianId: null,
        subContractorId: null,
        
        productId: product.id,
        productVariationId: orderData.variationId || '',
        productSnapshot: {
          name: product.name,
          variation: variation?.name || '',
          price: productPrice,
          image: product.images?.[0] || '',
        },
        
        serviceId: service.id,
        serviceSnapshot: {
          name: service.name,
          price: servicePrice,
          duration: service.duration,
        },
        
        installationAddress: selectedAddress,
        installationDate: Timestamp.fromDate(new Date(orderData.installationDate)),
        timeSlot: orderData.timeSlot,
        
        sitePhotos: {
          waterSource: {
            url: orderData.sitePhotos.waterSource,
            uploadedAt: Timestamp.now(),
          },
          productLocation: {
            url: orderData.sitePhotos.productLocation,
            uploadedAt: Timestamp.now(),
          },
          waterRunningVideo: {
            url: orderData.sitePhotos.waterRunning,
            uploadedAt: Timestamp.now(),
          },
        },
        
        installationPhotos: [],
        
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          timestamp: Timestamp.now(),
          note: 'Order created',
          changedBy: user.uid,
        }],
        
        payment: {
          amount: total,
          currency: product.currency,
          productPrice,
          servicePrice,
          tax,
          discount: 0,
          status: 'completed',
          method: 'fake_payment',
          transactionId: paymentResult.transactionId,
          paidAt: Timestamp.now(),
        },
        
        createdAt: Timestamp.now(),
        acceptedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        
        customerInfo: {
          name: userData?.displayName || '',
          email: userData?.email || '',
          phone: userData?.phone || '',
          whatsapp: userData?.phone || '',
        },
        
        technicianInfo: null,
        rating: null,
        cancellation: null,
        changeHistory: [],
      };

      let orderRef: any;
      let orderId: string;
      
      console.log('🔥 PAYMENT DEBUG - Attempting to create order in Firestore...');
      try {
        // Try to create order in Firestore
        orderRef = await addDoc(collection(db, 'orders'), newOrder);
        orderId = orderRef.id;
        console.log('✅ PAYMENT DEBUG - Order created in Firestore successfully:', orderId);
        
        // Log transaction
        await logTransaction({
          type: 'order_created',
          orderId: orderRef.id,
          orderNumber,
          customerId: user.uid,
          amount: total,
          currency: product.currency,
          metadata: {
            productId: product.id,
            serviceId: service.id,
          },
          performedBy: user.uid,
          performedByRole: 'customer',
        });

        await logTransaction({
          type: 'payment_received',
          orderId: orderRef.id,
          orderNumber,
          customerId: user.uid,
          amount: total,
          currency: product.currency,
          metadata: {
            transactionId: paymentResult.transactionId,
            method: paymentResult.method,
          },
          performedBy: user.uid,
          performedByRole: 'customer',
        });

        // Add to customer history
        await addCustomerHistoryRecord({
          customerId: user.uid,
          type: 'payment_made',
          title: 'Payment Successful',
          description: `Payment of ${formatCurrency(total, product.currency)} for Order ${orderNumber}`,
          amount: total,
          currency: product.currency,
          orderId: orderRef.id,
          transactionId: paymentResult.transactionId,
          metadata: {
            productName: product.name[userData?.preferredLanguage || 'en'],
            serviceName: service.name[userData?.preferredLanguage || 'en'],
            paymentMethod: paymentResult.method
          }
        });
        
      } catch (firestoreError: any) {
        console.error('❌ PAYMENT DEBUG - Firestore order creation failed:', firestoreError);
        console.warn('⚠️ PAYMENT DEBUG - Using fallback system...');
        
        // Use fallback order system
        console.log('💾 PAYMENT DEBUG - Saving order to local storage...');
        const fallbackOrderId = saveFallbackOrder({
          orderNumber,
          customerId: user.uid,
          productId: product.id,
          serviceId: service.id,
          variationId: orderData.variationId,
          addressId: orderData.addressId,
          installationDate: orderData.installationDate,
          timeSlot: orderData.timeSlot,
          total,
          currency: product.currency,
          status: 'confirmed',
          paymentMethod: paymentResult.method,
          transactionId: paymentResult.transactionId
        });
        
        console.log('✅ PAYMENT DEBUG - Fallback order saved with ID:', fallbackOrderId);
        orderId = fallbackOrderId;
        orderRef = { id: fallbackOrderId };
        
        toast.success('Order saved locally! Will sync to server when possible.');
      }

      // Clear session storage
      console.log('🧹 PAYMENT DEBUG - Clearing session storage');
      sessionStorage.removeItem('orderData');

      // Redirect to confirmation page with payment details
      console.log('🔄 PAYMENT DEBUG - Redirecting to confirmation page...');
      const confirmationParams = new URLSearchParams({
        orderId: orderRef.id,
        orderNumber,
        transactionId: paymentResult.transactionId,
        amount: total.toString(),
        currency: product.currency
      });
      
      console.log('🔄 PAYMENT DEBUG - Confirmation params:', confirmationParams.toString());
      router.push(`/customer/order/payment/confirmation?${confirmationParams.toString()}`);
      
    } catch (error: any) {
      console.error('❌ PAYMENT DEBUG - Payment processing failed:', error);
      console.error('❌ PAYMENT DEBUG - Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(error.message || t.payment.paymentFailed);
    } finally {
      console.log('🏁 PAYMENT DEBUG - Payment process completed, setting processing to false');
      setProcessing(false);
    }
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
  const productPrice = product.basePrice;
  const servicePrice = service.price;
  const subtotal = productPrice + servicePrice;
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

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
              ✓
            </div>
            <div className="w-16 h-1 bg-success"></div>
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-sm font-bold">
              ✓
            </div>
            <div className="w-16 h-1 bg-success"></div>
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center text-sm font-bold">
              ✓
            </div>
            <div className="w-16 h-1 bg-success"></div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold">
              4
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Payment</h1>
            <p className="text-text-secondary">Review and complete your order</p>
          </div>

          {/* Order Summary */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{product.name[lang]}</p>
                  <p className="text-sm text-text-secondary">{product.brand}</p>
                </div>
                <p className="font-semibold">{formatCurrency(productPrice, product.currency)}</p>
              </div>

              {service && (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{service.name[lang]}</p>
                    <p className="text-sm text-text-secondary">{service.duration}h installation</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(servicePrice, service.currency)}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Subtotal</span>
                  <span>{formatCurrency(subtotal, product.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Tax (10%)</span>
                  <span>{formatCurrency(tax, product.currency)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="text-xl font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(total, product.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-6">Payment Method</h2>
            
            <div className="p-6 bg-warning/10 border border-warning/30 rounded-apple mb-6">
              <div className="flex items-start gap-3">
                <CreditCard className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-warning mb-1">Development Mode</p>
                  <p className="text-sm text-text-secondary">
                    Choose your preferred payment method for testing.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface rounded-apple border-2 border-primary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/20 rounded-apple flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Fake Payment Gateway</p>
                    <p className="text-sm text-text-secondary">Test payment (always succeeds)</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <Lock className="w-4 h-4" />
                <span>Secure payment processing</span>
              </div>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full px-8 py-4 bg-success hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple-lg"
          >
            {processing ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing Payment...
              </div>
            ) : (
              `Pay ${formatCurrency(total, product.currency)}`
            )}
          </button>

          <p className="text-center text-xs text-text-tertiary">
            By placing this order, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

