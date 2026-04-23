import { useEffect, useCallback, useState } from 'react';

export function useScheduleKeyboard(
  weekDays: Date[],
  onPrevWeek: () => void,
  onNextWeek: () => void,
) {
  const [focusedDayIdx, setFocusedDayIdx] = useState<number | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        onPrevWeek();
        setFocusedDayIdx(null);
        break;
      case 'ArrowRight':
        e.preventDefault();
        onNextWeek();
        setFocusedDayIdx(null);
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        setFocusedDayIdx((prev) => {
          if (prev === null) return 0;
          return Math.min(prev + 1, weekDays.length - 1);
        });
        break;
      case 'k':
      case 'K':
        e.preventDefault();
        setFocusedDayIdx((prev) => {
          if (prev === null) return weekDays.length - 1;
          return Math.max(prev - 1, 0);
        });
        break;
      case 'Escape':
        setFocusedDayIdx(null);
        break;
    }
  }, [onPrevWeek, onNextWeek, weekDays.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { focusedDayIdx };
}
