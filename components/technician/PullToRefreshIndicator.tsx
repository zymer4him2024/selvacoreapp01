'use client';

import { ArrowDown, Loader2 } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  progress: number;
  refreshing: boolean;
}

export default function PullToRefreshIndicator({ pullDistance, progress, refreshing }: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !refreshing) return null;

  const height = refreshing ? 56 : pullDistance;
  const ready = progress >= 1;

  return (
    <div
      className="md:hidden fixed top-16 left-0 right-0 z-30 flex items-center justify-center overflow-hidden pointer-events-none"
      style={{ height: `${height}px`, transition: refreshing ? 'height 200ms ease-out' : 'none' }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-center w-10 h-10 bg-surface rounded-full shadow-apple border border-border">
        {refreshing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <ArrowDown
            className={`w-5 h-5 text-primary transition-transform duration-200 ${ready ? 'rotate-180' : ''}`}
            style={{ opacity: progress }}
          />
        )}
      </div>
    </div>
  );
}
