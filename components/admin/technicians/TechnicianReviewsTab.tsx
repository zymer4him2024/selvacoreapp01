'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { Review } from '@/types';
import { getReviewsPaginated } from '@/lib/services/reviewAdminService';
import { useTranslation } from '@/hooks/useTranslation';
import { ReviewsTable } from '@/components/admin/reviews/ReviewsTable';
import { ReviewDrawer } from '@/components/admin/reviews/ReviewDrawer';

interface Props {
  technicianId: string;
}

export function TechnicianReviewsTab({ technicianId }: Props) {
  const { t } = useTranslation();
  const r = t.admin.technicianDetail.reviews;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [drawerReview, setDrawerReview] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReviewsPaginated({ tab: 'active', technicianId });
      setReviews(result.items);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await getReviewsPaginated({ tab: 'active', technicianId }, cursor);
      setReviews((prev) => [...prev, ...result.items]);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, cursor, technicianId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">{r.subtitle}</p>
      <ReviewsTable
        reviews={reviews}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onRowClick={setDrawerReview}
      />
      <ReviewDrawer
        review={drawerReview}
        onClose={() => setDrawerReview(null)}
        onChanged={async () => {
          setDrawerReview(null);
          await load();
        }}
      />
    </div>
  );
}
