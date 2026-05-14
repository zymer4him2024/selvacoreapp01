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
    iconBg: string,
    label: string,
    value: string,
    tooltip?: string
  ) => (
    <div className="sc-card-static" title={tooltip} style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          background: iconBg,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="sc-helper" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
          <p style={{ fontSize: 22, fontWeight: 700, marginTop: 2, marginBottom: 0, color: 'var(--ink)' }}>{value}</p>
        </div>
      </div>
    </div>
  );

  const dash = loading ? '…' : '—';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
      {tile(
        <MessageSquare size={20} color="var(--brand)" />,
        'var(--brand-tint)',
        r.statsReviewsThisMonth,
        stats ? String(stats.reviewsThisMonth) : dash
      )}
      {tile(
        <Flag size={20} color="var(--warn)" />,
        'var(--warn-tint)',
        r.statsFlaggedPercentThisMonth,
        stats ? `${stats.flaggedPercentThisMonth}%` : dash
      )}
      {tile(
        <Star size={20} color="var(--warn)" />,
        'var(--warn-tint)',
        r.statsPlatformAvgRating,
        stats && stats.platformAvgRating > 0 ? stats.platformAvgRating.toFixed(1) : dash
      )}
      {tile(
        <AlertTriangle size={20} color="#ef4444" />,
        'rgba(239,68,68,0.15)',
        r.statsTechniciansBelow,
        stats ? String(stats.techniciansBelow3_5) : dash,
        lowRatingTooltip
      )}
    </div>
  );
}
