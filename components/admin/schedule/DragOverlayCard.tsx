'use client';

import { Order } from '@/types';
import JobCard from './JobCard';

interface DragOverlayCardProps {
  order: Order;
  timeTbdLabel: string;
}

export default function DragOverlayCard({ order, timeTbdLabel }: DragOverlayCardProps) {
  return (
    <div className="sc" style={{
      width: 140,
      opacity: 0.9,
      transform: 'rotate(2deg)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    }}>
      <JobCard order={order} timeTbdLabel={timeTbdLabel} />
    </div>
  );
}
