import { useState, useEffect, useCallback, useMemo } from 'react';
import { Order, SubContractor } from '@/types';
import { TechnicianWithStats, getApprovedTechnicians } from '@/lib/services/technicianAdminService';
import { getOrdersInDateRange, getUnscheduledOrders } from '@/lib/services/orderService';
import { getAllSubContractors } from '@/lib/services/subContractorService';
import { useScheduleMutations } from './useScheduleMutations';
import toast from 'react-hot-toast';

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function useScheduleData() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [technicians, setTechnicians] = useState<TechnicianWithStats[]>([]);
  const [weekOrders, setWeekOrders] = useState<Order[]>([]);
  const [unscheduled, setUnscheduled] = useState<Order[]>([]);
  const [subContractors, setSubContractors] = useState<SubContractor[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [weekStart]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [techs, orders, unsched, scs] = await Promise.all([
        getApprovedTechnicians(),
        getOrdersInDateRange(weekStart, weekEnd),
        getUnscheduledOrders(),
        getAllSubContractors(),
      ]);
      setTechnicians(techs);
      setWeekOrders(orders);
      setUnscheduled(unsched);
      setSubContractors(scs);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  const prevWeek = useCallback(() => {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  }, []);
  const nextWeek = useCallback(() => {
    setWeekStart((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  }, []);
  const goToday = useCallback(() => setWeekStart(getMonday(new Date())), []);

  const mutations = useScheduleMutations(weekOrders, unscheduled, setWeekOrders, setUnscheduled);

  return {
    weekStart, weekDays, weekOrders, unscheduled, technicians, subContractors,
    loading, prevWeek, nextWeek, goToday, ...mutations,
  };
}
