'use client';

import { useState } from 'react';
import { Flag, EyeOff, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Review } from '@/types';
import { flagReview, hideReview, restoreReview } from '@/lib/services/reviewService';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  review: Review;
  onChanged: () => void;
}

export function ReviewDrawerActions({ review, onChanged }: Props) {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const r = t.admin.reviews;
  const [flagReason, setFlagReason] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, okMsg: string) => {
    if (!userData) return;
    setBusy(true);
    try {
      await action();
      toast.success(okMsg);
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (review.flagged || review.hidden) {
    return (
      <div className="border-t border-border pt-4">
        <button
          onClick={() => run(() => restoreReview(review.id, userData!.id), r.toastRestored)}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-2 bg-success/90 hover:bg-success text-white text-sm font-medium rounded-apple disabled:opacity-50"
        >
          <Eye className="w-4 h-4" /> {r.actionRestore}
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <textarea
        value={flagReason}
        onChange={(e) => setFlagReason(e.target.value)}
        placeholder={r.flagReasonPlaceholder}
        rows={2}
        className="w-full px-3 py-2 rounded-apple border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() =>
            run(() => flagReview(review.id, flagReason.trim(), userData!.id), r.toastFlagged)
          }
          disabled={busy || !flagReason.trim()}
          className="flex items-center gap-1 px-3 py-2 bg-warning/90 hover:bg-warning text-black text-sm font-medium rounded-apple disabled:opacity-50"
        >
          <Flag className="w-4 h-4" /> {r.actionFlag}
        </button>
        <button
          onClick={() => run(() => hideReview(review.id, true, userData!.id), r.toastHidden)}
          disabled={busy}
          className="flex items-center gap-1 px-3 py-2 bg-error/90 hover:bg-error text-white text-sm font-medium rounded-apple disabled:opacity-50"
        >
          <EyeOff className="w-4 h-4" /> {r.actionHide}
        </button>
      </div>
    </div>
  );
}
