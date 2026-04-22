'use client';

import { useState } from 'react';
import { Order } from '@/types';
import DraggableOrder from './DraggableOrder';

interface UnassignedSidebarProps {
  unassignedOrders: Order[];
  activeOrders: Order[];
  labels: {
    unassigned: string;
    allActive: string;
    noUnassigned: string;
    dragToAssign: string;
    scheduled: string;
    orderNumber: string;
  };
}

const slotLabels: Record<string, string> = {
  '9-12': '9-12', '13-15': '13-15', '15-18': '15-18', '18-21': '18-21',
};

export default function UnassignedSidebar({ unassignedOrders, activeOrders, labels }: UnassignedSidebarProps) {
  const [tab, setTab] = useState<'unassigned' | 'all'>('unassigned');
  const orders = tab === 'unassigned' ? unassignedOrders : activeOrders;

  return (
    <div className="w-72 flex-shrink-0 bg-surface border border-border rounded-apple overflow-hidden flex flex-col h-full">
      {/* Tab toggle */}
      <div className="flex border-b border-border">
        {(['unassigned', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
              tab === t ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'unassigned' ? labels.unassigned : labels.allActive}
            <span className="ml-1 text-xs text-text-tertiary">
              ({t === 'unassigned' ? unassignedOrders.length : activeOrders.length})
            </span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {orders.length === 0 ? (
          <p className="text-sm text-text-tertiary text-center py-8">{labels.noUnassigned}</p>
        ) : (
          orders.map((order) => {
            const isScheduled = !!order.technicianId && !!order.scheduledAt;
            const date = order.scheduledAt?.toDate?.();
            const schedLabel = isScheduled && date
              ? `${labels.scheduled}: ${date.toLocaleDateString(undefined, { weekday: 'short' })} ${slotLabels[order.timeSlot] || ''}`
              : undefined;

            return (
              <DraggableOrder
                key={order.id}
                order={order}
                isScheduled={isScheduled}
                scheduledLabel={schedLabel}
                orderNumberLabel={labels.orderNumber}
              />
            );
          })
        )}
      </div>

      {orders.length > 0 && (
        <div className="px-3 py-2 border-t border-border text-xs text-text-tertiary text-center">
          {labels.dragToAssign}
        </div>
      )}
    </div>
  );
}
