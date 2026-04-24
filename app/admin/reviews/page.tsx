'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Flag,
  EyeOff,
  Eye,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Review } from '@/types';
import {
  flagReview,
  hideReview,
} from '@/lib/services/reviewService';
import { formatDateTime } from '@/lib/utils/formatters';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

type FilterTab = 'all' | 'flagged' | 'hidden';

const PAGE_SIZE = 20;

function docToReview(docSnap: QueryDocumentSnapshot<DocumentData>): Review {
  return { id: docSnap.id, ...docSnap.data() } as Review;
}

export default function AdminReviewsPage() {
  const { userData } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);

  // Modals
  const [flagModal, setFlagModal] = useState<{ reviewId: string } | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const reviewsCol = collection(db, 'reviews');

      let q;
      if (activeTab === 'flagged') {
        q = query(reviewsCol, where('flagged', '==', true), orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1));
      } else if (activeTab === 'hidden') {
        q = query(reviewsCol, where('hidden', '==', true), orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1));
      } else {
        q = query(reviewsCol, orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1));
      }

      const snapshot = await getDocs(q);
      const more = snapshot.docs.length > PAGE_SIZE;
      const docs = more ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;
      const items = docs.map(docToReview);

      setReviews(items);
      setHasMore(more);
      setLastDoc(docs.length > 0 ? docs[docs.length - 1] : null);

      if (activeTab === 'all') {
        setTotalCount(items.length + (more ? 1 : 0));
        setFlaggedCount(items.filter(r => r.flagged).length);
        if (items.length > 0) {
          const sum = items.reduce((acc, r) => acc + r.rating, 0);
          setAvgRating(Math.round((sum / items.length) * 10) / 10);
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load reviews';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const reviewsCol = collection(db, 'reviews');

      let q;
      if (activeTab === 'flagged') {
        q = query(reviewsCol, where('flagged', '==', true), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE + 1));
      } else if (activeTab === 'hidden') {
        q = query(reviewsCol, where('hidden', '==', true), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE + 1));
      } else {
        q = query(reviewsCol, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE + 1));
      }

      const snapshot = await getDocs(q);
      const more = snapshot.docs.length > PAGE_SIZE;
      const docs = more ? snapshot.docs.slice(0, PAGE_SIZE) : snapshot.docs;

      setReviews(prev => [...prev, ...docs.map(docToReview)]);
      setHasMore(more);
      setLastDoc(docs.length > 0 ? docs[docs.length - 1] : null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load more reviews';
      toast.error(message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, activeTab]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleFlag = async () => {
    if (!flagModal || !flagReason.trim() || !userData) return;
    try {
      await flagReview(flagModal.reviewId, flagReason.trim(), userData.id);
      toast.success('Review flagged');
      setFlagModal(null);
      setFlagReason('');
      await loadReviews();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to flag review';
      toast.error(message);
    }
  };

  const handleHide = async (reviewId: string) => {
    if (!confirm('Hide this review? It will be removed from public view.') || !userData) return;
    try {
      await hideReview(reviewId, true, userData.id);
      toast.success('Review hidden');
      await loadReviews();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to hide review';
      toast.error(message);
    }
  };

  const handleRestore = async (reviewId: string) => {
    if (!userData) return;
    try {
      await hideReview(reviewId, false, userData.id);
      toast.success('Review restored');
      await loadReviews();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to restore review';
      toast.error(message);
    }
  };

  const filteredReviews = searchQuery
    ? reviews.filter(r =>
        r.customerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.technicianId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.orderId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : reviews;

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'flagged', label: 'Flagged' },
    { key: 'hidden', label: 'Hidden' },
  ];

  const getStatusLabel = (review: Review) => {
    if (review.hidden) return { text: 'hidden', style: 'bg-error/20 text-error' };
    if (review.flagged) return { text: 'flagged', style: 'bg-warning/20 text-warning' };
    return { text: 'published', style: 'bg-success/20 text-success' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reviews</h1>
        <p className="text-text-secondary mt-1">Manage customer reviews and ratings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="apple-card">
          <p className="text-sm text-text-secondary">Total Reviews</p>
          <p className="text-2xl font-bold mt-1">{totalCount}</p>
        </div>
        <div className="apple-card">
          <p className="text-sm text-text-secondary">Average Rating</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold">{avgRating || '-'}</p>
            {avgRating > 0 && <Star className="w-5 h-5 text-warning fill-warning" />}
          </div>
        </div>
        <div className="apple-card">
          <p className="text-sm text-text-secondary">Flagged</p>
          <p className="text-2xl font-bold text-warning mt-1">{flaggedCount}</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 bg-surface-elevated rounded-apple p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-apple text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-surface shadow-sm text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID..."
            className="w-full pl-9 pr-4 py-2 rounded-apple border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="apple-card text-center py-16">
          <Star className="w-12 h-12 mx-auto mb-3 text-text-tertiary" />
          <p className="text-text-secondary">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map(review => {
            const status = getStatusLabel(review);
            return (
              <div key={review.id} className="apple-card">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">Order: {review.orderId}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.style}`}>
                        {status.text}
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      Customer: {review.customerId} | Technician: {review.technicianId}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {formatDateTime(review.createdAt)}
                      {review.updatedAt && review.updatedAt.toMillis() !== review.createdAt.toMillis() && ' (edited)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'text-warning fill-warning' : 'text-text-tertiary'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Comment */}
                {review.comment && (
                  <div className="mb-3">
                    <p className={`text-sm text-text-secondary ${
                      expandedReview !== review.id ? 'line-clamp-2' : ''
                    }`}>
                      {review.comment}
                    </p>
                    {review.comment.length > 150 && (
                      <button
                        onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                        className="text-xs text-primary mt-1 flex items-center gap-1"
                      >
                        {expandedReview === review.id ? (
                          <>Show less <ChevronUp className="w-3 h-3" /></>
                        ) : (
                          <>Show more <ChevronDown className="w-3 h-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Flag reason */}
                {review.flaggedReason && (
                  <div className="mb-3 px-3 py-2 bg-warning/10 rounded-apple">
                    <p className="text-xs text-warning font-medium">Flag reason: {review.flaggedReason}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  {!review.hidden && !review.flagged && (
                    <>
                      <button
                        onClick={() => { setFlagModal({ reviewId: review.id }); setFlagReason(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10 rounded-apple transition-colors"
                      >
                        <Flag className="w-3.5 h-3.5" /> Flag
                      </button>
                      <button
                        onClick={() => handleHide(review.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10 rounded-apple transition-colors"
                      >
                        <EyeOff className="w-3.5 h-3.5" /> Hide
                      </button>
                    </>
                  )}
                  {(review.flagged || review.hidden) && (
                    <button
                      onClick={() => handleRestore(review.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10 rounded-apple transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Restore
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-apple transition-colors"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Flag Modal */}
      {flagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setFlagModal(null)} />
          <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-apple-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Flag Review</h3>
              <button onClick={() => setFlagModal(null)} className="p-1 hover:bg-surface-elevated rounded-apple">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason for flagging..."
              rows={3}
              className="w-full px-4 py-3 rounded-apple border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setFlagModal(null)}
                className="flex-1 px-4 py-2.5 bg-surface-elevated hover:bg-border text-text-primary font-medium rounded-apple text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFlag}
                disabled={!flagReason.trim()}
                className="flex-1 px-4 py-2.5 bg-warning hover:bg-warning/90 disabled:opacity-50 text-black font-medium rounded-apple text-sm transition-colors"
              >
                Flag Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
