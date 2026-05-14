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

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  fontWeight: 500,
  border: 'none',
  background: active ? 'var(--paper)' : 'transparent',
  color: active ? 'var(--ink)' : 'var(--soft)',
  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{
        display: 'flex',
        gap: 4,
        background: 'var(--off-paper)',
        borderRadius: 'var(--radius-md)',
        padding: 4,
        width: 'fit-content',
      }}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => onTabChange(tb.key)}
            style={tabBtnStyle(tab === tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <select
          value={technicianId}
          onChange={(e) => onTechnicianChange(e.target.value)}
          className="sc-select"
          aria-label={r.filterTechnicianLabel}
          style={{ minWidth: 200 }}
        >
          <option value="">{r.filterAllTechnicians}</option>
          {technicianOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name || o.id}
            </option>
          ))}
        </select>

        {tab === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <select
              value={rating ?? ''}
              onChange={(e) => onRatingChange(e.target.value ? Number(e.target.value) : null)}
              className="sc-select"
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
                aria-label={r.filterClearRating}
                style={{
                  padding: 6,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--soft)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--soft)'; }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
