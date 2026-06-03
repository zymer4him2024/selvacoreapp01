'use client';

interface JobCardSkeletonProps {
  variant?: 'grid' | 'list';
}

const skeletonBg: React.CSSProperties = {
  background: 'var(--off-paper)',
  borderRadius: 'var(--radius-sm)',
};

export function JobCardSkeleton({ variant = 'grid' }: JobCardSkeletonProps) {
  if (variant === 'list') {
    return (
      <div className="sc-card-static" style={{ opacity: 0.7 }}>
        <div className="sc-row" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="hidden md:block" style={{ width: 128, height: 128, flexShrink: 0, ...skeletonBg }} />
          <div className="sc-stack" style={{ flex: 1, gap: 12 }}>
            <div>
              <div style={{ height: 20, width: '66%', marginBottom: 8, ...skeletonBg }} />
              <div style={{ height: 12, width: '33%', ...skeletonBg }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 8 }}>
              <div style={{ height: 16, width: '75%', ...skeletonBg }} />
              <div style={{ height: 16, width: '66%', ...skeletonBg }} />
              <div style={{ height: 16, width: '50%', ...skeletonBg }} />
              <div style={{ height: 16, width: '33%', ...skeletonBg }} />
            </div>
          </div>
          <div className="sc-row" style={{ gap: 8, flexShrink: 0 }}>
            <div style={{ height: 44, width: 96, ...skeletonBg }} />
            <div style={{ height: 44, width: 96, ...skeletonBg }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sc-card-static" style={{ opacity: 0.7 }}>
      <div style={{ aspectRatio: '16 / 9', marginBottom: 16, ...skeletonBg }} />
      <div className="sc-stack" style={{ gap: 12 }}>
        <div>
          <div style={{ height: 20, width: '75%', marginBottom: 8, ...skeletonBg }} />
          <div style={{ height: 12, width: '33%', ...skeletonBg }} />
        </div>
        <div className="sc-stack" style={{ gap: 8 }}>
          <div style={{ height: 16, width: '66%', ...skeletonBg }} />
          <div style={{ height: 16, width: '50%', ...skeletonBg }} />
          <div style={{ height: 16, width: '33%', ...skeletonBg }} />
        </div>
        <div style={{ height: 44, width: '100%', ...skeletonBg }} />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="sc-card-static" style={{ opacity: 0.7 }}>
      <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, ...skeletonBg }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 28, width: 64, marginBottom: 8, ...skeletonBg }} />
          <div style={{ height: 12, width: 80, ...skeletonBg }} />
        </div>
      </div>
    </div>
  );
}
