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
    <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(7, 1fr)', gap: 1 }}>
      <div style={{
        position: 'sticky',
        left: 0,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px',
        background: 'var(--paper)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--hairline)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 'var(--radius-full)',
          background: 'var(--brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
            {technician.displayName?.charAt(0) || '?'}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{technician.displayName}</p>
          <p style={{
            fontSize: 10,
            color: 'var(--soft)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{workload}</p>
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
