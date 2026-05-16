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
import { generateOrderNumber } from '@/lib/utils/formatters';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { processAmazonPayment } from '@/lib/services/amazonPaymentService';
import { logTransaction } from '@/lib/services/transactionService';
import { addCustomerHistoryRecord } from '@/lib/services/customerHistoryService';
import { saveFallbackOrder } from '@/lib/services/fallbackOrderService';
import { getFallbackAddress } from '@/lib/services/fallbackAddressService';
import { useTranslation } from '@/hooks/useTranslation';
import OrderProgressTracker from '@/components/customer/OrderProgressTracker';
import toast from 'react-hot-toast';

export default function PaymentPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();

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
        toast.error(t.orders.noOrderData);
        router.push('/customer');
        return;
      }

      const orderData = JSON.parse(orderDataStr);
      const productData = await getProductById(orderData.productId);

      if (!productData) {
        toast.error(t.orders.productNotFound);
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
      const message = error instanceof Error ? error.message : t.orders.loadOrderSummaryError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!user || !product) {
      toast.error(t.orders.missingRequiredData);
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
          ...(orderData.sitePhotos?.waterSource && {
            waterSource: {
              url: orderData.sitePhotos.waterSource,
              uploadedAt: Timestamp.now(),
            },
          }),
          ...(orderData.sitePhotos?.productLocation && {
            productLocation: {
              url: orderData.sitePhotos.productLocation,
              uploadedAt: Timestamp.now(),
            },
          }),
          ...(orderData.sitePhotos?.fullShot && {
            fullShot: {
              url: orderData.sitePhotos.fullShot,
              uploadedAt: Timestamp.now(),
            },
          }),
          ...(orderData.sitePhotos?.waterRunning && {
            waterRunningVideo: {
              url: orderData.sitePhotos.waterRunning,
              uploadedAt: Timestamp.now(),
            },
          }),
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
        toast.success(t.orders.orderSavedLocally);
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
      <div className="sc" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sc-stack" style={{ alignItems: 'center', gap: 16 }}>
          <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
          <p className="sc-helper">{t.common.loading}</p>
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
    <div className="sc" style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <header
        className="sc-nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--paper)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--hairline)',
        }}
      >
        <div className="sc-container" style={{ maxWidth: 720, padding: '14px 16px' }}>
          <button
            type="button"
            onClick={() => router.back()}
            className="sc-cta-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}
          >
            <ArrowLeft className="w-5 h-5" />
            {t.orders.back}
          </button>
        </div>
      </header>

      <div className="sc-container" style={{ maxWidth: 720, padding: '32px 16px' }}>
        <div className="sc-stack-lg" style={{ gap: 32 }}>
          <OrderProgressTracker currentStep={4} />

          <div style={{ textAlign: 'center' }}>
            <h1 className="sc-h1" style={{ marginBottom: 8 }}>{t.orders.paymentTitle}</h1>
            <p className="sc-lede">{t.orders.reviewOrder}</p>
          </div>

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 20 }}>{t.orders.orderSummary}</h2>

            <div className="sc-stack" style={{ gap: 16 }}>
              <div className="sc-row-between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{product.name[lang]}</p>
                  <p className="sc-helper" style={{ marginTop: 2 }}>{product.brand}</p>
                </div>
                <p style={{ fontWeight: 700, margin: 0 }}>{formatCurrency(productPrice, product.currency)}</p>
              </div>

              {service && (
                <div className="sc-row-between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}>{service.name[lang]}</p>
                    <p className="sc-helper" style={{ marginTop: 2 }}>
                      {service.duration}h {t.orders.installationService}
                    </p>
                  </div>
                  <p style={{ fontWeight: 700, margin: 0 }}>{formatCurrency(servicePrice, service.currency)}</p>
                </div>
              )}

              <div style={{ paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                <div className="sc-stack" style={{ gap: 8 }}>
                  <div className="sc-row-between" style={{ fontSize: 14 }}>
                    <span className="sc-helper">{t.orders.subtotal}</span>
                    <span>{formatCurrency(subtotal, product.currency)}</span>
                  </div>
                  <div className="sc-row-between" style={{ fontSize: 14 }}>
                    <span className="sc-helper">{t.orders.tax}</span>
                    <span>{formatCurrency(tax, product.currency)}</span>
                  </div>
                  <div
                    className="sc-row-between"
                    style={{ paddingTop: 12, borderTop: '1px solid var(--hairline)', alignItems: 'baseline' }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{t.orders.totalToPay}</span>
                    <span className="sc-price" style={{ fontSize: 28 }}>
                      {formatCurrency(total, product.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 20 }}>{t.orders.paymentMethod}</h2>

            <div
              style={{
                padding: 16,
                background: 'var(--warn-tint)',
                border: '1px solid var(--warn)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 20,
              }}
            >
              <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <CreditCard className="w-5 h-5" style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--warn)', fontSize: 14, margin: 0 }}>
                    {t.orders.sandboxMode}
                  </p>
                  <p className="sc-helper" style={{ fontSize: 12, marginTop: 2 }}>{t.orders.sandboxDesc}</p>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: 20,
                background: 'var(--paper)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--brand)',
              }}
            >
              <div className="sc-row-between" style={{ alignItems: 'center', marginBottom: 16 }}>
                <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      background: 'rgba(255,153,0,0.15)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShoppingBag className="w-6 h-6" style={{ color: '#FF9900' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}>{t.orders.amazonPay}</p>
                    <p className="sc-helper" style={{ marginTop: 2 }}>{t.orders.payWithAmazon}</p>
                  </div>
                </div>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check className="w-4 h-4" style={{ color: '#fff' }} />
                </div>
              </div>

              <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--soft)' }}>
                <Lock className="w-4 h-4" />
                <span>{t.orders.securePayment}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePayment}
            disabled={processing}
            style={{
              width: '100%',
              padding: '18px 24px',
              background: '#FF9900',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: processing ? 'not-allowed' : 'pointer',
              opacity: processing ? 0.6 : 1,
              transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {processing ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    border: '2px solid #fff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'sc-spin 600ms linear infinite',
                  }}
                />
                {t.orders.processingPayment}
              </span>
            ) : (
              `${t.orders.payWithAmazonBtn} — ${formatCurrency(total, product.currency)}`
            )}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--soft)' }}>{t.orders.termsNotice}</p>
        </div>
      </div>
    </div>
  );
}
