'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '@/types';
import JobCard from './JobCard';

interface DraggableJobCardProps {
  order: Order;
  timeTbdLabel: string;
  onReschedule?: () => void;
  onUnassign?: () => void;
  rescheduleLabel?: string;
  unassignLabel?: string;
}

export default function DraggableJobCard({
  order, timeTbdLabel, onReschedule, onUnassign, rescheduleLabel, unassignLabel,
}: DraggableJobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `order-${order.id}`,
    data: { order },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <JobCard
        order={order}
        timeTbdLabel={timeTbdLabel}
        onReschedule={onReschedule}
        onUnassign={onUnassign}
        rescheduleLabel={rescheduleLabel}
        unassignLabel={unassignLabel}
      />
    </div>
  );
}
