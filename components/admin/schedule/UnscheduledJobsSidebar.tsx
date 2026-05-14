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
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          background: 'var(--warn)',
          color: '#fff',
          padding: '16px 8px',
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          fontSize: 12,
          fontWeight: 600,
          writingMode: 'vertical-lr',
          cursor: 'pointer',
        }}
      >
        {labels.expandPanel} ({orders.length})
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 260,
        flexShrink: 0,
        borderRadius: 'var(--radius-md)',
        border: highlight ? '1px solid var(--warn)' : '1px solid var(--hairline)',
        background: highlight ? 'rgba(245,158,11,0.06)' : 'var(--paper)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
          {labels.unscheduledOrders} ({orders.length})
        </h3>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            fontSize: 11,
            color: 'var(--soft)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--soft)'; }}
        >
          {labels.collapsePanel}
        </button>
      </div>

      {highlight && (
        <div style={{
          border: '2px dashed var(--warn)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 0',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, color: 'var(--warn)', fontWeight: 500, margin: 0 }}>{labels.dropToUnschedule}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <p style={{ fontSize: 11, color: 'var(--soft)', textAlign: 'center', padding: '16px 0', margin: 0 }}>{labels.noUnscheduled}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '60vh', overflowY: 'auto' }}>
          {orders.map((order) => (
            <DraggableJobCard key={order.id} order={order} timeTbdLabel={labels.timeTbd} />
          ))}
        </div>
      )}
    </div>
  );
}
