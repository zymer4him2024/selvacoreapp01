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
import { logTransaction } from '@/lib/services/transactionService';
import { addCustomerHistoryRecord } from '@/lib/services/customerHistoryService';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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

      const [productData, serviceData] = await Promise.all([
        getProductById(orderData.productId),
        getServiceById(orderData.serviceId),
      ]);

      if (!productData || !serviceData) {
        toast.error('Order data invalid');
        router.push('/customer');
        return;
      }

      setProduct(productData);
      setService(serviceData);
    } catch (error: any) {
      toast.error('Failed to load order summary');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user || !product || !service) return;

    try {
      setProcessing(true);

      // Get order data
      const orderDataStr = sessionStorage.getItem('orderData');
      if (!orderDataStr) throw new Error('No order data');

      const orderData = JSON.parse(orderDataStr);

      // Get customer data
      const customerDoc = await getDoc(doc(db, 'customers', user.uid));
      if (!customerDoc.exists()) throw new Error('Customer profile not found');

      const customerData = customerDoc.data();
      const selectedAddress = customerData.addresses.find((a: any) => a.id === orderData.addressId);

      if (!selectedAddress) throw new Error('Address not found');

      // Calculate total
      const productPrice = product.basePrice;
      const servicePrice = service.price;
      const subtotal = productPrice + servicePrice;
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;

      // Process payment (fake)
      const paymentResult = await processFakePayment(total, product.currency);

      // Create order in Firestore
      const orderNumber = generateOrderNumber();
      const variation = product.variations?.find((v) => v.id === orderData.variationId);

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

      const orderRef = await addDoc(collection(db, 'orders'), newOrder);

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
          method: 'fake_payment',
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

      // Clear session storage
      sessionStorage.removeItem('orderData');

      // Redirect to confirmation page with payment details
      const confirmationParams = new URLSearchParams({
        orderId: orderRef.id,
        orderNumber,
        transactionId: paymentResult.transactionId,
        amount: total.toString(),
        currency: product.currency
      });
      
      router.push(`/customer/order/payment/confirmation?${confirmationParams.toString()}`);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
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

              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{service.name[lang]}</p>
                  <p className="text-sm text-text-secondary">{service.duration}h installation</p>
                </div>
                <p className="font-semibold">{formatCurrency(servicePrice, service.currency)}</p>
              </div>

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
                    Using fake payment gateway for testing. This is a simulated payment that will always succeed.
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

