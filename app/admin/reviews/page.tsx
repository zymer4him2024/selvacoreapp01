'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { Review } from '@/types';
import {
  getReviewsPaginated,
  getReviewStats,
  type ReviewStats,
  type ReviewTab,
} from '@/lib/services/reviewAdminService';
import { getAllTechnicians } from '@/lib/services/technicianAdminService';
import { useTranslation } from '@/hooks/useTranslation';
import { ReviewStatsBar } from '@/components/admin/reviews/ReviewStatsBar';
import { ReviewFiltersBar } from '@/components/admin/reviews/ReviewFiltersBar';
import { ReviewsTable } from '@/components/admin/reviews/ReviewsTable';
import { ReviewDrawer } from '@/components/admin/reviews/ReviewDrawer';

// Deployment date for the "technicians below 3.5" tooltip.
// See docs_for_claude/reviews.md for the backfill follow-up.
const REVIEWS_DEPLOYMENT_DATE = '2026-04-24';

export default function AdminReviewsPage() {
  const { t } = useTranslation();
  const r = t.admin.reviews;

  const [tab, setTab] = useState<ReviewTab>('active');
  const [technicianId, setTechnicianId] = useState('');
  // Remember the last rating selection so returning to Active restores it.
  const [activeTabRating, setActiveTabRating] = useState<number | null>(null);

  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [drawerReview, setDrawerReview] = useState<Review | null>(null);

  // Rating filter only applies on the Active tab.
  const effectiveRating = tab === 'active' ? activeTabRating : null;

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getReviewStats());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReviewsPaginated({
        tab,
        technicianId: technicianId || undefined,
        rating: effectiveRating ?? undefined,
      });
      setReviews(result.items);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [tab, technicianId, effectiveRating]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const result = await getReviewsPaginated(
        { tab, technicianId: technicianId || undefined, rating: effectiveRating ?? undefined },
        cursor
      );
      setReviews((prev) => [...prev, ...result.items]);
      setCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, cursor, tab, technicianId, effectiveRating]);

  useEffect(() => {
    (async () => {
      const techs = await getAllTechnicians('approved');
      setTechnicians(techs.map((ti) => ({ id: ti.id, name: ti.displayName || ti.email || ti.id })));
    })().catch((err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to load technicians');
    });
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleTabChange = (next: ReviewTab) => {
    if (tab !== next) setTab(next);
  };

  const handleRatingChange = (next: number | null) => {
    setActiveTabRating(next);
  };

  const handleDrawerChanged = async () => {
    setDrawerReview(null);
    await Promise.all([loadPage(), loadStats()]);
  };

  const lowRatingTooltip = useMemo(
    () => r.statsTooltipLowRating.replace('{date}', REVIEWS_DEPLOYMENT_DATE),
    [r.statsTooltipLowRating]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">{r.title}</h1>
        <p className="text-text-secondary mt-1">{r.subtitle}</p>
      </div>

      <ReviewStatsBar stats={stats} loading={statsLoading} lowRatingTooltip={lowRatingTooltip} />

      <ReviewFiltersBar
        tab={tab}
        technicianId={technicianId}
        rating={effectiveRating}
        technicianOptions={technicians}
        onTabChange={handleTabChange}
        onTechnicianChange={setTechnicianId}
        onRatingChange={handleRatingChange}
      />

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
        onChanged={handleDrawerChanged}
      />
    </div>
  );
}
