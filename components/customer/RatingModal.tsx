'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const CATEGORIES = [
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'quality', label: 'Work Quality' },
  { key: 'cleanliness', label: 'Cleanliness' },
] as const;

interface RatingModalProps {
  orderNumber: string;
  technicianName: string;
  onSubmit: (data: {
    score: number;
    review: string;
    categories: { punctuality: number; professionalism: number; quality: number; cleanliness: number };
  }) => Promise<void>;
  onClose: () => void;
}

export default function RatingModal({ orderNumber, technicianName, onSubmit, onClose }: RatingModalProps) {
  const { t } = useTranslation();
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [review, setReview] = useState('');
  const [categories, setCategories] = useState({
    punctuality: 0,
    professionalism: 0,
    quality: 0,
    cleanliness: 0,
  });
  const [processing, setProcessing] = useState(false);

  const updateCategory = (key: string, value: number) => {
    setCategories(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (score === 0) return;
    setProcessing(true);
    try {
      await onSubmit({ score, review: review.trim(), categories });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="sc" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: 'auto' }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      <div
        className="sc-card-static"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 448,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
        }}
      >
        <div className="sc-row-between" style={{ alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 className="sc-h2" style={{ margin: 0 }}>{t.components.ratingModal.rateExperience}</h2>
            <p className="sc-helper" style={{ margin: '4px 0 0' }}>Order {orderNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="sc-cta-ghost"
            style={{ padding: 8, width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p className="sc-helper" style={{ marginBottom: 12 }}>How was your experience with {technicianName}?</p>
          <div className="sc-row" style={{ justifyContent: 'center', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverScore(star)}
                onMouseLeave={() => setHoverScore(0)}
                onClick={() => setScore(star)}
                style={{
                  padding: 4,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Star
                  className="w-10 h-10"
                  style={{
                    color: star <= (hoverScore || score) ? 'var(--warn)' : 'var(--soft)',
                    fill: star <= (hoverScore || score) ? 'var(--warn)' : 'none',
                    transition: 'color 150ms, fill 150ms',
                  }}
                />
              </button>
            ))}
          </div>
          {score > 0 && (
            <p style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: 'var(--warn)' }}>
              {score === 1 && 'Poor'}
              {score === 2 && 'Fair'}
              {score === 3 && 'Good'}
              {score === 4 && 'Very Good'}
              {score === 5 && 'Excellent'}
            </p>
          )}
        </div>

        <div className="sc-stack" style={{ gap: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft)', margin: 0 }}>
            {t.components.ratingModal.rateSpecificAreas}
          </p>
          {CATEGORIES.map(({ key, label }) => (
            <div key={key} className="sc-row-between">
              <span style={{ fontSize: 14 }}>{label}</span>
              <div className="sc-row" style={{ gap: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => updateCategory(key, star)}
                    style={{ padding: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <Star
                      className="w-5 h-5"
                      style={{
                        color: star <= categories[key as keyof typeof categories] ? 'var(--warn)' : 'var(--soft)',
                        fill: star <= categories[key as keyof typeof categories] ? 'var(--warn)' : 'none',
                        transition: 'color 150ms, fill 150ms',
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <label className="sc-label">
            Write a review (optional)
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder={t.components.ratingModal.commentPlaceholder}
            rows={3}
            maxLength={500}
            className="sc-input"
            style={{ resize: 'none' }}
          />
          <p style={{ fontSize: 12, color: 'var(--soft)', marginTop: 4, textAlign: 'right' }}>{review.length}/500</p>
        </div>

        <div className="sc-row" style={{ gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="sc-cta-ghost"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={score === 0 || processing}
            className="sc-cta"
            style={{ flex: 1 }}
          >
            {processing ? (
              <span className="sc-row" style={{ justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'sc-spin 0.8s linear infinite' }} />
                Submitting...
              </span>
            ) : (
              'Submit Review'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
