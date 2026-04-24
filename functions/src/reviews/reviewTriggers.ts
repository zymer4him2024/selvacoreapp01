import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

interface UserRatingFields {
  averageRating: number;
  totalReviews: number;
}

function addToAverage(old: UserRatingFields | null, newRating: number): UserRatingFields {
  const oldTotal = old?.totalReviews ?? 0;
  const oldAvg = old?.averageRating ?? 0;
  const newTotal = oldTotal + 1;
  const newAvg = (oldAvg * oldTotal + newRating) / newTotal;

  return {
    averageRating: Math.round(newAvg * 100) / 100,
    totalReviews: newTotal,
  };
}

function removeFromAverage(old: UserRatingFields, removedRating: number): UserRatingFields {
  if (old.totalReviews <= 1) {
    return { averageRating: 0, totalReviews: 0 };
  }

  const newTotal = old.totalReviews - 1;
  const newAvg = (old.averageRating * old.totalReviews - removedRating) / newTotal;

  return {
    averageRating: Math.round(newAvg * 100) / 100,
    totalReviews: newTotal,
  };
}

export const onReviewCreated = onDocumentCreated(
  'reviews/{reviewId}',
  async (event) => {
    const reviewData = event.data?.data();
    if (!reviewData) return;

    if (reviewData.hidden) return;

    const technicianId = reviewData.technicianId;
    if (!technicianId) return;

    const userRef = db.collection('users').doc(technicianId);

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const current: UserRatingFields | null = userData?.averageRating != null
        ? { averageRating: userData.averageRating, totalReviews: userData.totalReviews ?? 0 }
        : null;
      const updated = addToAverage(current, reviewData.rating);

      transaction.update(userRef, { ...updated });
    });
  }
);

export const onReviewUpdated = onDocumentUpdated(
  'reviews/{reviewId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const technicianId = after.technicianId;
    if (!technicianId) return;

    const ratingChanged = before.rating !== after.rating;
    const hiddenChanged = before.hidden !== after.hidden;

    if (!ratingChanged && !hiddenChanged) return;

    const userRef = db.collection('users').doc(technicianId);

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const current: UserRatingFields = {
        averageRating: userData?.averageRating ?? 0,
        totalReviews: userData?.totalReviews ?? 0,
      };

      let updated: UserRatingFields;

      if (hiddenChanged) {
        if (!before.hidden && after.hidden) {
          // Was visible, now hidden — subtract
          updated = removeFromAverage(current, before.rating);
        } else if (before.hidden && !after.hidden) {
          // Was hidden, now visible — add
          updated = addToAverage(current, after.rating);
        } else {
          return;
        }
      } else if (ratingChanged) {
        // Rating changed on a visible review — remove old, add new
        if (after.hidden) return;
        const removed = removeFromAverage(current, before.rating);
        updated = addToAverage(removed, after.rating);
      } else {
        return;
      }

      transaction.update(userRef, { ...updated });
    });
  }
);
