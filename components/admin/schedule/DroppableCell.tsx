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

  const baseStyle: React.CSSProperties = {
    minHeight: 88,
    padding: 6,
    borderRadius: 'var(--radius-md)',
    transition: 'background 0.15s ease',
  };

  let stateStyle: React.CSSProperties = {};
  if (isOver) {
    stateStyle = { background: 'var(--brand-tint)', border: '2px dashed var(--brand)' };
  } else if (isToday) {
    stateStyle = { background: 'rgba(16,185,129,0.05)', borderTop: '2px solid var(--brand)' };
  } else if (orders.length === 0) {
    stateStyle = { border: '1px dashed var(--hairline)' };
  }

  return (
    <div ref={setNodeRef} style={{ ...baseStyle, ...stateStyle }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
