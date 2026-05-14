'use client';

import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { SubContractor } from '@/types';

interface WeekHeaderProps {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  subContractors: SubContractor[];
  scFilter: string;
  onScFilterChange: (value: string) => void;
  labels: {
    today: string;
    weekOf: string;
    allSubContractors: string;
    independent: string;
    printWeek: string;
  };
  showScFilter?: boolean;
}

const navIconBtn: React.CSSProperties = {
  padding: 8,
  background: 'transparent',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  color: 'var(--ink)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s ease',
};

export default function WeekHeader({
  weekStart, onPrev, onNext, onToday, subContractors, scFilter, onScFilterChange, labels,
  showScFilter = true,
}: WeekHeaderProps) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onToday} className="sc-cta" style={{ padding: '8px 16px', fontSize: 13 }}>
          {labels.today}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={onPrev}
            style={navIconBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={onNext}
            style={navIconBtn}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          {labels.weekOf} {fmt(weekStart)} &ndash; {fmt(weekEnd)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {showScFilter && (
          <select
            value={scFilter}
            onChange={(e) => onScFilterChange(e.target.value)}
            className="sc-select"
            style={{ fontSize: 13 }}
          >
            <option value="all">{labels.allSubContractors}</option>
            <option value="independent">{labels.independent}</option>
            {subContractors.map((sc) => (
              <option key={sc.id} value={sc.id}>{sc.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => window.print()}
          className="no-print sc-cta-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', fontSize: 13 }}
        >
          <Printer size={16} />
          {labels.printWeek}
        </button>
      </div>
    </div>
  );
}
