import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Review, Order } from '@/types';
import { logTransaction } from './transactionService';

const EDIT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

function docToReview(docSnap: QueryDocumentSnapshot<DocumentData>): Review {
  return { id: docSnap.id, ...docSnap.data() } as Review;
}

// --- Queries ---

export async function getReviewForOrder(orderId: string): Promise<Review | null> {
  const reviewDoc = await getDoc(doc(db, 'reviews', orderId));
  if (!reviewDoc.exists()) return null;
  return { id: reviewDoc.id, ...reviewDoc.data() } as Review;
}

export async function getReviewsForTechnician(
  technicianId: string,
  pageSize: number = 10,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedResult<Review>> {
  const constraints = [
    where('technicianId', '==', technicianId),
    where('hidden', '==', false),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1),
  ];

  const q = cursor
    ? query(collection(db, 'reviews'), ...constraints, startAfter(cursor))
    : query(collection(db, 'reviews'), ...constraints);

  const snapshot = await getDocs(q);
  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  return {
    items: docs.map(docToReview),
    hasMore,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
  };
}

// --- Mutations ---

export async function createReview(
  orderId: string,
  customerId: string,
  rating: number,
  comment?: string
): Promise<string> {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 1 and 5');
  }

  const orderDoc = await getDoc(doc(db, 'orders', orderId));
  if (!orderDoc.exists()) {
    throw new Error('Order not found');
  }
  const orderData = orderDoc.data() as Order;

  if (orderData.status !== 'completed') {
    throw new Error('Cannot review an order that is not completed');
  }
  if (orderData.customerId !== customerId) {
    throw new Error('Not authorized to review this order');
  }

  // Client-side duplicate check (server-side enforced by Firestore rules via !exists())
  const existing = await getReviewForOrder(orderId);
  if (existing) {
    throw new Error('Review already exists for this order');
  }

  const now = Timestamp.now();
  const editableUntil = Timestamp.fromMillis(now.toMillis() + EDIT_WINDOW_MS);

  const technicianId = orderData.technicianId || '';

  // Denormalize names once at write time so admin views don't need a per-row user lookup.
  // Missing user docs fall back to empty strings; the admin view has a fallback path.
  const [customerSnap, technicianSnap] = await Promise.all([
    getDoc(doc(db, 'users', customerId)),
    technicianId ? getDoc(doc(db, 'users', technicianId)) : Promise.resolve(null),
  ]);
  const customerName = (customerSnap.exists() ? (customerSnap.data().displayName as string) : '') || '';
  const technicianName =
    (technicianSnap && technicianSnap.exists() ? (technicianSnap.data().displayName as string) : '') || '';

  // Document ID = orderId — guarantees one review per order at the Firestore level
  const reviewRef = doc(db, 'reviews', orderId);
  await setDoc(reviewRef, {
    orderId,
    customerId,
    customerName,
    technicianId,
    technicianName,
    rating,
    comment: comment || '',
    createdAt: now,
    updatedAt: now,
    editableUntil,
    flagged: false,
    hidden: false,
  });

  await logTransaction({
    type: 'review_created',
    orderId,
    customerId,
    technicianId: orderData.technicianId || '',
    metadata: { reviewId: orderId, rating, hasComment: !!comment },
    performedBy: customerId,
    performedByRole: 'customer',
  });

  return orderId;
}

export async function updateReview(
  reviewId: string,
  customerId: string,
  rating: number,
  comment?: string
): Promise<void> {
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 1 and 5');
  }

  const reviewDoc = await getDoc(doc(db, 'reviews', reviewId));
  if (!reviewDoc.exists()) {
    throw new Error('Review not found');
  }

  const data = reviewDoc.data();
  if (data.customerId !== customerId) {
    throw new Error('Not authorized to edit this review');
  }

  if (data.editableUntil) {
    const windowEnd = data.editableUntil.toDate();
    if (new Date() > windowEnd) {
      throw new Error('Edit window has expired');
    }
  }

  const now = Timestamp.now();
  const updateData: Record<string, unknown> = {
    rating,
    updatedAt: now,
  };
  if (comment !== undefined) {
    updateData.comment = comment;
  }

  await updateDoc(doc(db, 'reviews', reviewId), updateData);

  await logTransaction({
    type: 'review_updated',
    orderId: data.orderId,
    customerId,
    technicianId: data.technicianId,
    metadata: { reviewId, rating, previousRating: data.rating },
    performedBy: customerId,
    performedByRole: 'customer',
  });
}

export async function flagReview(
  reviewId: string,
  reason: string,
  adminId: string
): Promise<void> {
  await updateDoc(doc(db, 'reviews', reviewId), {
    flagged: true,
    flaggedReason: reason,
    updatedAt: Timestamp.now(),
  });

  await logTransaction({
    type: 'review_flagged',
    metadata: { reviewId, reason },
    performedBy: adminId,
    performedByRole: 'admin',
  });
}

export async function hideReview(
  reviewId: string,
  hidden: boolean,
  adminId: string
): Promise<void> {
  await updateDoc(doc(db, 'reviews', reviewId), {
    hidden,
    updatedAt: Timestamp.now(),
  });

  await logTransaction({
    type: hidden ? 'review_hidden' : 'review_unhidden',
    metadata: { reviewId },
    performedBy: adminId,
    performedByRole: 'admin',
  });
}

export async function restoreReview(reviewId: string, adminId: string): Promise<void> {
  await updateDoc(doc(db, 'reviews', reviewId), {
    flagged: false,
    flaggedReason: '',
    hidden: false,
    updatedAt: Timestamp.now(),
  });

  await logTransaction({
    type: 'review_restored',
    metadata: { reviewId },
    performedBy: adminId,
    performedByRole: 'admin',
  });
}
