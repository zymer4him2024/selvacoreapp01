'use client';

import { Star } from 'lucide-react';
import type { Review } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { ReviewRow } from './ReviewRow';

interface Props {
  reviews: Review[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRowClick: (review: Review) => void;
}

const headerCellStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontWeight: 500,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--soft)',
  textAlign: 'left',
};

const skeletonStyle: React.CSSProperties = {
  height: 16,
  background: 'var(--off-paper)',
  borderRadius: 'var(--radius-sm)',
};

export function ReviewsTable({ reviews, loading, loadingMore, hasMore, onLoadMore, onRowClick }: Props) {
  const { t } = useTranslation();
  const r = t.admin.reviews;

  const renderHeader = () => (
    <thead style={{ background: 'var(--off-paper)' }}>
      <tr>
        <th style={headerCellStyle}>{r.colRating}</th>
        <th style={headerCellStyle}>{r.colCustomer}</th>
        <th style={headerCellStyle}>{r.colTechnician}</th>
        <th style={headerCellStyle}>{r.colComment}</th>
        <th style={headerCellStyle}>{r.colDate}</th>
        <th style={headerCellStyle}>{r.colStatus}</th>
      </tr>
    </thead>
  );

  if (loading) {
    return (
      <div className="sc-card-static" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            {renderHeader()}
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td style={{ padding: '16px' }}><div style={{ ...skeletonStyle, width: 64 }} /></td>
                  <td style={{ padding: '16px' }}><div style={{ ...skeletonStyle, width: 112 }} /></td>
                  <td style={{ padding: '16px' }}><div style={{ ...skeletonStyle, width: 112 }} /></td>
                  <td style={{ padding: '16px' }}><div style={{ ...skeletonStyle, width: 192 }} /></td>
                  <td style={{ padding: '16px' }}><div style={{ ...skeletonStyle, width: 80 }} /></td>
                  <td style={{ padding: '16px' }}><div style={{ ...skeletonStyle, width: 56, borderRadius: 'var(--radius-full)', height: 20 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 16px' }}>
        <Star size={48} color="var(--soft)" style={{ margin: '0 auto 12px' }} />
        <p className="sc-helper" style={{ margin: 0 }}>{r.emptyState}</p>
      </div>
    );
  }

  return (
    <div className="sc-card-static" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {renderHeader()}
          <tbody>
            {reviews.map((review) => (
              <ReviewRow key={review.id} review={review} onClick={() => onRowClick(review)} />
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16, borderTop: '1px solid var(--hairline)' }}>
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            style={{
              padding: '8px 24px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--brand)',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: loadingMore ? 'not-allowed' : 'pointer',
              opacity: loadingMore ? 0.5 : 1,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!loadingMore) e.currentTarget.style.background = 'var(--brand-tint)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {loadingMore ? r.loadingMore : r.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
