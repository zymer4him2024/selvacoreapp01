'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekNavigatorProps {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  todayLabel: string;
  weekOfLabel: string;
}

export default function WeekNavigator({ weekStart, onPrev, onNext, onToday, todayLabel, weekOfLabel }: WeekNavigatorProps) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToday}
        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-apple hover:bg-primary-hover transition-colors"
      >
        {todayLabel}
      </button>
      <div className="flex items-center gap-1">
        <button onClick={onPrev} className="p-2 hover:bg-surface-elevated rounded-apple transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={onNext} className="p-2 hover:bg-surface-elevated rounded-apple transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <span className="text-lg font-semibold">
        {weekOfLabel} {fmt(weekStart)} &ndash; {fmt(weekEnd)}
      </span>
    </div>
  );
}
