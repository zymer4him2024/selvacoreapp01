'use client';

import { Star, Flag, EyeOff } from 'lucide-react';
import type { Review } from '@/types';
import { formatDateTime } from '@/lib/utils/formatters';

interface Props {
  review: Review;
  onClick: () => void;
}

export function ReviewRow({ review, onClick }: Props) {
  const status = review.hidden
    ? { text: 'hidden', className: 'bg-error/15 text-error' }
    : review.flagged
      ? { text: 'flagged', className: 'bg-warning/15 text-warning' }
      : { text: 'active', className: 'bg-success/15 text-success' };

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-surface-elevated transition-colors border-b border-border"
    >
      <td className="px-4 py-3 text-sm">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`w-3.5 h-3.5 ${n <= review.rating ? 'text-warning fill-warning' : 'text-text-tertiary'}`}
            />
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-text-primary truncate max-w-[160px]">
        {review.customerName || <span className="text-text-tertiary">{review.customerId}</span>}
      </td>
      <td className="px-4 py-3 text-sm text-text-primary truncate max-w-[160px]">
        {review.technicianName || <span className="text-text-tertiary">{review.technicianId}</span>}
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary max-w-[360px]">
        <p className="truncate">{review.comment || '—'}</p>
      </td>
      <td className="px-4 py-3 text-sm text-text-tertiary whitespace-nowrap">
        {formatDateTime(review.createdAt)}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
          {review.hidden ? <EyeOff className="w-3 h-3" /> : review.flagged ? <Flag className="w-3 h-3" /> : null}
          {status.text}
        </span>
      </td>
    </tr>
  );
}
