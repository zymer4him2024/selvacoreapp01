'use client';

import { DndContext, DragEndEvent, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { Order } from '@/types';
import { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import TechnicianRow from './TechnicianRow';
import DraggableOrder from './DraggableOrder';

interface ScheduleGridProps {
  technicians: TechnicianWithStats[];
  weekDays: Date[];
  orders: Order[];
  labels: { noTechnicians: string; noOrders: string; timeTbd: string; dropHere: string; orderNumber: string };
  onDrop: (orderId: string, technicianId: string, date: Date) => void;
  sidebarOrders: Order[];
}

export default function ScheduleGrid({ technicians, weekDays, orders, labels, onDrop, sidebarOrders }: ScheduleGridProps) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const today = new Date().toISOString().split('T')[0];

  const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 8 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: { active: { id: string | number; data: { current?: { order?: Order } } } }) => {
    const order = event.active.data.current?.order
      || sidebarOrders.find((o) => o.id === event.active.id)
      || orders.find((o) => o.id === event.active.id);
    setActiveOrder(order || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveOrder(null);
    const { active, over } = event;
    if (!over) return;
    const cellId = over.id as string;
    const [techId, dateStr] = cellId.split('_');
    if (!techId || !dateStr) return;
    onDrop(active.id as string, techId, new Date(dateStr + 'T00:00:00'));
  };

  const dayHeaders = weekDays.map((d) => ({
    label: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
    isToday: d.toISOString().split('T')[0] === today,
  }));

  if (technicians.length === 0) {
    return <p className="text-text-tertiary text-center py-12">{labels.noTechnicians}</p>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-1 overflow-x-auto">
        {/* Day headers */}
        <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 sticky top-0 z-5">
          <div />
          {dayHeaders.map((dh, i) => (
            <div key={i} className={`text-center text-sm font-semibold py-2 rounded-apple ${
              dh.isToday ? 'bg-primary text-white' : 'bg-surface-elevated text-text-secondary'
            }`}>
              {dh.label}
            </div>
          ))}
        </div>

        {/* Technician rows */}
        {technicians.map((tech) => {
          const techOrders = orders.filter((o) => o.technicianId === tech.id);
          return (
            <TechnicianRow
              key={tech.id}
              technician={tech}
              weekDays={weekDays}
              orders={techOrders}
              today={today}
              timeTbdLabel={labels.timeTbd}
              dropHereLabel={labels.dropHere}
            />
          );
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeOrder && (
          <div className="w-64 opacity-90">
            <DraggableOrder order={activeOrder} isScheduled={false} orderNumberLabel={labels.orderNumber} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
