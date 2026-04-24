'use client';

import { Star } from 'lucide-react';
import type { Review } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { ReviewRow } from './ReviewRow';

interface Props {
  reviews: Review[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRowClick: (review: Review) => void;
}

export function ReviewsTable({ reviews, loading, loadingMore, hasMore, onLoadMore, onRowClick }: Props) {
  const { t } = useTranslation();
  const r = t.admin.reviews;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="apple-card text-center py-16">
        <Star className="w-12 h-12 mx-auto mb-3 text-text-tertiary" />
        <p className="text-text-secondary">{r.emptyState}</p>
      </div>
    );
  }

  return (
    <div className="apple-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-elevated">
            <tr className="text-left text-xs text-text-secondary uppercase">
              <th className="px-4 py-3 font-medium">{r.colRating}</th>
              <th className="px-4 py-3 font-medium">{r.colCustomer}</th>
              <th className="px-4 py-3 font-medium">{r.colTechnician}</th>
              <th className="px-4 py-3 font-medium">{r.colComment}</th>
              <th className="px-4 py-3 font-medium">{r.colDate}</th>
              <th className="px-4 py-3 font-medium">{r.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <ReviewRow key={review.id} review={review} onClick={() => onRowClick(review)} />
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div className="flex justify-center py-4 border-t border-border">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-apple transition-colors disabled:opacity-50"
          >
            {loadingMore ? r.loadingMore : r.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
