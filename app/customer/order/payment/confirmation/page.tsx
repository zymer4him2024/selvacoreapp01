'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Download, ArrowLeft, Clock, CreditCard, Shield, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

interface PaymentConfirmationData {
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
  
  const [confirmationData, setConfirmationData] = useState<PaymentConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get confirmation data from URL params
    const orderId = searchParams.get('orderId');
    const orderNumber = searchParams.get('orderNumber');
    const transactionId = searchParams.get('transactionId');
    const amount = parseFloat(searchParams.get('amount') || '0');
    const currency = searchParams.get('currency') || 'USD';
    
    if (orderId && orderNumber && transactionId) {
      setConfirmationData({
        orderId,
        orderNumber,
        transactionId,
        amount,
        currency,
        productName: 'Water Purifier System', // This should come from order data
        serviceName: 'Self Installation',
        installationDate: '2024-01-15',
        timeSlot: '10:00 AM - 12:00 PM',
        address: '123 Main Street, City, State',
        paymentMethod: 'Credit Card',
        paidAt: new Date()
      });
    }
    
    setLoading(false);
  }, [searchParams]);

  const handleDownloadReceipt = () => {
    // Generate and download receipt PDF
    toast.success(t.components.paymentConfirmation.receiptDownloaded);
  };

  const handleViewOrder = () => {
    if (confirmationData) {
      router.push(`/customer/orders/${confirmationData.orderId}`);
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

  if (!confirmationData) {
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
          background: 'rgba(255,255,255,0.85)',
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
                  {confirmationData.orderNumber}
                </span>
              </div>

              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.transactionId}</span>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 13 }}>
                  {confirmationData.transactionId}
                </span>
              </div>

              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.amountPaid}</span>
                <span className="sc-price" style={{ fontSize: 28 }}>
                  {formatCurrency(confirmationData.amount, confirmationData.currency)}
                </span>
              </div>

              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.paymentMethod}</span>
                <div className="sc-row" style={{ alignItems: 'center', gap: 8 }}>
                  <CreditCard className="w-4 h-4" />
                  <span>{confirmationData.paymentMethod}</span>
                </div>
              </div>

              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <span className="sc-helper">{t.orders.paymentDate}</span>
                <span>{formatDateTime(confirmationData.paidAt)}</span>
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <h2 className="sc-h2" style={{ marginBottom: 16 }}>{t.orders.installationDetailsTitle}</h2>

            <div className="sc-stack" style={{ gap: 16 }}>
              <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <Clock className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 4, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{confirmationData.installationDate}</p>
                  <p className="sc-helper" style={{ marginTop: 2 }}>
                    {t.orders.time}: {confirmationData.timeSlot}
                  </p>
                </div>
              </div>

              <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <Shield className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 4, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{confirmationData.productName}</p>
                  <p className="sc-helper" style={{ marginTop: 2 }}>{confirmationData.serviceName}</p>
                </div>
              </div>

              <div className="sc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <MapPin className="w-5 h-5" style={{ color: 'var(--brand)', marginTop: 4, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{t.orders.installationAddressLabel}</p>
                  <p className="sc-helper" style={{ marginTop: 2 }}>{confirmationData.address}</p>
                </div>
              </div>
            </div>
          </div>

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

          <div className="sc-row" style={{ gap: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleViewOrder}
              className="sc-cta"
              style={{ flex: 1, minWidth: 200, padding: '18px 24px' }}
            >
              {t.orders.viewOrderDetails}
            </button>

            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="sc-cta-ghost"
              style={{
                flex: 1,
                minWidth: 200,
                padding: '18px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Download className="w-5 h-5" />
              {t.orders.downloadReceipt}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
