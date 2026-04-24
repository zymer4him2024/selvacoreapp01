'use client';

import { X } from 'lucide-react';
import type { ReviewTab } from '@/lib/services/reviewAdminService';
import { useTranslation } from '@/hooks/useTranslation';

interface TechOption {
  id: string;
  name: string;
}

interface Props {
  tab: ReviewTab;
  technicianId: string;
  rating: number | null;
  technicianOptions: TechOption[];
  onTabChange: (tab: ReviewTab) => void;
  onTechnicianChange: (id: string) => void;
  onRatingChange: (rating: number | null) => void;
}

export function ReviewFiltersBar(props: Props) {
  const { tab, technicianId, rating, technicianOptions, onTabChange, onTechnicianChange, onRatingChange } = props;
  const { t } = useTranslation();
  const r = t.admin.reviews;

  const tabs: { key: ReviewTab; label: string }[] = [
    { key: 'active', label: r.tabActive },
    { key: 'flagged', label: r.tabFlagged },
    { key: 'hidden', label: r.tabHidden },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex gap-1 bg-surface-elevated rounded-apple p-1 w-fit">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => onTabChange(tb.key)}
            className={`px-4 py-2 rounded-apple text-sm font-medium transition-colors ${
              tab === tb.key
                ? 'bg-surface shadow-sm text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={technicianId}
          onChange={(e) => onTechnicianChange(e.target.value)}
          className="px-3 py-2 rounded-apple border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label={r.filterTechnicianLabel}
        >
          <option value="">{r.filterAllTechnicians}</option>
          {technicianOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name || o.id}
            </option>
          ))}
        </select>

        {/* Rating chip — only visible on Active tab. Hidden (not greyed) on other tabs. */}
        {tab === 'active' && (
          <div className="flex items-center gap-1">
            <select
              value={rating ?? ''}
              onChange={(e) => onRatingChange(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-apple border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label={r.filterRatingLabel}
            >
              <option value="">{r.filterAllRatings}</option>
              <option value="5">5 ★</option>
              <option value="4">4 ★</option>
              <option value="3">3 ★</option>
              <option value="2">2 ★</option>
              <option value="1">1 ★</option>
            </select>
            {rating !== null && (
              <button
                onClick={() => onRatingChange(null)}
                className="p-1.5 text-text-tertiary hover:text-text-primary rounded-apple"
                aria-label={r.filterClearRating}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
