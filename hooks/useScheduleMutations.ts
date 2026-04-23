import { useCallback } from 'react';
import { Order } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { scheduleOrder, rescheduleOrder, unscheduleOrder } from '@/lib/services/orderService';
import toast from 'react-hot-toast';

interface MutationLabels { success: string; fail: string }

export function useScheduleMutations(
  weekOrders: Order[],
  unscheduled: Order[],
  setWeekOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  setUnscheduled: React.Dispatch<React.SetStateAction<Order[]>>,
) {
  const handleSchedule = useCallback(async (
    order: Order, technicianId: string, date: Date, adminId: string, labels: MutationLabels,
  ) => {
    const prev = { weekOrders, unscheduled };
    const updated = { ...order, technicianId, scheduledAt: Timestamp.fromDate(date), status: 'accepted' as const };
    setUnscheduled((u) => u.filter((o) => o.id !== order.id));
    setWeekOrders((w) => [...w, updated]);
    try {
      await scheduleOrder(order.id, technicianId, date, adminId);
      toast.success(labels.success);
    } catch {
      setWeekOrders(prev.weekOrders);
      setUnscheduled(prev.unscheduled);
      toast.error(labels.fail);
    }
  }, [weekOrders, unscheduled, setWeekOrders, setUnscheduled]);

  const handleReschedule = useCallback(async (
    order: Order, technicianId: string, date: Date, adminId: string, labels: MutationLabels,
  ) => {
    const prevOrders = weekOrders;
    const updated = { ...order, technicianId, scheduledAt: Timestamp.fromDate(date) };
    setWeekOrders((w) => w.map((o) => (o.id === order.id ? updated : o)));
    try {
      await rescheduleOrder(order.id, technicianId, date, adminId);
      toast.success(labels.success);
    } catch {
      setWeekOrders(prevOrders);
      toast.error(labels.fail);
    }
  }, [weekOrders, setWeekOrders]);

  const handleUnschedule = useCallback(async (
    order: Order, adminId: string, labels: MutationLabels,
  ) => {
    const prev = { weekOrders, unscheduled };
    const reverted = { ...order, technicianId: null, scheduledAt: null, status: 'pending' as const };
    setWeekOrders((w) => w.filter((o) => o.id !== order.id));
    setUnscheduled((u) => [reverted, ...u]);
    try {
      await unscheduleOrder(order.id, adminId);
      toast.success(labels.success);
    } catch {
      setWeekOrders(prev.weekOrders);
      setUnscheduled(prev.unscheduled);
      toast.error(labels.fail);
    }
  }, [weekOrders, unscheduled, setWeekOrders, setUnscheduled]);

  return { handleSchedule, handleReschedule, handleUnschedule };
}
