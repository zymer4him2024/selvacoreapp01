'use client';

import { Order } from '@/types';

interface OrderChipProps {
  order: Order;
  isTimeTbd: boolean;
  timeTbdLabel: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning',
  accepted: 'bg-primary/20 text-primary',
  in_progress: 'bg-info/20 text-info',
  completed: 'bg-success/20 text-success',
};

const slotLabels: Record<string, string> = {
  '9-12': '9-12',
  '13-15': '13-15',
  '15-18': '15-18',
  '18-21': '18-21',
};

export default function OrderChip({ order, isTimeTbd, timeTbdLabel }: OrderChipProps) {
  const colorClass = statusColors[order.status] || 'bg-surface-elevated text-text-secondary';

  return (
    <div
      className={`px-2 py-1.5 rounded-lg text-xs leading-tight ${
        isTimeTbd ? 'border border-dashed border-warning/60' : 'border border-border'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colorClass.split(' ')[0]?.replace('/20', '')}`} />
        <span className="font-medium truncate">{order.customerInfo?.name || 'Customer'}</span>
      </div>
      <div className="flex items-center gap-1 mt-0.5 text-text-tertiary">
        {isTimeTbd ? (
          <span className="text-warning font-medium">{timeTbdLabel}</span>
        ) : (
          <span>{slotLabels[order.timeSlot] || order.timeSlot}</span>
        )}
        <span>&middot;</span>
        <span className={`${colorClass} px-1 rounded`}>{order.status}</span>
      </div>
    </div>
  );
}
