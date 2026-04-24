// @deprecated Use reviewService.ts instead. This file is kept for backward compatibility.
import { doc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { addCustomerHistoryRecord } from './customerHistoryService';

interface SubmitRatingInput {
  orderId: string;
  orderNumber: string;
  customerId: string;
  installerId: string;
  subContractorId: string;
  score: number;
  review: string;
  categories: {
    punctuality: number;
    professionalism: number;
    quality: number;
    cleanliness: number;
  };
}

export async function submitRating(input: SubmitRatingInput): Promise<void> {
  const { orderId, orderNumber, customerId, installerId, subContractorId, score, review, categories } = input;

  // Update order with rating summary
  await updateDoc(doc(db, 'orders', orderId), {
    rating: {
      score,
      review,
      ratedAt: Timestamp.now(),
    },
  });

  // Create detailed review document
  await addDoc(collection(db, 'reviews'), {
    orderId,
    customerId,
    installerId,
    subContractorId,
    rating: score,
    review,
    categories,
    images: [],
    helpful: 0,
    createdAt: Timestamp.now(),
  });

  // Log customer history
  await addCustomerHistoryRecord({
    customerId,
    type: 'order_rated',
    title: 'Review Submitted',
    description: `Rated order ${orderNumber} with ${score}/5 stars`,
    orderId,
  });
}
