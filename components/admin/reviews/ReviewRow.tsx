'use client';

import { Star, Flag, EyeOff } from 'lucide-react';
import type { Review } from '@/types';
import { formatDateTime } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  review: Review;
  onClick: () => void;
}

const cellStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: 13,
  color: 'var(--ink)',
  verticalAlign: 'middle',
};

export function ReviewRow({ review, onClick }: Props) {
  const { t } = useTranslation();
  const r = t.admin.reviews;
  const status = review.hidden
    ? { text: r.statusHidden, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
    : review.flagged
      ? { text: r.statusFlagged, color: 'var(--warn)', bg: 'var(--warn-tint)' }
      : { text: r.statusActive, color: 'var(--brand)', bg: 'var(--brand-tint)' };

  return (
    <tr
      onClick={onClick}
      style={{ cursor: 'pointer', borderBottom: '1px solid var(--hairline)', transition: 'background 0.15s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <td style={cellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={14}
              color={n <= review.rating ? 'var(--warn)' : 'var(--soft)'}
              fill={n <= review.rating ? 'var(--warn)' : 'none'}
            />
          ))}
        </div>
      </td>
      <td style={{ ...cellStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {review.customerName || <span style={{ color: 'var(--soft)' }}>{review.customerId}</span>}
      </td>
      <td style={{ ...cellStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {review.technicianName || <span style={{ color: 'var(--soft)' }}>{review.technicianId}</span>}
      </td>
      <td style={{ ...cellStyle, color: 'var(--soft)', maxWidth: 360 }}>
        <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{review.comment || '—'}</p>
      </td>
      <td style={{ ...cellStyle, color: 'var(--soft)', whiteSpace: 'nowrap' }}>
        {formatDateTime(review.createdAt)}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 'var(--radius-full)',
          fontSize: 11,
          fontWeight: 500,
          color: status.color,
          background: status.bg,
        }}>
          {review.hidden ? <EyeOff size={12} /> : review.flagged ? <Flag size={12} /> : null}
          {status.text}
        </span>
      </td>
    </tr>
  );
}
