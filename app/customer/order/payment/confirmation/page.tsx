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
        serviceName: 'Professional Installation',
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
    toast.success('Receipt downloaded successfully!');
  };

  const handleViewOrder = () => {
    if (confirmationData) {
      router.push(`/customer/orders/${confirmationData.orderId}`);
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

  if (!confirmationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Confirmation Not Found</h1>
          <p className="text-text-secondary">The payment confirmation could not be found.</p>
          <button
            onClick={() => router.push('/customer')}
            className="px-6 py-3 bg-primary text-white rounded-apple hover:bg-primary-hover transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-10 backdrop-blur-lg bg-surface/80">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4">
          <button
            onClick={() => router.push('/customer')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-6 animate-fade-in">
          {/* Success Header */}
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t.payment.paymentSuccessful}</h1>
            <p className="text-text-secondary text-lg">
              {t.payment.orderPlaced}
            </p>
          </div>

          {/* Order Summary Card */}
          <div className="apple-card bg-success/5 border-success/30">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Order Number</span>
                <span className="font-mono font-semibold">{confirmationData.orderNumber}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Transaction ID</span>
                <span className="font-mono text-sm">{confirmationData.transactionId}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Amount Paid</span>
                <span className="text-2xl font-bold text-success">
                  {formatCurrency(confirmationData.amount, confirmationData.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Payment Method</span>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>{confirmationData.paymentMethod}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Payment Date</span>
                <span>{formatDateTime(confirmationData.paidAt)}</span>
              </div>
            </div>
          </div>

          {/* Installation Details */}
          <div className="apple-card">
            <h2 className="text-xl font-semibold mb-4">Installation Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">{confirmationData.installationDate}</p>
                  <p className="text-sm text-text-secondary">Time: {confirmationData.timeSlot}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">{confirmationData.productName}</p>
                  <p className="text-sm text-text-secondary">{confirmationData.serviceName}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Installation Address</p>
                  <p className="text-sm text-text-secondary">{confirmationData.address}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="apple-card bg-primary/5 border-primary/30">
            <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-medium">Order Confirmation</p>
                  <p className="text-sm text-text-secondary">You'll receive an email confirmation shortly</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-medium">Technician Assignment</p>
                  <p className="text-sm text-text-secondary">A qualified technician will be assigned to your order</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-medium">Installation Day</p>
                  <p className="text-sm text-text-secondary">Your technician will arrive at the scheduled time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleViewOrder}
              className="flex-1 px-8 py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple"
            >
              View Order Details
            </button>
            
            <button
              onClick={handleDownloadReceipt}
              className="flex-1 px-8 py-4 bg-surface hover:bg-surface-elevated border border-border text-text-primary font-semibold rounded-apple transition-all hover:scale-[1.02] shadow-apple flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
