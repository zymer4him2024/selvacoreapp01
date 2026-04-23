import { useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { Order } from '@/types';

interface ScheduleDataWithMutations {
  weekOrders: Order[];
  unscheduled: Order[];
  handleSchedule: (order: Order, technicianId: string, date: Date, adminId: string, labels: { success: string; fail: string }) => Promise<void>;
  handleReschedule: (order: Order, technicianId: string, date: Date, adminId: string, labels: { success: string; fail: string }) => Promise<void>;
  handleUnschedule: (order: Order, adminId: string, labels: { success: string; fail: string }) => Promise<void>;
}

export function useDragHandlers(
  data: ScheduleDataWithMutations,
  adminId: string,
  labels: { success: string; fail: string },
) {
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active.data.current) return;

    const order = (active.data.current as { order: Order }).order;
    const overId = over.id as string;

    // Dropped on the unschedule sidebar
    if (overId === 'sidebar-unscheduled') {
      if (order.scheduledAt) {
        data.handleUnschedule(order, adminId, labels);
      }
      return;
    }

    // Dropped on a technician day cell (format: cell-{techId}-{dateStr})
    if (overId.startsWith('cell-')) {
      const parts = overId.split('-');
      const technicianId = parts[1];
      const dateStr = parts.slice(2).join('-');
      const date = new Date(dateStr + 'T09:00:00');

      const isFromSidebar = !order.scheduledAt;
      if (isFromSidebar) {
        data.handleSchedule(order, technicianId, date, adminId, labels);
      } else {
        data.handleReschedule(order, technicianId, date, adminId, labels);
      }
    }
  }, [data, adminId, labels]);

  return { handleDragEnd };
}
