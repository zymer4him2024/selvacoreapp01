'use client';

import { useEffect, useRef, useState } from 'react';
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

const EXIT_MS = 200;

export function ReviewDrawer({ review, onClose, onChanged }: Props) {
  const { t } = useTranslation();
  const r = t.admin.reviews;

  // Hold a snapshot so we can render through the exit animation after the parent
  // clears `review`. `closing` toggles slide-out, then we unmount after EXIT_MS.
  const [snapshot, setSnapshot] = useState<Review | null>(review);
  const [closing, setClosing] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (review) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      setSnapshot(review);
      setClosing(false);
      // Focus the close button on the next tick so the drawer is in the DOM.
      const id = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    if (!snapshot) return;
    setClosing(true);
    const id = window.setTimeout(() => {
      setSnapshot(null);
      setClosing(false);
      previouslyFocused.current?.focus?.();
    }, EXIT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review]);

  useEffect(() => {
    if (!snapshot || closing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snapshot, closing, onClose]);

  if (!snapshot) return null;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div
        className={`flex-1 bg-black/50 backdrop-blur-sm ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={onClose}
      />
      <aside
        className={`w-full max-w-md bg-surface shadow-apple-lg overflow-y-auto ${
          closing ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}
      >
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{r.drawerTitle}</h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-surface-elevated rounded-apple"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`w-5 h-5 ${n <= snapshot.rating ? 'text-warning fill-warning' : 'text-text-tertiary'}`} />
            ))}
            <span className="ml-2 text-sm text-text-secondary">{snapshot.rating}/5</span>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-text-tertiary">{r.fieldCustomer}</dt>
            <dd>{snapshot.customerName || snapshot.customerId}</dd>
            <dt className="text-text-tertiary">{r.fieldTechnician}</dt>
            <dd>{snapshot.technicianName || snapshot.technicianId}</dd>
            <dt className="text-text-tertiary">{r.fieldOrder}</dt>
            <dd className="font-mono text-xs">{snapshot.orderId}</dd>
            <dt className="text-text-tertiary">{r.fieldCreated}</dt>
            <dd>{formatDateTime(snapshot.createdAt)}</dd>
            {snapshot.updatedAt && snapshot.updatedAt.toMillis() !== snapshot.createdAt.toMillis() && (
              <>
                <dt className="text-text-tertiary">{r.fieldEdited}</dt>
                <dd>{formatDateTime(snapshot.updatedAt)}</dd>
              </>
            )}
          </dl>

          {snapshot.comment && (
            <div>
              <p className="text-xs text-text-tertiary mb-1">{r.fieldComment}</p>
              <p className="text-sm whitespace-pre-wrap">{snapshot.comment}</p>
            </div>
          )}

          {snapshot.flaggedReason && (
            <div className="px-3 py-2 bg-warning/10 rounded-apple">
              <p className="text-xs text-warning font-medium">{r.fieldFlagReason}: {snapshot.flaggedReason}</p>
            </div>
          )}

          <ReviewDrawerActions review={snapshot} onChanged={onChanged} />
        </div>
      </aside>
    </div>
  );
}
