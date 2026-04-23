'use client';

import { Order } from '@/types';
import JobCard from './JobCard';

interface DragOverlayCardProps {
  order: Order;
  timeTbdLabel: string;
}

export default function DragOverlayCard({ order, timeTbdLabel }: DragOverlayCardProps) {
  return (
    <div className="w-[140px] opacity-90 rotate-2 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
      <JobCard order={order} timeTbdLabel={timeTbdLabel} />
    </div>
  );
}
