// Order Service - Handle all order operations
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order, OrderStatus } from '@/types';
import { generateOrderNumber } from '@/lib/utils/formatters';
import { logTransaction } from './transactionService';

/**
 * Get all orders
 */
export async function getAllOrders(): Promise<Order[]> {
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Order));
}

/**
 * Get single order by ID
 */
export async function getOrderById(id: string): Promise<Order | null> {
  const docRef = doc(db, 'orders', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Order;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string,
  userId?: string
): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  const order = await getOrderById(orderId);
  
  if (!order) throw new Error('Order not found');

  const statusHistory = [
    ...(order.statusHistory || []),
    {
      status: newStatus,
      timestamp: Timestamp.now(),
      note: note || '',
      changedBy: userId || 'system',
    },
  ];

  const updates: any = {
    status: newStatus,
    statusHistory,
  };

  // Update specific timestamps
  if (newStatus === 'accepted') updates.acceptedAt = Timestamp.now();
  if (newStatus === 'in_progress') updates.startedAt = Timestamp.now();
  if (newStatus === 'completed') updates.completedAt = Timestamp.now();
  if (newStatus === 'cancelled') updates.cancelledAt = Timestamp.now();

  await updateDoc(docRef, updates);

  // Log transaction
  await logTransaction({
    type: `order_${newStatus}` as any,
    orderId,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    technicianId: order.technicianId || undefined,
    subContractorId: order.subContractorId || undefined,
    metadata: {
      previousStatus: order.status,
      newStatus,
      note,
    },
    performedBy: userId || 'system',
    performedByRole: 'admin',
  });
}

/**
 * Cancel order with refund
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  cancelledBy: 'customer' | 'installer' | 'admin',
  userId: string
): Promise<void> {
  const docRef = doc(db, 'orders', orderId);

  await updateDoc(docRef, {
    status: 'cancelled',
    cancelledAt: Timestamp.now(),
    cancellation: {
      reason,
      cancelledBy,
      refundIssued: true,
      timestamp: Timestamp.now(),
    },
  });

  await updateOrderStatus(orderId, 'cancelled', reason, userId);
}

