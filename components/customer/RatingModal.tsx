'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-apple-lg animate-scale-in overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Rate Your Experience</h2>
              <p className="text-sm text-text-secondary">Order {orderNumber}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-elevated rounded-apple transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Overall Rating */}
          <div className="text-center mb-6">
            <p className="text-sm text-text-secondary mb-3">How was your experience with {technicianName}?</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverScore(star)}
                  onMouseLeave={() => setHoverScore(0)}
                  onClick={() => setScore(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoverScore || score)
                        ? 'text-warning fill-warning'
                        : 'text-text-tertiary'
                    }`}
                  />
                </button>
              ))}
            </div>
            {score > 0 && (
              <p className="text-sm font-medium mt-2 text-warning">
                {score === 1 && 'Poor'}
                {score === 2 && 'Fair'}
                {score === 3 && 'Good'}
                {score === 4 && 'Very Good'}
                {score === 5 && 'Excellent'}
              </p>
            )}
          </div>

          {/* Category Ratings */}
          <div className="space-y-4 mb-6">
            <p className="text-sm font-medium text-text-secondary">Rate specific areas (optional)</p>
            {CATEGORIES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateCategory(key, star)}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          star <= categories[key as keyof typeof categories]
                            ? 'text-warning fill-warning'
                            : 'text-text-tertiary'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Review Text */}
          <div className="mb-6">
            <label className="text-sm font-medium text-text-secondary mb-2 block">
              Write a review (optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience with the installation..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-apple border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
            />
            <p className="text-xs text-text-tertiary mt-1 text-right">{review.length}/500</p>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="flex-1 px-4 py-3 bg-surface-elevated hover:bg-border text-text-primary font-medium rounded-apple transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={score === 0 || processing}
              className="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-apple transition-all"
            >
              {processing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </div>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
