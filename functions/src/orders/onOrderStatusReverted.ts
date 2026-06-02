import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * When an admin reverts a completed order to any other status, hide the
 * attached review so stale ratings don't skew the technician's score.
 * Closes the v1 gap documented in docs_for_claude/reviews.md §"Migration note:
 * order status reversion".
 */
export const onOrderStatusReverted = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  if (before.status !== 'completed' || after.status === 'completed') return;

  const { orderId } = event.params;

  const reviewRef = db.collection('reviews').doc(orderId);
  const reviewSnap = await reviewRef.get();
  if (!reviewSnap.exists) return;

  const reviewData = reviewSnap.data();
  if (reviewData?.hidden) return;

  await reviewRef.update({
    hidden: true,
    hiddenReason: 'order_status_reverted',
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection('transactions').add({
    type: 'review_auto_hidden',
    orderId,
    customerId: reviewData?.customerId || '',
    technicianId: reviewData?.technicianId || '',
    metadata: {
      reviewId: orderId,
      previousOrderStatus: before.status,
      newOrderStatus: after.status,
    },
    performedBy: 'system',
    performedByRole: 'system',
    createdAt: FieldValue.serverTimestamp(),
  });
});
