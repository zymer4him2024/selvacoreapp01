// Fallback Order Service
// Saves orders locally when Firestore fails

export interface FallbackOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  productId: string;
  serviceId: string;
  variationId?: string;
  addressId: string;
  installationDate: string;
  timeSlot: string;
  total: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
  paymentMethod: string;
  transactionId: string;
}

const FALLBACK_ORDERS_KEY = 'selvacore_fallback_orders';

/**
 * Save order to local storage as fallback
 */
export function saveFallbackOrder(order: Omit<FallbackOrder, 'id' | 'createdAt'>): string {
  try {
    const orders = getFallbackOrders();
    const newOrder: FallbackOrder = {
      ...order,
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    orders.push(newOrder);
    localStorage.setItem(FALLBACK_ORDERS_KEY, JSON.stringify(orders));
    
    console.log('✅ Order saved to fallback storage:', newOrder.id);
    return newOrder.id;
  } catch (error) {
    console.error('❌ Failed to save fallback order:', error);
    throw new Error('Failed to save order locally');
  }
}

/**
 * Get all fallback orders for a customer
 */
export function getFallbackOrders(customerId?: string): FallbackOrder[] {
  try {
    const ordersStr = localStorage.getItem(FALLBACK_ORDERS_KEY);
    if (!ordersStr) return [];
    
    const orders: FallbackOrder[] = JSON.parse(ordersStr);
    
    if (customerId) {
      return orders.filter(order => order.customerId === customerId);
    }
    
    return orders;
  } catch (error) {
    console.error('❌ Failed to get fallback orders:', error);
    return [];
  }
}

/**
 * Get a specific fallback order
 */
export function getFallbackOrder(orderId: string): FallbackOrder | null {
  try {
    const orders = getFallbackOrders();
    return orders.find(order => order.id === orderId) || null;
  } catch (error) {
    console.error('❌ Failed to get fallback order:', error);
    return null;
  }
}

/**
 * Update fallback order status
 */
export function updateFallbackOrderStatus(orderId: string, status: FallbackOrder['status']): boolean {
  try {
    const orders = getFallbackOrders();
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) return false;
    
    orders[orderIndex].status = status;
    localStorage.setItem(FALLBACK_ORDERS_KEY, JSON.stringify(orders));
    
    console.log('✅ Fallback order status updated:', orderId, status);
    return true;
  } catch (error) {
    console.error('❌ Failed to update fallback order:', error);
    return false;
  }
}

/**
 * Clear all fallback orders (for testing)
 */
export function clearFallbackOrders(): void {
  try {
    localStorage.removeItem(FALLBACK_ORDERS_KEY);
    console.log('✅ Fallback orders cleared');
  } catch (error) {
    console.error('❌ Failed to clear fallback orders:', error);
  }
}

/**
 * Sync fallback orders to Firestore when possible
 */
export async function syncFallbackOrdersToFirestore(): Promise<number> {
  try {
    const orders = getFallbackOrders();
    let syncedCount = 0;
    
    for (const order of orders) {
      try {
        // Try to save to Firestore
        const { collection, addDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');
        
        await addDoc(collection(db, 'orders'), {
          orderNumber: order.orderNumber,
          customerId: order.customerId,
          productId: order.productId,
          serviceId: order.serviceId,
          variationId: order.variationId,
          addressId: order.addressId,
          installationDate: order.installationDate,
          timeSlot: order.timeSlot,
          total: order.total,
          currency: order.currency,
          status: order.status,
          paymentMethod: order.paymentMethod,
          transactionId: order.transactionId,
          createdAt: order.createdAt,
          isFallback: true // Mark as synced from fallback
        });
        
        // Remove from fallback storage after successful sync
        const updatedOrders = orders.filter(o => o.id !== order.id);
        localStorage.setItem(FALLBACK_ORDERS_KEY, JSON.stringify(updatedOrders));
        syncedCount++;
        
        console.log('✅ Fallback order synced to Firestore:', order.id);
      } catch (error) {
        console.log('⚠️ Could not sync fallback order to Firestore:', order.id);
        // Keep in fallback storage if Firestore fails
      }
    }
    
    return syncedCount;
  } catch (error) {
    console.error('❌ Failed to sync fallback orders:', error);
    return 0;
  }
}
