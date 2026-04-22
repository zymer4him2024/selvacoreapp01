'use client';

import { useDraggable } from '@dnd-kit/core';
import { Order } from '@/types';
import { GripVertical } from 'lucide-react';

interface DraggableOrderProps {
  order: Order;
  isScheduled: boolean;
  scheduledLabel?: string;
  orderNumberLabel: string;
}

export default function DraggableOrder({ order, isScheduled, scheduledLabel, orderNumberLabel }: DraggableOrderProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { order },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 p-3 rounded-apple border transition-all cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-50 border-primary shadow-apple-lg'
          : isScheduled
            ? 'border-border bg-surface-elevated opacity-60'
            : 'border-border bg-surface hover:border-primary/50 hover:shadow-apple'
      }`}
    >
      <GripVertical className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{order.customerInfo?.name || 'Customer'}</p>
        <p className="text-xs text-text-tertiary">
          {orderNumberLabel} #{order.orderNumber}
        </p>
        {isScheduled && scheduledLabel && (
          <p className="text-xs text-primary mt-0.5">{scheduledLabel}</p>
        )}
      </div>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
        order.status === 'pending' ? 'bg-warning' : order.status === 'accepted' ? 'bg-primary' : 'bg-info'
      }`} />
    </div>
  );
}
