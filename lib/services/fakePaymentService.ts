// Fake Payment Service for Development
// Replace with real payment integration later

export interface FakePaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  method: string;
  timestamp: Date;
  message?: string;
}

/**
 * Process a fake payment (for development/testing)
 * 90% success rate to simulate real-world scenarios
 */
export async function processFakePayment(
  amount: number,
  currency: string = 'USD'
): Promise<FakePaymentResult> {
  // Simulate API call delay (1-3 seconds)
  const delay = Math.random() * 2000 + 1000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // 90% success rate
  const success = Math.random() > 0.1;
  
  if (!success) {
    throw new Error('Payment declined - Insufficient funds (Simulated Error)');
  }
  
  const transactionId = `FAKE_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  return {
    success: true,
    transactionId,
    amount,
    currency,
    method: 'fake_credit_card',
    timestamp: new Date(),
    message: 'Payment processed successfully (This is a simulated payment)'
  };
}

/**
 * Refund a fake payment
 */
export async function refundFakePayment(
  transactionId: string,
  amount: number
): Promise<FakePaymentResult> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const refundId = `REFUND_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  return {
    success: true,
    transactionId: refundId,
    amount,
    currency: 'USD',
    method: 'fake_refund',
    timestamp: new Date(),
    message: `Refunded transaction ${transactionId} (Simulated Refund)`
  };
}

/**
 * Check payment status
 */
export async function checkFakePaymentStatus(transactionId: string): Promise<{
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  transactionId: string;
}> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    status: 'completed',
    transactionId
  };
}

