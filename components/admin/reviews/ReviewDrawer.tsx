'use client';

import { X, Star } from 'lucide-react';
import type { Review } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDateTime } from '@/lib/utils/formatters';
import { ReviewDrawerActions } from './ReviewDrawerActions';

interface Props {
  review: Review | null;
  onClose: () => void;
  onChanged: () => void;
}

export function ReviewDrawer({ review, onClose, onChanged }: Props) {
  const { t } = useTranslation();
  const r = t.admin.reviews;

  if (!review) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-md bg-surface shadow-apple-lg overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{r.drawerTitle}</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-elevated rounded-apple" aria-label={t.common.close}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`w-5 h-5 ${n <= review.rating ? 'text-warning fill-warning' : 'text-text-tertiary'}`} />
            ))}
            <span className="ml-2 text-sm text-text-secondary">{review.rating}/5</span>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-text-tertiary">{r.fieldCustomer}</dt>
            <dd>{review.customerName || review.customerId}</dd>
            <dt className="text-text-tertiary">{r.fieldTechnician}</dt>
            <dd>{review.technicianName || review.technicianId}</dd>
            <dt className="text-text-tertiary">{r.fieldOrder}</dt>
            <dd className="font-mono text-xs">{review.orderId}</dd>
            <dt className="text-text-tertiary">{r.fieldCreated}</dt>
            <dd>{formatDateTime(review.createdAt)}</dd>
            {review.updatedAt && review.updatedAt.toMillis() !== review.createdAt.toMillis() && (
              <>
                <dt className="text-text-tertiary">{r.fieldEdited}</dt>
                <dd>{formatDateTime(review.updatedAt)}</dd>
              </>
            )}
          </dl>

          {review.comment && (
            <div>
              <p className="text-xs text-text-tertiary mb-1">{r.fieldComment}</p>
              <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
            </div>
          )}

          {review.flaggedReason && (
            <div className="px-3 py-2 bg-warning/10 rounded-apple">
              <p className="text-xs text-warning font-medium">{r.fieldFlagReason}: {review.flaggedReason}</p>
            </div>
          )}

          <ReviewDrawerActions review={review} onChanged={onChanged} />
        </div>
      </aside>
    </div>
  );
}
