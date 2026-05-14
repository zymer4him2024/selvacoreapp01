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
      <div style={{ textAlign: 'center', padding: '64px 0' }}>
        <p style={{ fontSize: 18, color: 'var(--soft)', margin: 0 }}>{labels.noTechnicians}</p>
        {noTechsLink && (
          <a
            href="/admin/technicians"
            style={{
              display: 'inline-block',
              marginTop: 12,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--brand)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
          >
            {noTechsLink}
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 960, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(7, 1fr)', gap: 1 }}>
          <div />
          {dayHeaders.map((dh, i) => {
            const focused = focusedDayIdx === i;
            return (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  padding: '10px 0',
                  borderRadius: 'var(--radius-md)',
                  background: dh.isToday ? 'var(--brand)' : 'var(--off-paper)',
                  color: dh.isToday ? '#fff' : 'var(--soft)',
                  outline: focused ? '2px solid var(--brand)' : 'none',
                  outlineOffset: focused ? 1 : 0,
                  transition: 'background 0.15s ease',
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', margin: 0 }}>{dh.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, margin: 0, color: dh.isToday ? '#fff' : 'var(--ink)' }}>{dh.date}</p>
              </div>
            );
          })}
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
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p className="sc-helper" style={{ margin: 0 }}>{labels.noOrders}</p>
          </div>
        )}
      </div>
    </div>
  );
}
