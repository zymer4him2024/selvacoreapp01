'use client';

import { useDroppable } from '@dnd-kit/core';
import { Order } from '@/types';
import OrderChip from './OrderChip';

interface DroppableCellProps {
  id: string;
  orders: Order[];
  isToday: boolean;
  timeTbdLabel: string;
  dropHereLabel: string;
}

export default function DroppableCell({ id, orders, isToday, timeTbdLabel, dropHereLabel }: DroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-1.5 rounded-apple border transition-all ${
        isOver
          ? 'border-primary bg-primary/5 border-dashed'
          : isToday
            ? 'border-primary/30 bg-primary/5'
            : 'border-border bg-surface'
      }`}
    >
      {isOver && orders.length === 0 && (
        <div className="flex items-center justify-center h-full text-xs text-primary font-medium">
          {dropHereLabel}
        </div>
      )}
      <div className="space-y-1">
        {orders.map((order) => (
          <OrderChip
            key={order.id}
            order={order}
            isTimeTbd={!order.scheduledAt}
            timeTbdLabel={timeTbdLabel}
          />
        ))}
      </div>
    </div>
  );
}
