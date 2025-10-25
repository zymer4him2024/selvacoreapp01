// Test Order Service
// Creates sample orders for testing the My Orders functionality

import { saveFallbackOrder, FallbackOrder } from './fallbackOrderService';

export interface TestOrderData {
  customerId: string;
  productName: string;
  serviceName: string;
  total: number;
  currency: string;
}

/**
 * Create a test order for immediate testing
 */
export function createTestOrder(data: TestOrderData): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  const orderNumber = `TEST-${timestamp}-${randomSuffix}`;
  
  const testOrder: Omit<FallbackOrder, 'id' | 'createdAt'> = {
    orderNumber,
    customerId: data.customerId,
    productId: `test-product-${timestamp}`,
    serviceId: `test-service-${timestamp}`,
    variationId: `test-variation-${timestamp}`,
    addressId: `test-address-${timestamp}`,
    installationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    timeSlot: 'Morning (9:00 AM - 12:00 PM)',
    total: data.total,
    currency: data.currency,
    status: 'pending',
    paymentMethod: 'test_payment',
    transactionId: `TEST_TXN_${timestamp}_${randomSuffix}`
  };

  console.log('🧪 Creating test order:', testOrder);
  return saveFallbackOrder(testOrder);
}

/**
 * Create multiple test orders for comprehensive testing
 */
export function createMultipleTestOrders(customerId: string): string[] {
  const testOrders = [
    {
      customerId,
      productName: 'Water Purification System Pro',
      serviceName: 'Professional Installation',
      total: 1250.00,
      currency: 'USD'
    },
    {
      customerId,
      productName: 'Basic Water Filter',
      serviceName: 'Standard Installation',
      total: 350.00,
      currency: 'USD'
    },
    {
      customerId,
      productName: 'Premium Water System',
      serviceName: 'Express Installation',
      total: 2100.00,
      currency: 'USD'
    }
  ];

  const orderIds: string[] = [];
  
  // Create orders immediately without setTimeout
  testOrders.forEach((orderData, index) => {
    try {
      const orderId = createTestOrder(orderData);
      orderIds.push(orderId);
      console.log(`✅ Test order ${index + 1} created:`, orderId);
    } catch (error) {
      console.error(`❌ Failed to create test order ${index + 1}:`, error);
    }
  });

  return orderIds;
}

/**
 * Clear all test orders
 */
export function clearTestOrders(): void {
  const { clearFallbackOrders } = require('./fallbackOrderService');
  clearFallbackOrders();
  console.log('🧹 All test orders cleared');
}
