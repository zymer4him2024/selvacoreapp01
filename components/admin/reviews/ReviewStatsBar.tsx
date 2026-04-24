'use client';

import { MessageSquare, Flag, Star, AlertTriangle } from 'lucide-react';
import type { ReviewStats } from '@/lib/services/reviewAdminService';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  stats: ReviewStats | null;
  loading: boolean;
  lowRatingTooltip: string;
}

export function ReviewStatsBar({ stats, loading, lowRatingTooltip }: Props) {
  const { t } = useTranslation();
  const r = t.admin.reviews;

  const tile = (
    icon: React.ReactNode,
    label: string,
    value: string,
    tooltip?: string
  ) => (
    <div className="apple-card" title={tooltip}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-apple flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-text-secondary truncate">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );

  const dash = loading ? '…' : '—';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {tile(
        <MessageSquare className="w-5 h-5 text-primary" />,
        r.statsReviewsThisMonth,
        stats ? String(stats.reviewsThisMonth) : dash
      )}
      {tile(
        <Flag className="w-5 h-5 text-warning" />,
        r.statsFlaggedPercentThisMonth,
        stats ? `${stats.flaggedPercentThisMonth}%` : dash
      )}
      {tile(
        <Star className="w-5 h-5 text-warning" />,
        r.statsPlatformAvgRating,
        stats && stats.platformAvgRating > 0 ? stats.platformAvgRating.toFixed(1) : dash
      )}
      {tile(
        <AlertTriangle className="w-5 h-5 text-error" />,
        r.statsTechniciansBelow,
        stats ? String(stats.techniciansBelow3_5) : dash,
        lowRatingTooltip
      )}
    </div>
  );
}
