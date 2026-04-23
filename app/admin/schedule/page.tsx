'use client';

import { useState } from 'react';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { useScheduleData } from '@/hooks/useScheduleData';
import { useDragHandlers } from '@/hooks/useDragHandlers';
import { useScheduleKeyboard } from '@/hooks/useScheduleKeyboard';
import WeekHeader from '@/components/admin/schedule/WeekHeader';
import ScheduleGrid from '@/components/admin/schedule/ScheduleGrid';
import UnscheduledJobsSidebar from '@/components/admin/schedule/UnscheduledJobsSidebar';
import DragOverlayCard from '@/components/admin/schedule/DragOverlayCard';
import { Order } from '@/types';

export default function SchedulePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const s = t.admin.schedule;
  const data = useScheduleData();
  const [scFilter, setScFilter] = useState('all');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const adminId = user?.uid || 'admin';
  const labels = { success: s.scheduleSuccess, fail: s.scheduleFailed };
  const { handleDragEnd } = useDragHandlers(data, adminId, labels);
  const { focusedDayIdx } = useScheduleKeyboard(data.weekDays, data.prevWeek, data.nextWeek);

  const onDragStart = (e: DragStartEvent) => setActiveOrder((e.active.data.current as { order: Order })?.order ?? null);
  const onDragEnd = (e: DragEndEvent) => { handleDragEnd(e); setActiveOrder(null); };

  const filteredTechs = scFilter === 'all'
    ? data.technicians
    : scFilter === 'independent'
      ? data.technicians.filter((tc) => !tc.subContractorId)
      : data.technicians.filter((tc) => tc.subContractorId === scFilter);

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#0071E3] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#86868B]">{s.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1D1D1F]">{s.title}</h1>
        <p className="text-[#86868B] mt-1">{s.subtitle}</p>
      </div>

      <WeekHeader
        weekStart={data.weekStart} onPrev={data.prevWeek} onNext={data.nextWeek} onToday={data.goToday}
        subContractors={data.subContractors} scFilter={scFilter} onScFilterChange={setScFilter}
        showScFilter={data.subContractors.length > 0}
        labels={{ today: s.today, weekOf: s.weekOf, allSubContractors: s.allSubContractors, independent: s.independent, printWeek: s.printWeek }}
      />

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4">
          <div className="flex-1 min-w-0 schedule-print-area">
            <ScheduleGrid
              technicians={filteredTechs} weekDays={data.weekDays} orders={data.weekOrders}
              focusedDayIdx={focusedDayIdx}
              noTechsLink={s.manageTechnicians}
              labels={{ noTechnicians: s.noTechnicians, noOrders: s.noOrders, timeTbd: s.timeTbd, reschedule: s.reschedule, unassign: s.unassign, workload: s.workload }}
              onUnassign={(order) => data.handleUnschedule(order, adminId, { success: s.unscheduleSuccess, fail: s.scheduleFailed })}
            />
          </div>
          <UnscheduledJobsSidebar
            orders={data.unscheduled} isDraggingOver={!!activeOrder}
            labels={{ unscheduledOrders: s.unscheduledOrders, noUnscheduled: s.noUnscheduled, dropToUnschedule: s.dropToUnschedule, collapsePanel: s.collapsePanel, expandPanel: s.expandPanel, timeTbd: s.timeTbd }}
          />
        </div>
        <DragOverlay>
          {activeOrder && <DragOverlayCard order={activeOrder} timeTbdLabel={s.timeTbd} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
