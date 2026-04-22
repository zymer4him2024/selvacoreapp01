import { useState, useEffect, useCallback } from 'react';
import { Order, SubContractor } from '@/types';
import { TimeSlot } from '@/types/user';
import { TechnicianWithStats, getAllTechnicians } from '@/lib/services/technicianAdminService';
import { getOrdersForWeek, getUnassignedOrders, getActiveOrders, assignOrderToTechnician, reassignOrder } from '@/lib/services/orderService';
import { getAllSubContractors } from '@/lib/services/subContractorService';
import { createNotification } from '@/lib/services/notificationService';

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function useScheduleData() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [technicians, setTechnicians] = useState<TechnicianWithStats[]>([]);
  const [weekOrders, setWeekOrders] = useState<Order[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [subContractors, setSubContractors] = useState<SubContractor[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [techs, wOrders, uOrders, aOrders, scs] = await Promise.all([
        getAllTechnicians('approved'),
        getOrdersForWeek(weekStart, weekEnd),
        getUnassignedOrders(),
        getActiveOrders(),
        getAllSubContractors(),
      ]);
      setTechnicians(techs);
      setWeekOrders(wOrders);
      setUnassignedOrders(uOrders);
      setActiveOrders(aOrders);
      setSubContractors(scs);
    } catch {
      throw new Error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { loadData(); }, [loadData]);

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => setWeekStart(getWeekStart(new Date()));

  const getSlotCounts = (techId: string, date: Date): Record<string, number> => {
    const dateStr = date.toISOString().split('T')[0];
    const counts: Record<string, number> = {};
    weekOrders.filter((o) => {
      if (o.technicianId !== techId) return false;
      const d = (o.scheduledAt || o.installationDate)?.toDate?.();
      return d && d.toISOString().split('T')[0] === dateStr;
    }).forEach((o) => { counts[o.timeSlot] = (counts[o.timeSlot] || 0) + 1; });
    return counts;
  };

  const assignOrder = async (
    order: Order, techId: string, date: Date,
    timeSlot: TimeSlot, durationMinutes: number, adminId: string,
  ): Promise<{ isReassign: boolean }> => {
    const tech = technicians.find((t) => t.id === techId);
    if (!tech) throw new Error('Technician not found');

    const techInfo = { name: tech.displayName, phone: tech.phone || '', whatsapp: tech.whatsapp || '', photo: tech.photoURL || '', rating: tech.averageRating || 0 };
    const isReassign = !!order.technicianId && order.technicianId !== techId;

    if (isReassign) {
      const { previousTechnicianId } = await reassignOrder(order.id, techId, techInfo, date, timeSlot, durationMinutes, adminId);
      if (previousTechnicianId) {
        await createNotification({
          userId: previousTechnicianId, type: 'order_reassigned', title: 'Order Reassigned',
          body: `Order #${order.orderNumber} has been reassigned by admin.`,
          link: '/technician/jobs', metadata: { orderId: order.id, orderNumber: order.orderNumber },
        });
      }
    } else {
      await assignOrderToTechnician(order.id, techId, techInfo, date, timeSlot, durationMinutes, adminId);
    }

    await loadData();
    return { isReassign };
  };

  return {
    weekStart, weekDays: getWeekDays(weekStart), technicians, weekOrders,
    unassignedOrders, activeOrders, subContractors,
    loading, loadData, prevWeek, nextWeek, goToday, getSlotCounts, assignOrder,
  };
}
