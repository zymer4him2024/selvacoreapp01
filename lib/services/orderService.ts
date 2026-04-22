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
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order, OrderStatus, TransactionType } from '@/types';
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

export interface PaginatedResult<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Get orders with cursor-based pagination
 */
export async function getOrdersPaginated(
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  statusFilter?: string
): Promise<PaginatedResult<Order>> {
  const ordersRef = collection(db, 'orders');
  const hasStatus = statusFilter && statusFilter !== 'all';

  let q;
  if (hasStatus && lastDoc) {
    q = query(ordersRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize + 1));
  } else if (hasStatus) {
    q = query(ordersRef, where('status', '==', statusFilter), orderBy('createdAt', 'desc'), limit(pageSize + 1));
  } else if (lastDoc) {
    q = query(ordersRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize + 1));
  } else {
    q = query(ordersRef, orderBy('createdAt', 'desc'), limit(pageSize + 1));
  }

  const snapshot = await getDocs(q);

  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  return {
    items: docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
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

// Map order status to transaction type
const statusToTransactionType: Partial<Record<OrderStatus, TransactionType>> = {
  accepted: 'order_accepted',
  in_progress: 'order_started',
  completed: 'order_completed',
  cancelled: 'order_cancelled',
};

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

  const updates: Record<string, unknown> = {
    status: newStatus,
    statusHistory,
  };

  if (newStatus === 'accepted') updates.acceptedAt = Timestamp.now();
  if (newStatus === 'in_progress') updates.startedAt = Timestamp.now();
  if (newStatus === 'completed') updates.completedAt = Timestamp.now();
  if (newStatus === 'cancelled') updates.cancelledAt = Timestamp.now();

  await updateDoc(docRef, updates);

  const transactionType = statusToTransactionType[newStatus];
  if (transactionType) {
    await logTransaction({
      type: transactionType,
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
}

/**
 * Cancel order with refund (single atomic update)
 */
export async function cancelOrder(
  orderId: string,
  reason: string,
  cancelledBy: 'customer' | 'installer' | 'admin',
  userId: string
): Promise<void> {
  const docRef = doc(db, 'orders', orderId);
  const order = await getOrderById(orderId);

  if (!order) throw new Error('Order not found');

  await updateDoc(docRef, {
    status: 'cancelled',
    cancelledAt: Timestamp.now(),
    cancellation: {
      reason,
      cancelledBy,
      refundIssued: true,
      timestamp: Timestamp.now(),
    },
    statusHistory: [
      ...(order.statusHistory || []),
      {
        status: 'cancelled',
        timestamp: Timestamp.now(),
        note: reason,
        changedBy: userId,
      },
    ],
  });

  await logTransaction({
    type: 'order_cancelled',
    orderId,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    technicianId: order.technicianId || undefined,
    subContractorId: order.subContractorId || undefined,
    metadata: {
      previousStatus: order.status,
      newStatus: 'cancelled',
      reason,
      cancelledBy,
    },
    performedBy: userId,
    performedByRole: cancelledBy === 'admin' ? 'admin' : 'customer',
  });
}

/**
 * Get orders for a given week (by scheduledAt, falling back to installationDate)
 */
export async function getOrdersForWeek(weekStart: Date, weekEnd: Date): Promise<Order[]> {
  const ordersRef = collection(db, 'orders');

  // Fetch orders with scheduledAt in range
  const scheduledQ = query(
    ordersRef,
    where('scheduledAt', '>=', Timestamp.fromDate(weekStart)),
    where('scheduledAt', '<=', Timestamp.fromDate(weekEnd)),
  );
  const scheduledSnap = await getDocs(scheduledQ);
  const scheduledOrders = scheduledSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));

  // Also fetch assigned orders that lack scheduledAt (fallback to installationDate)
  const fallbackQ = query(
    ordersRef,
    where('installationDate', '>=', Timestamp.fromDate(weekStart)),
    where('installationDate', '<=', Timestamp.fromDate(weekEnd)),
  );
  const fallbackSnap = await getDocs(fallbackQ);
  const fallbackOrders = fallbackSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Order))
    .filter((o) => !o.scheduledAt && o.technicianId);

  // Deduplicate by id
  const seen = new Set(scheduledOrders.map((o) => o.id));
  const combined = [...scheduledOrders];
  for (const o of fallbackOrders) {
    if (!seen.has(o.id)) combined.push(o);
  }

  return combined.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');
}

/**
 * Get unassigned orders (pending, no technician)
 */
export async function getUnassignedOrders(): Promise<Order[]> {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Order))
    .filter((o) => !o.technicianId);
}

/**
 * Get all active orders (for sidebar "All Active" view)
 */
export async function getActiveOrders(): Promise<Order[]> {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('status', 'in', ['pending', 'accepted', 'in_progress']),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

/**
 * Assign an order to a technician (admin dispatch)
 */
export async function assignOrderToTechnician(
  orderId: string,
  technicianId: string,
  technicianInfo: { name: string; phone: string; whatsapp: string; photo: string; rating: number },
  scheduledAt: Date,
  timeSlot: string,
  estimatedDurationMinutes: number,
  adminId: string,
): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');

    const order = orderSnap.data() as Order;

    transaction.update(orderRef, {
      technicianId,
      technicianInfo,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      timeSlot,
      estimatedDurationMinutes,
      status: 'accepted',
      acceptedAt: Timestamp.now(),
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'accepted',
          timestamp: Timestamp.now(),
          note: `Assigned to ${technicianInfo.name} by admin`,
          changedBy: adminId,
        },
      ],
    });
  });

  const order = await getOrderById(orderId);
  if (order) {
    await logTransaction({
      type: 'order_accepted',
      orderId,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      technicianId,
      metadata: { assignedBy: adminId, scheduledAt: scheduledAt.toISOString() },
      performedBy: adminId,
      performedByRole: 'admin',
    });
  }
}

/**
 * Reassign an order to a different technician (admin dispatch)
 */
export async function reassignOrder(
  orderId: string,
  newTechnicianId: string,
  newTechnicianInfo: { name: string; phone: string; whatsapp: string; photo: string; rating: number },
  scheduledAt: Date,
  timeSlot: string,
  estimatedDurationMinutes: number,
  adminId: string,
): Promise<{ previousTechnicianId: string | null }> {
  const orderRef = doc(db, 'orders', orderId);
  let previousTechnicianId: string | null = null;

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');

    const order = orderSnap.data() as Order;
    previousTechnicianId = order.technicianId;

    transaction.update(orderRef, {
      technicianId: newTechnicianId,
      technicianInfo: newTechnicianInfo,
      scheduledAt: Timestamp.fromDate(scheduledAt),
      timeSlot,
      estimatedDurationMinutes,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: order.status,
          timestamp: Timestamp.now(),
          note: `Reassigned to ${newTechnicianInfo.name} by admin`,
          changedBy: adminId,
        },
      ],
    });
  });

  const order = await getOrderById(orderId);
  if (order) {
    await logTransaction({
      type: 'order_accepted',
      orderId,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      technicianId: newTechnicianId,
      metadata: {
        reassignedBy: adminId,
        previousTechnicianId,
        scheduledAt: scheduledAt.toISOString(),
      },
      performedBy: adminId,
      performedByRole: 'admin',
    });
  }

  return { previousTechnicianId };
}

