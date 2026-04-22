'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useScheduleData } from '@/hooks/useScheduleData';
import { Order } from '@/types';
import { TimeSlot } from '@/types/user';
import WeekNavigator from '@/components/admin/schedule/WeekNavigator';
import ScheduleGrid from '@/components/admin/schedule/ScheduleGrid';
import UnassignedSidebar from '@/components/admin/schedule/UnassignedSidebar';
import AssignModal from '@/components/admin/schedule/AssignModal';
import toast from 'react-hot-toast';
export default function SchedulePage() {
  const { userData } = useAuth();
  const { t } = useTranslation();
  const s = t.admin.schedule;
  const data = useScheduleData();

  const [scFilter, setScFilter] = useState('all');
  const [modal, setModal] = useState<{ order: Order; techId: string; date: Date } | null>(null);

  const filteredTechs = scFilter === 'all'
    ? data.technicians
    : scFilter === 'independent'
      ? data.technicians.filter((tc) => !tc.subContractorId)
      : data.technicians.filter((tc) => tc.subContractorId === scFilter);

  const handleDrop = (orderId: string, techId: string, date: Date) => {
    const all = [...data.unassignedOrders, ...data.activeOrders, ...data.weekOrders];
    const order = all.find((o) => o.id === orderId);
    if (order) setModal({ order, techId, date });
  };

  const handleConfirm = async (timeSlot: TimeSlot, durationMinutes: number) => {
    if (!modal || !userData) return;
    try {
      const { isReassign } = await data.assignOrder(modal.order, modal.techId, modal.date, timeSlot, durationMinutes, userData.id);
      toast.success(isReassign ? s.reassignSuccess : s.assignSuccess);
      setModal(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : s.assignFailed);
    }
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">{s.loading}</p>
        </div>
      </div>
    );
  }

  const modalTech = modal ? data.technicians.find((tc) => tc.id === modal.techId) : null;
  const defaultDur = modal?.order.serviceSnapshot?.duration ? modal.order.serviceSnapshot.duration * 60 : 60;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">{s.title}</h1>
        <p className="text-text-secondary mt-1">{s.subtitle}</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <WeekNavigator weekStart={data.weekStart} onPrev={data.prevWeek} onNext={data.nextWeek}
          onToday={data.goToday} todayLabel={s.today} weekOfLabel={s.weekOf} />
        <select value={scFilter} onChange={(e) => setScFilter(e.target.value)}
          className="px-4 py-2 border border-border rounded-apple bg-surface focus:border-primary focus:outline-none text-sm">
          <option value="all">{s.allSubContractors}</option>
          <option value="independent">{s.independent}</option>
          {data.subContractors.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
        </select>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <ScheduleGrid technicians={filteredTechs} weekDays={data.weekDays} orders={data.weekOrders}
            labels={{ noTechnicians: s.noTechnicians, noOrders: s.noOrders, timeTbd: s.timeTbd, dropHere: s.dropHere, orderNumber: s.orderNumber }}
            onDrop={handleDrop} sidebarOrders={[...data.unassignedOrders, ...data.activeOrders]} />
        </div>
        <UnassignedSidebar unassignedOrders={data.unassignedOrders} activeOrders={data.activeOrders}
          labels={{ unassigned: s.unassigned, allActive: s.allActive, noUnassigned: s.noUnassigned,
            dragToAssign: s.dragToAssign, scheduled: s.scheduled, orderNumber: s.orderNumber }} />
      </div>

      {modal && modalTech && (
        <AssignModal order={modal.order} technicianName={modalTech.displayName} date={modal.date}
          existingSlotCounts={data.getSlotCounts(modal.techId, modal.date)} defaultDuration={defaultDur}
          isReassign={!!modal.order.technicianId && modal.order.technicianId !== modal.techId}
          labels={{ assignOrder: s.assignOrder, reassignOrder: s.reassignOrder, selectTimeSlot: s.selectTimeSlot,
            estimatedDuration: s.estimatedDuration, jobsScheduled: s.jobsScheduled, confirm: s.confirm,
            cancel: s.cancel, orderNumber: s.orderNumber }}
          onConfirm={handleConfirm} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
