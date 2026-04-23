'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Order } from '@/types';
import DraggableJobCard from './DraggableJobCard';

interface UnscheduledJobsSidebarProps {
  orders: Order[];
  labels: {
    unscheduledOrders: string;
    noUnscheduled: string;
    dropToUnschedule: string;
    collapsePanel: string;
    expandPanel: string;
    timeTbd: string;
  };
  isDraggingOver: boolean;
}

export default function UnscheduledJobsSidebar({ orders, labels, isDraggingOver }: UnscheduledJobsSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: 'sidebar-unscheduled' });

  const highlight = isOver || isDraggingOver;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-[#FF9500] text-white px-2 py-4 rounded-l-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] text-xs font-semibold [writing-mode:vertical-lr]"
      >
        {labels.expandPanel} ({orders.length})
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-[260px] flex-shrink-0 rounded-[12px] border transition-colors p-3 space-y-2 ${
        highlight
          ? 'border-[#FF9500] bg-[#FF9500]/[0.06]'
          : 'border-[#E5E5EA] bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1D1D1F]">
          {labels.unscheduledOrders} ({orders.length})
        </h3>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-[#86868B] hover:text-[#1D1D1F] transition-colors"
        >
          {labels.collapsePanel}
        </button>
      </div>

      {highlight && (
        <div className="border-2 border-dashed border-[#FF9500] rounded-[8px] py-3 text-center">
          <p className="text-xs text-[#FF9500] font-medium">{labels.dropToUnschedule}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-xs text-[#86868B] text-center py-4">{labels.noUnscheduled}</p>
      ) : (
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {orders.map((order) => (
            <DraggableJobCard key={order.id} order={order} timeTbdLabel={labels.timeTbd} />
          ))}
        </div>
      )}
    </div>
  );
}
