'use client';

import { useDroppable } from '@dnd-kit/core';
import { Order } from '@/types';
import DraggableJobCard from './DraggableJobCard';

interface DroppableCellProps {
  technicianId: string;
  date: Date;
  isToday: boolean;
  orders: Order[];
  timeTbdLabel: string;
  onReschedule?: (order: Order) => void;
  onUnassign?: (order: Order) => void;
  rescheduleLabel?: string;
  unassignLabel?: string;
}

export default function DroppableCell({
  technicianId, date, isToday, orders, timeTbdLabel,
  onReschedule, onUnassign, rescheduleLabel, unassignLabel,
}: DroppableCellProps) {
  const droppableId = `cell-${technicianId}-${date.toISOString().split('T')[0]}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { technicianId, date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[88px] p-1.5 rounded-[12px] transition-colors ${
        isOver ? 'bg-[#0071E3]/[0.08] border-2 border-[#0071E3]' : ''
      } ${isToday && !isOver ? 'bg-[#0071E3]/[0.04] border-t-2 border-t-[#0071E3]' : ''} ${
        !isOver && !isToday && orders.length === 0 ? 'border border-dashed border-[#E5E5EA]' : ''
      } ${!isOver && !isToday && orders.length > 0 ? '' : ''}`}
    >
      <div className="space-y-1.5">
        {orders.map((order) => (
          <DraggableJobCard
            key={order.id}
            order={order}
            timeTbdLabel={timeTbdLabel}
            onReschedule={onReschedule ? () => onReschedule(order) : undefined}
            onUnassign={onUnassign ? () => onUnassign(order) : undefined}
            rescheduleLabel={rescheduleLabel}
            unassignLabel={unassignLabel}
          />
        ))}
      </div>
    </div>
  );
}
