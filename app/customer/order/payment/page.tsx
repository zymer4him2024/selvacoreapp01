'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Lock, Check, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Product, Service } from '@/types';
import { getProductById } from '@/lib/services/productService';
import { getServiceById } from '@/lib/services/serviceService';
import { collection, doc, addDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency, generateOrderNumber } from '@/lib/utils/formatters';
import { processAmazonPayment } from '@/lib/services/amazonPaymentService';
import { logTransaction } from '@/lib/services/transactionService';
import { addCustomerHistoryRecord } from '@/lib/services/customerHistoryService';
import { saveFallbackOrder } from '@/lib/services/fallbackOrderService';
import { getFallbackAddress } from '@/lib/services/fallbackAddressService';
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

      if (orderData.serviceId) {
        try {
          const serviceData = await getServiceById(orderData.serviceId);
          setService(serviceData);
        } catch {
          setService(null);
        }
      } else {
        setService(null);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load order summary';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user || !product) {
      toast.error('Missing required data');
      return;
    }

    try {
      setProcessing(true);

      const orderDataStr = sessionStorage.getItem('orderData');
      if (!orderDataStr) throw new Error('No order data');

      const orderData = JSON.parse(orderDataStr);

      // Prefer the full address object the details page stashed.
      // Fall back to Firestore / localStorage for orders that were started
      // under the old flow (no resolvedAddress in sessionStorage).
      let selectedAddress = orderData.addressOverride ?? orderData.resolvedAddress ?? null;
      if (!selectedAddress && orderData.addressId) {
        try {
          const customerDoc = await getDoc(doc(db, 'customers', user.uid));
          if (customerDoc.exists()) {
            const addresses = customerDoc.data().addresses ?? [];
            selectedAddress = addresses.find(
              (a: { id: string }) => a.id === orderData.addressId
            ) ?? null;
          }
        } catch {
          // Firestore unreachable — fall through to local fallback.
        }
      }
      if (!selectedAddress && orderData.addressId) {
        selectedAddress = getFallbackAddress(orderData.addressId);
      }
      if (!selectedAddress) throw new Error('Address not found');

      // Calculate total
      const productPrice = product.basePrice;
      const servicePrice = service?.price || 0;
      const subtotal = productPrice + servicePrice;
      const tax = subtotal * 0.1;
      const total = subtotal + tax;

      // Process payment via Amazon Pay (test mode)
      const paymentResult = await processAmazonPayment(total, product.currency);

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

        serviceId: service?.id || null,
        serviceSnapshot: service ? {
          name: service.name,
          price: servicePrice,
          duration: service.duration,
        } : null,

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
          method: 'amazon_pay',
          transactionId: paymentResult.transactionId,
          amazonOrderId: paymentResult.amazonOrderId,
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

      let orderRefId: string;

      try {
        const orderRef = await addDoc(collection(db, 'orders'), newOrder);
        orderRefId = orderRef.id;

        await logTransaction({
          type: 'order_created',
          orderId: orderRef.id,
          orderNumber,
          customerId: user.uid,
          amount: total,
          currency: product.currency,
          metadata: {
            productId: product.id,
            serviceId: service?.id || null,
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
            amazonOrderId: paymentResult.amazonOrderId,
          },
          performedBy: user.uid,
          performedByRole: 'customer',
        });

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
            serviceName: service ? service.name[userData?.preferredLanguage || 'en'] : 'Self Installation',
            paymentMethod: paymentResult.method
          }
        });

      } catch (firestoreError: unknown) {
        const msg = firestoreError instanceof Error ? firestoreError.message : 'Firestore error';
        // Firestore order creation failed, using fallback

        const fallbackOrderId = saveFallbackOrder({
          orderNumber,
          customerId: user.uid,
          productId: product.id,
          serviceId: service?.id || null,
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

        orderRefId = fallbackOrderId;
        toast.success('Order saved locally! Will sync to server when possible.');
      }

      sessionStorage.removeItem('orderData');

      const confirmationParams = new URLSearchParams({
        orderId: orderRefId,
        orderNumber,
        transactionId: paymentResult.transactionId,
        amount: total.toString(),
        currency: product.currency
      });

      router.push(`/customer/order/payment/confirmation?${confirmationParams.toString()}`);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.payment.paymentFailed;
      toast.error(message);
    } finally {
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

  if (!product) return null;

  const lang = userData?.preferredLanguage || 'en';
  const productPrice = product.basePrice;
  const servicePrice = service?.price || 0;
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
            {t.orders.back}
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
            <h1 className="text-3xl font-bold mb-2">{t.orders.paymentTitle}</h1>
            <p className="text-text-secondary">{t.orders.reviewOrder}</p>
          </div>

          {/* Order Summary */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-6">{t.orders.orderSummary}</h2>

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
                    <p className="text-sm text-text-secondary">{service.duration}h {t.orders.installationService}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(servicePrice, service.currency)}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t.orders.subtotal}</span>
                  <span>{formatCurrency(subtotal, product.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">{t.orders.tax}</span>
                  <span>{formatCurrency(tax, product.currency)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-border">
                  <span className="text-xl font-semibold">{t.orders.totalToPay}</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(total, product.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-6">{t.orders.paymentMethod}</h2>

            <div className="p-4 bg-warning/10 border border-warning/30 rounded-apple mb-6">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning text-sm">{t.orders.sandboxMode}</p>
                  <p className="text-xs text-text-secondary">
                    {t.orders.sandboxDesc}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-surface rounded-apple border-2 border-primary">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FF9900]/20 rounded-apple flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-[#FF9900]" />
                  </div>
                  <div>
                    <p className="font-medium">{t.orders.amazonPay}</p>
                    <p className="text-sm text-text-secondary">{t.orders.payWithAmazon}</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <Lock className="w-4 h-4" />
                <span>{t.orders.securePayment}</span>
              </div>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full px-8 py-4 bg-[#FF9900] hover:bg-[#FF9900]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple-lg"
          >
            {processing ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t.orders.processingPayment}
              </div>
            ) : (
              `${t.orders.payWithAmazonBtn} — ${formatCurrency(total, product.currency)}`
            )}
          </button>

          <p className="text-center text-xs text-text-tertiary">
            {t.orders.termsNotice}
          </p>
        </div>
      </div>
    </div>
  );
}
