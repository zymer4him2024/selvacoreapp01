'use client';

import { Order } from '@/types';
import { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import DroppableCell from './DroppableCell';

interface TechnicianRowProps {
  technician: TechnicianWithStats;
  weekDays: Date[];
  orders: Order[];
  today: string;
  timeTbdLabel: string;
  dropHereLabel: string;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function getOrderDate(order: Order): Date | null {
  const ts = order.scheduledAt || order.installationDate;
  if (!ts) return null;
  return ts.toDate ? ts.toDate() : new Date(ts as unknown as string);
}

export default function TechnicianRow({ technician, weekDays, orders, today, timeTbdLabel, dropHereLabel }: TechnicianRowProps) {
  return (
    <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 items-stretch">
      {/* Technician name */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface rounded-apple border border-border">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-white">
            {technician.displayName?.charAt(0) || '?'}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{technician.displayName}</p>
          <p className="text-xs text-text-tertiary truncate">{technician.phone || ''}</p>
        </div>
      </div>

      {/* Day cells */}
      {weekDays.map((day) => {
        const dayOrders = orders.filter((o) => {
          const d = getOrderDate(o);
          return d && isSameDay(d, day);
        });
        const dateStr = day.toISOString().split('T')[0];
        const cellId = `${technician.id}_${dateStr}`;

        return (
          <DroppableCell
            key={cellId}
            id={cellId}
            orders={dayOrders}
            isToday={dateStr === today}
            timeTbdLabel={timeTbdLabel}
            dropHereLabel={dropHereLabel}
          />
        );
      })}
    </div>
  );
}
