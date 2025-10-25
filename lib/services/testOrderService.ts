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
  const orderNumber = `TEST-${Date.now()}`;
  
  const testOrder: Omit<FallbackOrder, 'id' | 'createdAt'> = {
    orderNumber,
    customerId: data.customerId,
    productId: 'test-product-123',
    serviceId: 'test-service-456',
    variationId: 'test-variation-789',
    addressId: 'test-address-101',
    installationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    timeSlot: 'Morning (9:00 AM - 12:00 PM)',
    total: data.total,
    currency: data.currency,
    status: 'pending',
    paymentMethod: 'test_payment',
    transactionId: `TEST_TXN_${Date.now()}`
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
  
  testOrders.forEach((orderData, index) => {
    // Stagger creation times to test sorting
    setTimeout(() => {
      const orderId = createTestOrder(orderData);
      orderIds.push(orderId);
      console.log(`✅ Test order ${index + 1} created:`, orderId);
    }, index * 1000); // 1 second delay between orders
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
