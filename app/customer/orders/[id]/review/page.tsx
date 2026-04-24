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
import { formatDate } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

const MAX_COMMENT = 500;

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { userData } = useAuth();
  const { t, language } = useTranslation();
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
        toast.error('Order not found');
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
      const message = error instanceof Error ? error.message : 'Failed to load order';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [orderId, router, deepLinkRating, t.orders.reviewFlow.pendingOrderToast]);

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
      const message = error instanceof Error ? error.message : 'Failed to submit review';
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order || order.status !== 'completed') return null;

  const OrderSummary = () => (
    <div className="apple-card">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
        {t.orders.reviewFlow.orderSummary}
      </h2>
      <dl className="space-y-2 text-sm">
        {order.technicianInfo?.name && (
          <div className="flex justify-between gap-4">
            <dt className="text-text-tertiary">{t.orders.reviewFlow.technician}</dt>
            <dd className="font-medium text-right">{order.technicianInfo.name}</dd>
          </div>
        )}
        {installDate && (
          <div className="flex justify-between gap-4">
            <dt className="text-text-tertiary">{t.orders.reviewFlow.date}</dt>
            <dd className="font-medium text-right">{installDate}</dd>
          </div>
        )}
        {productName && (
          <div className="flex justify-between gap-4">
            <dt className="text-text-tertiary">{t.orders.reviewFlow.device}</dt>
            <dd className="font-medium text-right">{productName}</dd>
          </div>
        )}
      </dl>
    </div>
  );

  const Header = () => (
    <div className="bg-surface border-b border-border sticky top-0 z-10">
      <div className="max-w-lg mx-auto px-4 py-4">
        <button
          onClick={() => router.push(`/customer/orders/${orderId}`)}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors min-h-[44px]"
          aria-label={t.orders.reviewFlow.backToOrder}
        >
          <ArrowLeft className="w-5 h-5" />
          {t.orders.reviewFlow.backToOrder}
        </button>
      </div>
    </div>
  );

  // Read-only locked view
  if (existingReview && editExpired) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6 animate-fade-in">
          <OrderSummary />
          <div className="apple-card">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-text-tertiary" aria-hidden />
              <h1 className="text-xl font-semibold">{t.orders.reviewFlow.yourReview}</h1>
            </div>
            <div className="flex items-center gap-1 mb-3" role="img" aria-label={`${existingReview.rating}/5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-7 h-7 ${
                    n <= existingReview.rating ? 'text-warning fill-warning' : 'text-text-tertiary'
                  }`}
                  aria-hidden
                />
              ))}
              <span className="ml-2 font-medium">{existingReview.rating}/5</span>
            </div>
            {existingReview.comment && (
              <p className="text-text-secondary mb-4 whitespace-pre-wrap">{existingReview.comment}</p>
            )}
            <div className="pt-3 border-t border-border">
              <p className="text-sm font-medium text-text-primary">{t.orders.reviewFlow.locked}</p>
              <p className="text-xs text-text-tertiary mt-1">{t.orders.reviewFlow.editWindowEnded}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Thank-you screen (after submit, within edit window)
  if (thankYou && existingReview) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6 animate-fade-in">
          <div className="apple-card text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-success" aria-hidden />
            <h1 className="text-2xl font-bold mb-1">{t.orders.reviewFlow.thanksFeedback}</h1>
          </div>
          <div className="apple-card">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              {t.orders.reviewFlow.yourReview}
            </h2>
            <div
              className="flex items-center gap-1 mb-3"
              role="img"
              aria-label={`${existingReview.rating}/5`}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`w-7 h-7 ${
                    n <= existingReview.rating ? 'text-warning fill-warning' : 'text-text-tertiary'
                  }`}
                  aria-hidden
                />
              ))}
              <span className="ml-2 font-medium">{existingReview.rating}/5</span>
            </div>
            {existingReview.comment && (
              <p className="text-text-secondary whitespace-pre-wrap">{existingReview.comment}</p>
            )}
          </div>
          {!editExpired && (
            <button
              onClick={() => setThankYou(false)}
              className="w-full min-h-[48px] px-4 py-3 bg-surface-elevated hover:bg-border text-text-primary font-medium rounded-apple transition-colors"
            >
              {t.orders.reviewFlow.edit}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Create or edit form
  const commentCount = commentText.length;
  const overLimit = commentCount > MAX_COMMENT;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="space-y-6 animate-fade-in">
          <OrderSummary />

          <div className="apple-card">
            <h1 className="text-2xl font-bold mb-1">{t.orders.reviewFlow.howWasInstallation}</h1>
            {existingReview && daysLeft > 0 && (
              <p className="text-xs text-warning mt-1">
                {daysLeft} {daysLeft === 1
                  ? t.orders.reviewFlow.dayLeftToEdit
                  : t.orders.reviewFlow.daysLeftToEdit}
              </p>
            )}

            <div
              className="flex items-center justify-center gap-2 sm:gap-3 mt-5 mb-2"
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
                    className={`inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-apple active:scale-95 transition-transform ${
                      poppedStar === n ? 'animate-star-pop' : ''
                    }`}
                  >
                    <Star
                      className={`w-10 h-10 ${
                        active ? 'text-warning fill-warning' : 'text-text-tertiary'
                      }`}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="apple-card">
            <label htmlFor="review-comment" className="text-sm font-medium mb-2 block">
              {t.orders.reviewFlow.commentLabel}
            </label>
            <textarea
              id="review-comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={t.orders.reviewFlow.commentPlaceholder}
              rows={4}
              maxLength={MAX_COMMENT}
              className="w-full px-4 py-3 rounded-apple border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
            />
            <p
              className={`text-xs mt-1 text-right ${
                overLimit ? 'text-error' : 'text-text-tertiary'
              }`}
              aria-live="polite"
            >
              {commentCount}/{MAX_COMMENT}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={score === 0 || submitting || overLimit}
            className="w-full min-h-[48px] px-4 py-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {existingReview ? t.orders.reviewFlow.updating : t.orders.reviewFlow.submitting}
              </span>
            ) : (
              existingReview ? t.orders.reviewFlow.update : t.orders.reviewFlow.submit
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
