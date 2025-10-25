// Amazon Test Payment Service
// Simulates Amazon Pay integration for testing

export interface AmazonPaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  method: string;
  timestamp: Date;
  message?: string;
  amazonOrderId?: string;
}

/**
 * Process Amazon test payment
 * Simulates Amazon Pay integration
 */
export async function processAmazonPayment(
  amount: number,
  currency: string = 'USD'
): Promise<AmazonPaymentResult> {
  // Simulate Amazon Pay API call delay (2-4 seconds)
  const delay = Math.random() * 2000 + 2000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // 95% success rate for Amazon Pay
  const success = Math.random() > 0.05;
  
  if (!success) {
    throw new Error('Amazon Pay declined - Payment authorization failed');
  }
  
  const transactionId = `AMZN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const amazonOrderId = `AMZ-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  return {
    success: true,
    transactionId,
    amount,
    currency,
    method: 'amazon_pay',
    timestamp: new Date(),
    amazonOrderId,
    message: 'Payment processed successfully via Amazon Pay'
  };
}

/**
 * Refund Amazon payment
 */
export async function refundAmazonPayment(
  transactionId: string,
  amount: number
): Promise<AmazonPaymentResult> {
  // Simulate Amazon Pay refund API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const refundId = `AMZN_REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  return {
    success: true,
    transactionId: refundId,
    amount,
    currency: 'USD',
    method: 'amazon_refund',
    timestamp: new Date(),
    message: `Amazon Pay refund processed for transaction ${transactionId}`
  };
}

/**
 * Check Amazon payment status
 */
export async function checkAmazonPaymentStatus(transactionId: string): Promise<{
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  transactionId: string;
  amazonOrderId?: string;
}> {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    status: 'completed',
    transactionId,
    amazonOrderId: `AMZ-${Date.now()}`
  };
}

/**
 * Get Amazon Pay button configuration
 */
export function getAmazonPayConfig() {
  return {
    merchantId: 'TEST_MERCHANT_ID',
    sandbox: true,
    region: 'US',
    currency: 'USD',
    buttonColor: 'Gold',
    buttonSize: 'medium'
  };
}
