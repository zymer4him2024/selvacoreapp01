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

  const [snapshot, setSnapshot] = useState<Review | null>(review);
  const [open, setOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (review) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      setSnapshot(review);
      // Open on next frame so the initial render uses the closed transform.
      const id = window.requestAnimationFrame(() => {
        setOpen(true);
        window.setTimeout(() => closeBtnRef.current?.focus(), 0);
      });
      return () => window.cancelAnimationFrame(id);
    }
    if (!snapshot) return;
    setOpen(false);
    const id = window.setTimeout(() => {
      setSnapshot(null);
      previouslyFocused.current?.focus?.();
    }, EXIT_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review]);

  useEffect(() => {
    if (!snapshot || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snapshot, open, onClose]);

  if (!snapshot) return null;

  return (
    <div
      className="sc"
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}
    >
      <div
        onClick={onClose}
        style={{
          flex: 1,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          transition: `opacity ${EXIT_MS}ms ease`,
        }}
      />
      <aside
        style={{
          width: '100%',
          maxWidth: 448,
          background: 'var(--paper)',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.15)',
          overflowY: 'auto',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform ${EXIT_MS}ms ease`,
        }}
      >
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--paper)',
          borderBottom: '1px solid var(--hairline)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1,
        }}>
          <h3 className="sc-h2" style={{ margin: 0, fontSize: 18 }}>{r.drawerTitle}</h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label={t.common.close}
            style={{
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--soft)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={20}
                color={n <= snapshot.rating ? 'var(--warn)' : 'var(--soft)'}
                fill={n <= snapshot.rating ? 'var(--warn)' : 'none'}
              />
            ))}
            <span className="sc-helper" style={{ marginLeft: 8 }}>{snapshot.rating}/5</span>
          </div>

          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 12, rowGap: 8, fontSize: 13, margin: 0 }}>
            <dt style={{ color: 'var(--soft)' }}>{r.fieldCustomer}</dt>
            <dd style={{ margin: 0, color: 'var(--ink)' }}>{snapshot.customerName || snapshot.customerId}</dd>
            <dt style={{ color: 'var(--soft)' }}>{r.fieldTechnician}</dt>
            <dd style={{ margin: 0, color: 'var(--ink)' }}>{snapshot.technicianName || snapshot.technicianId}</dd>
            <dt style={{ color: 'var(--soft)' }}>{r.fieldOrder}</dt>
            <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'monospace', fontSize: 11 }}>{snapshot.orderId}</dd>
            <dt style={{ color: 'var(--soft)' }}>{r.fieldCreated}</dt>
            <dd style={{ margin: 0, color: 'var(--ink)' }}>{formatDateTime(snapshot.createdAt)}</dd>
            {snapshot.updatedAt && snapshot.updatedAt.toMillis() !== snapshot.createdAt.toMillis() && (
              <>
                <dt style={{ color: 'var(--soft)' }}>{r.fieldEdited}</dt>
                <dd style={{ margin: 0, color: 'var(--ink)' }}>{formatDateTime(snapshot.updatedAt)}</dd>
              </>
            )}
          </dl>

          {snapshot.comment && (
            <div>
              <p className="sc-helper" style={{ fontSize: 11, marginBottom: 4 }}>{r.fieldComment}</p>
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', margin: 0, color: 'var(--ink)' }}>{snapshot.comment}</p>
            </div>
          )}

          {snapshot.flaggedReason && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--warn-tint)',
              borderRadius: 'var(--radius-md)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 500, margin: 0, color: 'var(--warn)' }}>
                {r.fieldFlagReason}: {snapshot.flaggedReason}
              </p>
            </div>
          )}

          <ReviewDrawerActions review={snapshot} onChanged={onChanged} />
        </div>
      </aside>
    </div>
  );
}
