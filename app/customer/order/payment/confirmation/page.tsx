'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowLeft, Clock, CreditCard, Shield, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order } from '@/types';
import { MultiLanguageText } from '@/types/product';
import { TIME_SLOTS } from '@/lib/utils/constants';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useTranslation } from '@/hooks/useTranslation';

interface ConfirmationView {
  orderId: string;
  orderNumber: string;
  transactionId: string;
  amount: number;
  currency: string;
  productName: string;
  serviceName: string;
  installationDate: string;
  timeSlot: string;
  address: string;
  paymentMethod: string;
  paidAt: Date;
}

export default function PaymentConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency, formatDate, formatDateTime } = useLocaleFormatters();

  const [view, setView] = useState<ConfirmationView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const orderNumber = searchParams.get('orderNumber');
    const transactionId = searchParams.get('transactionId');
    const amountParam = searchParams.get('amount');
    const currencyParam = searchParams.get('currency') || 'USD';

    if (!orderId || !orderNumber || !transactionId) {
      setLoading(false);
      return;
    }

    const lang = userData?.preferredLanguage || 'en';

    const pickLang = (text: MultiLanguageText | undefined | null): string => {
      if (!text) return '';
      return text[lang] || text.en || text.pt || text.es || text.ko || Object.values(text)[0] || '';
    };

    const timeSlotLabel = (slot: string | undefined): string => {
      if (!slot) return '';
      return TIME_SLOTS.find((s) => s.value === slot)?.label || slot;
    };

    const paymentMethodLabel = (method: string | undefined): string => {
      if (method === 'amazon_pay') return t.orders.amazonPay;
      if (method === 'credit_card') return t.orders.paymentMethod;
      return t.orders.amazonPay;
    };

    const formatAddress = (addr: Order['installationAddress'] | undefined): string => {
      if (!addr) return '';
      const parts = [addr.street, addr.city, addr.state, addr.postalCode].filter(Boolean);
      return parts.join(', ');
    };

    (async () => {
      try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId));

        if (orderDoc.exists()) {
          const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
          const paidAt = order.payment.paidAt?.toDate() ?? new Date();

          setView({
            orderId,
            orderNumber: order.orderNumber || orderNumber,
            transactionId: order.payment.transactionId || transactionId,
            amount: order.payment.amount ?? parseFloat(amountParam || '0'),
            currency: order.payment.currency || currencyParam,
            productName: pickLang(order.productSnapshot?.name),
            serviceName: pickLang(order.serviceSnapshot?.name),
            installationDate: order.installationDate
              ? formatDate(order.installationDate, 'full')
              : '',
            timeSlot: timeSlotLabel(order.timeSlot),
            address: formatAddress(order.installationAddress),
            paymentMethod: paymentMethodLabel(order.payment.method),
            paidAt,
          });
        } else {
          // Order doc missing (e.g. offline-saved fallback). Render with URL params only.
          setView({
            orderId,
            orderNumber,
            transactionId,
            amount: parseFloat(amountParam || '0'),
            currency: currencyParam,
            productName: '',
            serviceName: '',
            installationDate: '',
            timeSlot: '',
            address: '',
            paymentMethod: t.orders.amazonPay,
            paidAt: new Date(),
          });
        }
      } catch {
        setView({
          orderId,
          orderNumber,
          transactionId,
          amount: parseFloat(amountParam || '0'),
          currency: currencyParam,
          productName: '',
          serviceName: '',
          installationDate: '',
          timeSlot: '',
          address: '',
          paymentMethod: t.orders.amazonPay,
          paidAt: new Date(),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, userData?.preferredLanguage]);

  const handleViewOrder = () => {
    if (view) {
      router.push(`/customer/orders/${view.orderId}`);
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

  if (!view) {
    return (
      <div className="sc" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="sc-stack" style={{ alignItems: 'center', gap: 16, textAlign: 'center', maxWidth: 480 }}>
          <h1 className="sc-h1">{t.orders.confirmationNotFound}</h1>
          <p className="sc-lede">{t.orders.confirmationNotFoundDesc}</p>
          <button
            type="button"
            onClick={() => router.push('/customer')}
            className="sc-cta"
            style={{ padding: '12px 24px' }}
          >
            {t.orders.goToDashboard}
          </button>
        </div>
      </div>
    );
  }

  const hasInstallationDetails = Boolean(view.productName || view.installationDate || view.address);

  const StepNumber = ({ n }: { n: number }) => (
    <div
      style={{
        width: 28,
        height: 28,
        background: 'var(--brand)',
        color: 'var(--paper)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
        marginTop: 2,
      }}
    >
      {n}
    </div>
  );

  return (
    <div className="sc" style={{ minHeight: '100vh' }}>
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
        <div className="sc-container" style={{ maxWidth: 800, padding: '14px 16px' }}>
          <button
            type="button"
            onClick={() => router.push('/customer')}
            className="sc-cta-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}
          >
            <ArrowLeft className="w-5 h-5" />
            {t.orders.backToDashboard}
          </button>
        </div>
      </header>

      <div className="sc-container" style={{ maxWidth: 800, padding: '32px 16px' }}>
        <div className="sc-stack-lg" style={{ gap: 24 }}>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div
              style={{
                width: 80,
                height: 80,
                background: 'var(--brand-tint)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <CheckCircle className="w-12 h-12" style={{ color: 'var(--brand)' }} />
            </div>
            <h1 className="sc-h1" style={{ marginBottom: 8 }}>{t.payment.paymentSuccessful}</h1>
            <p className="sc-lede">{t.payment.orderPlaced}</p>
          </div>

          <div
            className="sc-card-static"
            style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}
          >
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{t.orders.orderSummaryTitle}</h2>

            <div className="sc-stack" style={{ gap: 16 }}>
              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.orderNumber}</span>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 700 }}>
                  {view.orderNumber}
                </span>
              </div>

              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.transactionId}</span>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 13 }}>
                  {view.transactionId}
                </span>
              </div>

              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.amountPaid}</span>
                <span className="sc-price" style={{ fontSize: 28 }}>
                  {formatCurrency(view.amount, view.currency)}
                </span>
              </div>

              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.paymentMethod}</span>
                <div className="sc-row" style={{ alignItems: 'center', gap: 8 }}>
                  <CreditCard className="w-4 h-4" />
                  <span>{view.paymentMethod}</span>
                </div>
              </div>

              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.paymentDate}</span>
                <span>{formatDateTime(view.paidAt)}</span>
              </div>
            </div>
          </div>

          {hasInstallationDetails && (
            <div className="sc-card-static">
              <h2 className="sc-h2" style={{ marginBottom: 16 }}>{t.orders.installationDetailsTitle}</h2>

              <div className="sc-stack" style={{ gap: 16 }}>
                {view.installationDate && (
                  <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <Clock className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: 600, margin: 0 }}>{view.installationDate}</p>
                      {view.timeSlot && (
                        <p className="sc-helper" style={{ marginTop: 2 }}>
                          {t.orders.time}: {view.timeSlot}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {view.productName && (
                  <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <Shield className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: 600, margin: 0 }}>{view.productName}</p>
                      {view.serviceName && (
                        <p className="sc-helper" style={{ marginTop: 2 }}>{view.serviceName}</p>
                      )}
                    </div>
                  </div>
                )}

                {view.address && (
                  <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <MapPin className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: 600, margin: 0 }}>{t.orders.installationAddressLabel}</p>
                      <p className="sc-helper" style={{ marginTop: 2 }}>{view.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className="sc-card-static"
            style={{ background: 'var(--brand-tint)', borderColor: 'var(--brand)' }}
          >
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{t.orders.whatsNext}</h2>

            <div className="sc-stack" style={{ gap: 12 }}>
              <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <StepNumber n={1} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{t.orders.step1Title}</p>
                  <p className="sc-helper" style={{ marginTop: 2 }}>{t.orders.step1Desc}</p>
                </div>
              </div>

              <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <StepNumber n={2} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{t.orders.step2Title}</p>
                  <p className="sc-helper" style={{ marginTop: 2 }}>{t.orders.step2Desc}</p>
                </div>
              </div>

              <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <StepNumber n={3} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{t.orders.step3Title}</p>
                  <p className="sc-helper" style={{ marginTop: 2 }}>{t.orders.step3Desc}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleViewOrder}
            className="sc-cta"
            style={{ width: '100%', padding: '18px 24px' }}
          >
            {t.orders.viewOrderDetails}
          </button>
        </div>
      </div>
    </div>
  );
}
