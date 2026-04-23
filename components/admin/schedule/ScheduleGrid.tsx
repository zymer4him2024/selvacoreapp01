'use client';

import { useMemo } from 'react';
import { Order } from '@/types';
import { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import TechnicianRow from './TechnicianRow';

interface ScheduleGridProps {
  technicians: TechnicianWithStats[];
  weekDays: Date[];
  orders: Order[];
  labels: { noTechnicians: string; noOrders: string; timeTbd: string; reschedule: string; unassign: string; workload: string };
  noTechsLink?: string;
  onReschedule?: (order: Order) => void;
  onUnassign?: (order: Order) => void;
  focusedDayIdx?: number | null;
}

export default function ScheduleGrid({ technicians, weekDays, orders, labels, noTechsLink, onReschedule, onUnassign, focusedDayIdx }: ScheduleGridProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const dayHeaders = useMemo(() =>
    weekDays.map((d) => ({
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      date: d.getDate(),
      isToday: d.toISOString().split('T')[0] === todayStr,
    })), [weekDays, todayStr]);

  if (technicians.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[#86868B] text-lg">{labels.noTechnicians}</p>
        {noTechsLink && (
          <a href="/admin/technicians" className="inline-block mt-3 text-sm font-medium text-[#0071E3] hover:underline">
            {noTechsLink}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[960px] space-y-1">
        <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-px">
          <div />
          {dayHeaders.map((dh, i) => (
            <div
              key={i}
              className={`text-center py-2.5 rounded-[8px] transition-colors ${
                dh.isToday ? 'bg-[#0071E3] text-white' : 'bg-[#F5F5F7] text-[#86868B]'
              } ${focusedDayIdx === i ? 'ring-2 ring-[#0071E3] ring-offset-1' : ''}`}
            >
              <p className="text-xs font-medium uppercase">{dh.label}</p>
              <p className={`text-lg font-bold ${dh.isToday ? 'text-white' : 'text-[#1D1D1F]'}`}>{dh.date}</p>
            </div>
          ))}
        </div>

        {technicians.map((tech) => {
          const techOrders = orders.filter((o) => o.technicianId === tech.id);
          return (
            <TechnicianRow
              key={tech.id}
              technician={tech}
              weekDays={weekDays}
              orders={techOrders}
              todayStr={todayStr}
              timeTbdLabel={labels.timeTbd}
              workloadLabel={labels.workload}
              onReschedule={onReschedule}
              onUnassign={onUnassign}
              rescheduleLabel={labels.reschedule}
              unassignLabel={labels.unassign}
            />
          );
        })}

        {orders.length === 0 && technicians.length > 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[#86868B]">{labels.noOrders}</p>
          </div>
        )}
      </div>
    </div>
  );
}
