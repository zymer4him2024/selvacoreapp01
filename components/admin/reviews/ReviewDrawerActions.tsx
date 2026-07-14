'use client';

import { useState } from 'react';
import { Flag, EyeOff, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Review } from '@/types';
import { flagReview, hideReview, restoreReview } from '@/lib/services/reviewService';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureAccess } from '@/hooks/useRolePermissions';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  review: Review;
  onChanged: () => void;
}

const actionBtnStyle = (color: string, textColor: string, disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '8px 12px',
  background: color,
  color: textColor,
  fontSize: 13,
  fontWeight: 500,
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'background 0.15s ease',
});

export function ReviewDrawerActions({ review, onChanged }: Props) {
  const { userData } = useAuth();
  const { canEdit } = useFeatureAccess('featureReviews');
  const { t } = useTranslation();
  const r = t.admin.reviews;
  const [flagReason, setFlagReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!canEdit) return null;

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
      <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 16 }}>
        <button
          onClick={() => run(() => restoreReview(review.id, userData!.id), r.toastRestored)}
          disabled={busy}
          style={actionBtnStyle('var(--brand)', '#fff', busy)}
          onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = 'var(--brand-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--brand)'; }}
        >
          <Eye size={16} /> {r.actionRestore}
        </button>
      </div>
    );
  }

  return (
    <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea
        value={flagReason}
        onChange={(e) => setFlagReason(e.target.value)}
        placeholder={r.flagReasonPlaceholder}
        rows={2}
        className="sc-textarea"
        style={{ resize: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => run(() => flagReview(review.id, flagReason.trim(), userData!.id), r.toastFlagged)}
          disabled={busy || !flagReason.trim()}
          style={actionBtnStyle('var(--warn)', '#fff', busy || !flagReason.trim())}
          onMouseEnter={(e) => { if (!busy && flagReason.trim()) e.currentTarget.style.background = '#d97706'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--warn)'; }}
        >
          <Flag size={16} /> {r.actionFlag}
        </button>
        <button
          onClick={() => run(() => hideReview(review.id, true, userData!.id), r.toastHidden)}
          disabled={busy}
          style={actionBtnStyle('#ef4444', '#fff', busy)}
          onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = '#dc2626'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#ef4444'; }}
        >
          <EyeOff size={16} /> {r.actionHide}
        </button>
      </div>
    </div>
  );
}
