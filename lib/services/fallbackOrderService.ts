// Fallback Order Service
// Saves orders locally when Firestore fails

export interface FallbackOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  productId: string;
  serviceId: string | null;
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
    
    // Check for duplicate order numbers and generate unique one if needed
    let orderNumber = order.orderNumber;
    let counter = 1;
    while (orders.some(o => o.orderNumber === orderNumber)) {
      orderNumber = `${order.orderNumber}-${counter}`;
      counter++;
    }
    
    const newOrder: FallbackOrder = {
      ...order,
      orderNumber, // Use the unique order number
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    orders.push(newOrder);
    localStorage.setItem(FALLBACK_ORDERS_KEY, JSON.stringify(orders));
    
    return newOrder.id;
  } catch (error) {
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
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all fallback orders (for testing)
 */
export function clearFallbackOrders(): void {
  try {
    localStorage.removeItem(FALLBACK_ORDERS_KEY);
  } catch {
    // localStorage unavailable — no action needed
  }
}

/**
 * Sync fallback orders to Firestore when possible
 */
export async function syncFallbackOrdersToFirestore(): Promise<number> {
  try {
    const orders = getFallbackOrders();
    const syncedIds: string[] = [];

    const { collection, addDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/config');

    for (const order of orders) {
      try {
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
          isFallback: true,
        });

        syncedIds.push(order.id);
      } catch {
        // Keep in fallback storage if Firestore fails
      }
    }

    // Remove all synced orders at once after iteration
    if (syncedIds.length > 0) {
      const remaining = orders.filter(o => !syncedIds.includes(o.id));
      localStorage.setItem(FALLBACK_ORDERS_KEY, JSON.stringify(remaining));
    }

    return syncedIds.length;
  } catch {
    return 0;
  }
}
