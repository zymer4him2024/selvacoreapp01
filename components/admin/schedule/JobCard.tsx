'use client';

import { Order } from '@/types';

interface JobCardProps {
  order: Order;
  timeTbdLabel: string;
  onReschedule?: () => void;
  onUnassign?: () => void;
  rescheduleLabel?: string;
  unassignLabel?: string;
}

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pending: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  accepted: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  in_progress: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  completed: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
};

const SLOT_LABELS: Record<string, string> = {
  '9-12': '9 - 12', '13-15': '13 - 15', '15-18': '15 - 18', '18-21': '18 - 21',
};

export default function JobCard({ order, timeTbdLabel, onReschedule, onUnassign, rescheduleLabel, unassignLabel }: JobCardProps) {
  const hasScheduled = !!order.scheduledAt;
  const customerName = order.customerInfo?.name || 'Customer';
  const status = STATUS_STYLES[order.status] || { color: 'var(--soft)', bg: 'var(--off-paper)' };

  return (
    <div style={{
      padding: 8,
      borderRadius: 'var(--radius-md)',
      fontSize: 12,
      lineHeight: 1.3,
      background: 'var(--paper)',
      border: hasScheduled ? '1px solid var(--hairline)' : '1px dashed var(--warn)',
      transition: 'box-shadow 0.15s ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        {hasScheduled ? (
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {SLOT_LABELS[order.timeSlot] || order.timeSlot}
          </span>
        ) : (
          <span style={{ fontWeight: 600, color: 'var(--warn)' }}>{timeTbdLabel}</span>
        )}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 10,
          fontWeight: 500,
          color: status.color,
          background: status.bg,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-full)', background: status.color }} />
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <p style={{ color: 'var(--ink)', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customerName}</p>

      <p style={{ color: 'var(--soft)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>#{order.orderNumber}</p>

      {(onReschedule || onUnassign) && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {onReschedule && (
            <button
              onClick={onReschedule}
              style={{
                flex: 1,
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--brand)',
                background: 'var(--brand-tint)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 0',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {rescheduleLabel}
            </button>
          )}
          {onUnassign && (
            <button
              onClick={onUnassign}
              style={{
                flex: 1,
                fontSize: 10,
                fontWeight: 500,
                color: '#ef4444',
                background: 'rgba(239,68,68,0.1)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 0',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {unassignLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
