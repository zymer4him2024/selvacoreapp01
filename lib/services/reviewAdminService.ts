// Review Admin Service — server-side queries for the admin reviews page.
// All filtering is server-side; index-backed (see firestore.indexes.json).
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Review } from '@/types';

export type ReviewTab = 'active' | 'flagged' | 'hidden';

export interface ReviewListFilters {
  tab: ReviewTab;
  technicianId?: string;
  rating?: number; // 1-5; only allowed on 'active' tab per filter policy
}

export interface PaginatedReviews {
  items: Review[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

export interface ReviewStats {
  reviewsThisMonth: number;
  flaggedPercentThisMonth: number;
  platformAvgRating: number;
  techniciansBelow3_5: number;
}

const PAGE_SIZE = 20;
const LOW_RATING_THRESHOLD = 3.5;

function docToReview(docSnap: QueryDocumentSnapshot<DocumentData>): Review {
  return { id: docSnap.id, ...docSnap.data() } as Review;
}

function buildConstraints(filters: ReviewListFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (filters.technicianId) {
    constraints.push(where('technicianId', '==', filters.technicianId));
  }

  if (filters.tab === 'active') {
    constraints.push(where('hidden', '==', false));
    if (filters.rating) constraints.push(where('rating', '==', filters.rating));
  } else if (filters.tab === 'flagged') {
    constraints.push(where('flagged', '==', true));
    constraints.push(where('hidden', '==', false));
  } else {
    constraints.push(where('hidden', '==', true));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  return constraints;
}

export async function getReviewsPaginated(
  filters: ReviewListFilters,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedReviews> {
  const constraints = buildConstraints(filters);
  const pageConstraints: QueryConstraint[] = cursor
    ? [...constraints, startAfter(cursor), limit(PAGE_SIZE + 1)]
    : [...constraints, limit(PAGE_SIZE + 1)];

  const snapshot = await getDocs(query(collection(db, 'reviews'), ...pageConstraints));
  const hasMore = snapshot.docs.length > PAGE_SIZE;
  const docs = hasMore ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;
  const items = docs.map(docToReview);

  // Fallback: hydrate missing denormalized names for pre-existing reviews.
  // Batched per page so the UI doesn't re-fetch for newly-written rows.
  await hydrateMissingNames(items);

  return {
    items,
    hasMore,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
  };
}

async function hydrateMissingNames(reviews: Review[]): Promise<void> {
  const missingUserIds = new Set<string>();
  for (const r of reviews) {
    if (!r.customerName && r.customerId) missingUserIds.add(r.customerId);
    if (!r.technicianName && r.technicianId) missingUserIds.add(r.technicianId);
  }
  if (missingUserIds.size === 0) return;

  const nameMap = new Map<string, string>();
  await Promise.all(
    Array.from(missingUserIds).map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const name = (snap.data().displayName as string) || '';
        if (name) nameMap.set(uid, name);
      }
    })
  );

  for (const r of reviews) {
    if (!r.customerName && r.customerId) r.customerName = nameMap.get(r.customerId) || '';
    if (!r.technicianName && r.technicianId) r.technicianName = nameMap.get(r.technicianId) || '';
  }
}

function monthBoundsUTC(ref: Date = new Date()): { start: Timestamp; end: Timestamp } {
  const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start: Timestamp.fromDate(start), end: Timestamp.fromDate(end) };
}

export async function getReviewStats(): Promise<ReviewStats> {
  const { start, end } = monthBoundsUTC();

  const monthSnap = await getDocs(
    query(
      collection(db, 'reviews'),
      where('createdAt', '>=', start),
      where('createdAt', '<', end)
    )
  );
  const monthDocs = monthSnap.docs.map((d) => d.data() as Review);
  const reviewsThisMonth = monthDocs.length;
  const flaggedThisMonth = monthDocs.filter((r) => r.flagged).length;
  const flaggedPercentThisMonth =
    reviewsThisMonth > 0 ? Math.round((flaggedThisMonth / reviewsThisMonth) * 100) : 0;

  // Platform-wide avg rating — computed over non-hidden reviews.
  const activeSnap = await getDocs(
    query(collection(db, 'reviews'), where('hidden', '==', false))
  );
  const activeDocs = activeSnap.docs.map((d) => d.data() as Review);
  const platformAvgRating =
    activeDocs.length > 0
      ? Math.round((activeDocs.reduce((s, r) => s + r.rating, 0) / activeDocs.length) * 10) / 10
      : 0;

  const techniciansBelow3_5 = await getTechniciansBelowRating(LOW_RATING_THRESHOLD);

  return { reviewsThisMonth, flaggedPercentThisMonth, platformAvgRating, techniciansBelow3_5 };
}

export async function getTechniciansBelowRating(threshold: number): Promise<number> {
  // Uses denormalized averageRating on the user doc (maintained by reviewTriggers Cloud Function).
  // Excludes technicians who have never received a review (totalReviews == 0 or undefined).
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'technician'))
  );
  let count = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const total = (data.totalReviews as number | undefined) ?? 0;
    const avg = data.averageRating as number | undefined;
    if (total > 0 && typeof avg === 'number' && avg < threshold) count += 1;
  }
  return count;
}
