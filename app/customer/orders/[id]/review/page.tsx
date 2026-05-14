'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Star, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Order, Review } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { createReview, getReviewForOrder, updateReview } from '@/lib/services/reviewService';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import toast from 'react-hot-toast';

const MAX_COMMENT = 500;

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { userData } = useAuth();
  const { t, language } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const orderId = params.id as string;

  const deepLinkRating = useMemo(() => {
    const raw = searchParams.get('rating');
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 0;
  }, [searchParams]);

  const [order, setOrder] = useState<Order | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [thankYou, setThankYou] = useState(false);

  const [score, setScore] = useState(0);
  const [poppedStar, setPoppedStar] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  const editableUntilDate = useMemo(() => {
    if (!existingReview?.editableUntil) return null;
    return existingReview.editableUntil.toDate();
  }, [existingReview]);

  const editExpired = useMemo(() => {
    if (!editableUntilDate) return false;
    return new Date() > editableUntilDate;
  }, [editableUntilDate]);

  const daysLeft = useMemo(() => {
    if (!editableUntilDate || editExpired) return 0;
    return Math.ceil((editableUntilDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  }, [editableUntilDate, editExpired]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (!orderDoc.exists()) {
        toast.error(t.orders.orderNotFound);
        router.push('/customer/orders');
        return;
      }

      const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
      setOrder(orderData);

      if (orderData.status !== 'completed') {
        toast(t.orders.reviewFlow.pendingOrderToast);
        router.push(`/customer/orders/${orderId}`);
        return;
      }

      const review = await getReviewForOrder(orderId);
      if (review) {
        setExistingReview(review);
        setScore(review.rating);
        setCommentText(review.comment || '');
      } else if (deepLinkRating > 0) {
        setScore(deepLinkRating);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.orders.loadOrderError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [orderId, router, deepLinkRating, t.orders.reviewFlow.pendingOrderToast, t.orders.orderNotFound, t.orders.loadOrderError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRate = (n: number) => {
    setScore(n);
    setPoppedStar(n);
    window.setTimeout(() => setPoppedStar(null), 160);
  };

  const handleSubmit = async () => {
    if (score === 0 || !order || !userData) return;
    setSubmitting(true);
    try {
      const trimmed = commentText.trim();
      if (existingReview) {
        await updateReview(existingReview.id, userData.id, score, trimmed || undefined);
        toast.success(t.orders.reviewFlow.updatedToast);
      } else {
        await createReview(orderId, userData.id, score, trimmed || undefined);
        toast.success(t.orders.reviewFlow.submittedToast);
      }
      const fresh = await getReviewForOrder(orderId);
      if (fresh) setExistingReview(fresh);
      setThankYou(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.orders.submitReviewError;
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const productName = useMemo(() => {
    const nameObj = order?.productSnapshot?.name as Record<string, string> | undefined;
    if (!nameObj) return '';
    return nameObj[language] || nameObj.en || '';
  }, [order, language]);

  const installDate = useMemo(() => {
    const raw =
      (order as unknown as { completedAt?: { toDate?: () => Date } })?.completedAt?.toDate?.() ??
      (order?.installationDate as unknown as { toDate?: () => Date })?.toDate?.() ??
      (order?.installationDate as unknown as Date | string | undefined);
    if (!raw) return '';
    const d = raw instanceof Date ? raw : new Date(raw);
    return isNaN(d.getTime()) ? '' : formatDate(d, 'short');
  }, [order]);

  if (loading) {
    return (
      <div className="sc">
        <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
      </div>
    );
  }

  if (!order || order.status !== 'completed') return null;

  const OrderSummary = () => (
    <div className="sc-card-static">
      <h2 className="sc-eyebrow" style={{ marginBottom: 12 }}>
        {t.orders.reviewFlow.orderSummary}
      </h2>
      <dl className="sc-stack" style={{ gap: 8, fontSize: 14 }}>
        {order.technicianInfo?.name && (
          <div className="sc-row-between" style={{ gap: 16 }}>
            <dt style={{ color: 'var(--soft)' }}>{t.orders.reviewFlow.technician}</dt>
            <dd style={{ fontWeight: 600, textAlign: 'right', margin: 0 }}>{order.technicianInfo.name}</dd>
          </div>
        )}
        {installDate && (
          <div className="sc-row-between" style={{ gap: 16 }}>
            <dt style={{ color: 'var(--soft)' }}>{t.orders.reviewFlow.date}</dt>
            <dd style={{ fontWeight: 600, textAlign: 'right', margin: 0 }}>{installDate}</dd>
          </div>
        )}
        {productName && (
          <div className="sc-row-between" style={{ gap: 16 }}>
            <dt style={{ color: 'var(--soft)' }}>{t.orders.reviewFlow.device}</dt>
            <dd style={{ fontWeight: 600, textAlign: 'right', margin: 0 }}>{productName}</dd>
          </div>
        )}
      </dl>
    </div>
  );

  const Header = () => (
    <header className="sc-nav">
      <div className="sc-nav-inner">
        <button
          type="button"
          onClick={() => router.push(`/customer/orders/${orderId}`)}
          className="sc-nav-link"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          aria-label={t.orders.reviewFlow.backToOrder}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="sc-nav-text">{t.orders.reviewFlow.backToOrder}</span>
        </button>
      </div>
    </header>
  );

  // Read-only locked view
  if (existingReview && editExpired) {
    return (
      <div className="sc">
        <Header />
        <main className="sc-main" style={{ maxWidth: 560 }}>
          <div className="sc-stack-lg">
            <OrderSummary />
            <div className="sc-card-static">
              <div className="sc-row" style={{ gap: 8, marginBottom: 16 }}>
                <Lock className="w-5 h-5" style={{ color: 'var(--soft)' }} aria-hidden />
                <h1 className="sc-h2" style={{ margin: 0 }}>{t.orders.reviewFlow.yourReview}</h1>
              </div>
              <div className="sc-row" style={{ gap: 4, marginBottom: 12 }} role="img" aria-label={`${existingReview.rating}/5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className="w-7 h-7"
                    style={{
                      color: n <= existingReview.rating ? 'var(--warn)' : 'var(--soft)',
                      fill: n <= existingReview.rating ? 'var(--warn)' : 'none',
                    }}
                    aria-hidden
                  />
                ))}
                <span style={{ marginLeft: 8, fontWeight: 600 }}>{existingReview.rating}/5</span>
              </div>
              {existingReview.comment && (
                <p style={{ color: 'var(--soft)', marginBottom: 16, whiteSpace: 'pre-wrap' }}>{existingReview.comment}</p>
              )}
              <div style={{ paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{t.orders.reviewFlow.locked}</p>
                <p style={{ fontSize: 12, color: 'var(--soft)', margin: '4px 0 0' }}>{t.orders.reviewFlow.editWindowEnded}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Thank-you screen (after submit, within edit window)
  if (thankYou && existingReview) {
    return (
      <div className="sc">
        <Header />
        <main className="sc-main" style={{ maxWidth: 560 }}>
          <div className="sc-stack-lg">
            <div className="sc-card-static" style={{ textAlign: 'center', background: 'var(--brand-tint)' }}>
              <CheckCircle2 className="w-14 h-14 mx-auto mb-3" style={{ color: 'var(--brand)' }} aria-hidden />
              <h1 className="sc-h1" style={{ marginBottom: 4 }}>{t.orders.reviewFlow.thanksFeedback}</h1>
            </div>
            <div className="sc-card-static">
              <h2 className="sc-eyebrow" style={{ marginBottom: 12 }}>
                {t.orders.reviewFlow.yourReview}
              </h2>
              <div
                className="sc-row"
                style={{ gap: 4, marginBottom: 12 }}
                role="img"
                aria-label={`${existingReview.rating}/5`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className="w-7 h-7"
                    style={{
                      color: n <= existingReview.rating ? 'var(--warn)' : 'var(--soft)',
                      fill: n <= existingReview.rating ? 'var(--warn)' : 'none',
                    }}
                    aria-hidden
                  />
                ))}
                <span style={{ marginLeft: 8, fontWeight: 600 }}>{existingReview.rating}/5</span>
              </div>
              {existingReview.comment && (
                <p style={{ color: 'var(--soft)', whiteSpace: 'pre-wrap', margin: 0 }}>{existingReview.comment}</p>
              )}
            </div>
            {!editExpired && (
              <button
                type="button"
                onClick={() => setThankYou(false)}
                className="sc-cta-ghost"
                style={{ width: '100%' }}
              >
                {t.orders.reviewFlow.edit}
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Create or edit form
  const commentCount = commentText.length;
  const overLimit = commentCount > MAX_COMMENT;

  return (
    <div className="sc">
      <Header />
      <main className="sc-main" style={{ maxWidth: 560 }}>
        <div className="sc-stack-lg">
          <OrderSummary />

          <div className="sc-card-static">
            <h1 className="sc-h1" style={{ marginBottom: 4 }}>
              {order.technicianInfo?.name
                ? t.orders.reviewFlow.howWasInstallationWith.replace('{tech}', order.technicianInfo.name)
                : t.orders.reviewFlow.howWasInstallation}
            </h1>
            {existingReview && daysLeft > 0 && (
              <p style={{ fontSize: 12, color: 'var(--warn)', marginTop: 4 }}>
                {daysLeft} {daysLeft === 1
                  ? t.orders.reviewFlow.dayLeftToEdit
                  : t.orders.reviewFlow.daysLeftToEdit}
              </p>
            )}

            <div
              className="sc-row"
              style={{ justifyContent: 'center', gap: 12, marginTop: 20, marginBottom: 8 }}
              role="radiogroup"
              aria-label={t.orders.reviewFlow.howWasInstallation}
            >
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= score;
                const ariaLabel = t.orders.reviewFlow.starAriaLabel.replace('{n}', String(n));
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={score === n}
                    aria-label={ariaLabel}
                    onClick={() => handleRate(n)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 48,
                      minHeight: 48,
                      borderRadius: 'var(--radius-sm)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: poppedStar === n ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    <Star
                      className="w-10 h-10"
                      style={{
                        color: active ? 'var(--warn)' : 'var(--soft)',
                        fill: active ? 'var(--warn)' : 'none',
                      }}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sc-card-static">
            <label htmlFor="review-comment" className="sc-label">
              {t.orders.reviewFlow.commentLabel}
            </label>
            <textarea
              id="review-comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t.orders.reviewFlow.commentPlaceholder}
              rows={4}
              maxLength={MAX_COMMENT}
              className="sc-input"
              style={{ resize: 'none' }}
            />
            <p
              style={{
                fontSize: 12,
                marginTop: 4,
                textAlign: 'right',
                color: overLimit ? 'var(--warn)' : 'var(--soft)',
              }}
              aria-live="polite"
            >
              {commentCount}/{MAX_COMMENT}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={score === 0 || submitting || overLimit}
            className="sc-cta"
            style={{ width: '100%', padding: '14px 24px', fontSize: 15 }}
          >
            {submitting ? (
              <span className="sc-row" style={{ justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'sc-spin 0.8s linear infinite' }} />
                {existingReview ? t.orders.reviewFlow.updating : t.orders.reviewFlow.submitting}
              </span>
            ) : (
              existingReview ? t.orders.reviewFlow.update : t.orders.reviewFlow.submit
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
