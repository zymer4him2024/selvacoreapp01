'use client';

import { Order } from '@/types';
import { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import DroppableCell from './DroppableCell';

interface TechnicianRowProps {
  technician: TechnicianWithStats;
  weekDays: Date[];
  orders: Order[];
  todayStr: string;
  timeTbdLabel: string;
  workloadLabel: string;
  onReschedule?: (order: Order) => void;
  onUnassign?: (order: Order) => void;
  rescheduleLabel?: string;
  unassignLabel?: string;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getEffectiveDate(order: Order): Date | null {
  const ts = order.scheduledAt || order.installationDate;
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts as unknown as string);
}

export default function TechnicianRow({
  technician, weekDays, orders, todayStr, timeTbdLabel, workloadLabel,
  onReschedule, onUnassign, rescheduleLabel, unassignLabel,
}: TechnicianRowProps) {
  const totalMinutes = orders.reduce((sum, o) => sum + (o.estimatedDurationMinutes || 0), 0);
  const hrs = Math.round((totalMinutes / 60) * 10) / 10;
  const workload = workloadLabel.replace('{jobs}', String(orders.length)).replace('{hrs}', String(hrs));

  return (
    <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-px">
      <div className="sticky left-0 z-[2] flex items-center gap-2.5 px-3 py-3 bg-white rounded-[12px] border border-[#E5E5EA] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0071E3] to-[#34C759] flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-white">
            {technician.displayName?.charAt(0) || '?'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1D1D1F] truncate">{technician.displayName}</p>
          <p className="text-[10px] text-[#86868B] truncate">{workload}</p>
        </div>
      </div>

      {weekDays.map((day) => {
        const dateStr = day.toISOString().split('T')[0];
        const dayOrders = orders.filter((o) => {
          const d = getEffectiveDate(o);
          return d && isSameDay(d, day);
        });

        return (
          <DroppableCell
            key={dateStr}
            technicianId={technician.id}
            date={day}
            isToday={dateStr === todayStr}
            orders={dayOrders}
            timeTbdLabel={timeTbdLabel}
            onReschedule={onReschedule}
            onUnassign={onUnassign}
            rescheduleLabel={rescheduleLabel}
            unassignLabel={unassignLabel}
          />
        );
      })}
    </div>
  );
}
