import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { createNotification, createNotificationForMany } from '../notifications/createNotification';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const VALID_STATUSES = ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'refunded'];
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

/**
 * Validate order data on creation
 */
export const onOrderCreate = onDocumentCreated('orders/{orderId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const errors: string[] = [];

  if (!data.customerId || typeof data.customerId !== 'string') {
    errors.push('Missing or invalid customerId');
  }
  if (!data.productId || typeof data.productId !== 'string') {
    errors.push('Missing or invalid productId');
  }
  if (!data.orderNumber || typeof data.orderNumber !== 'string') {
    errors.push('Missing or invalid orderNumber');
  }
  if (data.status !== 'pending') {
    errors.push('New orders must have status "pending"');
  }
  if (data.payment?.amount !== undefined && (typeof data.payment.amount !== 'number' || data.payment.amount < 0)) {
    errors.push('Payment amount must be a non-negative number');
  }

  if (errors.length > 0) {
    console.error(`Order ${event.params.orderId} validation failed:`, errors);
    // Mark the order as invalid rather than deleting it
    await event.data?.ref.update({
      _validationErrors: errors,
      _validatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  // Mark as validated
  await event.data?.ref.update({
    _validatedAt: FieldValue.serverTimestamp(),
  });

  // Notify customer that their order was placed
  await createNotification({
    userId: data.customerId,
    type: 'order_placed',
    title: 'Order Confirmed',
    body: `Your order ${data.orderNumber} has been placed. A technician will accept it soon.`,
    link: `/customer/orders/${event.params.orderId}`,
    metadata: { orderId: event.params.orderId, orderNumber: data.orderNumber },
  });

  // Fan-out "new job available" notification to all approved technicians
  // (optionally filtered by sub-contractor if the product/service is scoped)
  try {
    const techSnap = await db
      .collection('users')
      .where('role', '==', 'technician')
      .where('technicianStatus', '==', 'approved')
      .where('active', '==', true)
      .get();

    const technicianIds = techSnap.docs.map((d) => d.id);
    if (technicianIds.length > 0) {
      await createNotificationForMany(technicianIds, {
        type: 'new_job_available',
        title: 'New Job Available',
        body: `Order ${data.orderNumber} is waiting for a technician to accept.`,
        link: '/technician',
        metadata: { orderId: event.params.orderId, orderNumber: data.orderNumber },
      });
    }
  } catch (err) {
    console.error('Failed to fan-out new-job notification:', err);
  }
});

/**
 * Validate order status transitions on update
 */
export const onOrderUpdate = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const oldStatus = before.status;
  const newStatus = after.status;

  // Status didn't change -- nothing to validate
  if (oldStatus === newStatus) return;

  // Validate the status value
  if (!VALID_STATUSES.includes(newStatus)) {
    console.error(`Order ${event.params.orderId}: invalid status "${newStatus}"`);
    await event.data?.after.ref.update({
      status: oldStatus,
      _lastRejectedTransition: { from: oldStatus, to: newStatus, reason: 'Invalid status value' },
    });
    return;
  }

  // Validate the transition
  const allowed = VALID_TRANSITIONS[oldStatus] || [];
  if (!allowed.includes(newStatus)) {
    console.error(`Order ${event.params.orderId}: invalid transition ${oldStatus} -> ${newStatus}`);
    await event.data?.after.ref.update({
      status: oldStatus,
      _lastRejectedTransition: { from: oldStatus, to: newStatus, reason: `Cannot transition from ${oldStatus} to ${newStatus}` },
    });
    return;
  }

  // Validate technician assignment for acceptance
  if (newStatus === 'accepted' && !after.technicianId) {
    console.error(`Order ${event.params.orderId}: accepted without technicianId`);
    await event.data?.after.ref.update({
      status: oldStatus,
      _lastRejectedTransition: { from: oldStatus, to: newStatus, reason: 'Cannot accept order without technicianId' },
    });
    return;
  }

  // Update customer order count on completion
  if (newStatus === 'completed' && after.customerId) {
    const customerRef = db.doc(`customers/${after.customerId}`);
    const customerSnap = await customerRef.get();
    if (customerSnap.exists) {
      await customerRef.update({
        orders: FieldValue.increment(1),
        totalSpent: FieldValue.increment(after.payment?.amount || 0),
      });
    }
  }

  // Notify customer on status transitions
  const orderLink = `/customer/orders/${event.params.orderId}`;
  const orderNumber = after.orderNumber;
  const notificationMap: Record<string, { type: 'order_accepted' | 'order_started' | 'order_completed' | 'order_cancelled'; title: string; body: string }> = {
    accepted: {
      type: 'order_accepted',
      title: 'Technician Assigned',
      body: `${after.technicianInfo?.name || 'A technician'} has accepted your order ${orderNumber}.`,
    },
    in_progress: {
      type: 'order_started',
      title: 'Installation Started',
      body: `Your technician has started the installation for order ${orderNumber}.`,
    },
    completed: {
      type: 'order_completed',
      title: 'Installation Complete',
      body: `Your installation for order ${orderNumber} is complete. Please rate your experience!`,
    },
    cancelled: {
      type: 'order_cancelled',
      title: 'Order Cancelled',
      body: `Your order ${orderNumber} has been cancelled.`,
    },
  };

  const notifData = notificationMap[newStatus];
  if (notifData && after.customerId) {
    await createNotification({
      userId: after.customerId,
      ...notifData,
      link: orderLink,
      metadata: { orderId: event.params.orderId, orderNumber },
    });
  }
});
