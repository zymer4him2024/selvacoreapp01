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

export default function WeekHeader({
  weekStart, onPrev, onNext, onToday, subContractors, scFilter, onScFilterChange, labels,
  showScFilter = true,
}: WeekHeaderProps) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToday}
          className="px-4 py-2 text-sm font-medium bg-[#0071E3] text-white rounded-[8px] hover:opacity-90 transition-opacity"
        >
          {labels.today}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="p-2 rounded-[8px] hover:bg-[#F5F5F7] transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#1D1D1F]" />
          </button>
          <button onClick={onNext} className="p-2 rounded-[8px] hover:bg-[#F5F5F7] transition-colors">
            <ChevronRight className="w-5 h-5 text-[#1D1D1F]" />
          </button>
        </div>
        <span className="text-lg font-semibold text-[#1D1D1F]">
          {labels.weekOf} {fmt(weekStart)} &ndash; {fmt(weekEnd)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {showScFilter && (
          <select
            value={scFilter}
            onChange={(e) => onScFilterChange(e.target.value)}
            className="px-4 py-2 text-sm border border-[#E5E5EA] rounded-[8px] bg-white text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
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
          className="no-print flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[#E5E5EA] rounded-[8px] bg-white text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
        >
          <Printer className="w-4 h-4" />
          {labels.printWeek}
        </button>
      </div>
    </div>
  );
}
