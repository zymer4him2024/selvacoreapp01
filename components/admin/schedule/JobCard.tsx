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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-[#FF9500]/10 text-[#FF9500]',
  accepted: 'bg-[#0071E3]/10 text-[#0071E3]',
  in_progress: 'bg-[#FF9500]/10 text-[#FF9500]',
  completed: 'bg-[#34C759]/10 text-[#34C759]',
};

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-[#FF9500]',
  accepted: 'bg-[#0071E3]',
  in_progress: 'bg-[#FF9500]',
  completed: 'bg-[#34C759]',
};

const SLOT_LABELS: Record<string, string> = {
  '9-12': '9 - 12', '13-15': '13 - 15', '15-18': '15 - 18', '18-21': '18 - 21',
};

export default function JobCard({ order, timeTbdLabel, onReschedule, onUnassign, rescheduleLabel, unassignLabel }: JobCardProps) {
  const hasScheduled = !!order.scheduledAt;
  const customerName = order.customerInfo?.name || 'Customer';

  return (
    <div
      className={`p-2 rounded-[12px] text-xs leading-tight transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${
        hasScheduled
          ? 'bg-white border border-[#E5E5EA]'
          : 'bg-white border border-dashed border-[#FF950099]'
      }`}
    >
      {/* Time slot / TBD badge */}
      <div className="flex items-center justify-between mb-1">
        {hasScheduled ? (
          <span className="font-semibold text-[#1D1D1F]">
            {SLOT_LABELS[order.timeSlot] || order.timeSlot}
          </span>
        ) : (
          <span className="font-semibold text-[#FF9500]">{timeTbdLabel}</span>
        )}
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${STATUS_COLORS[order.status] || ''}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] || 'bg-gray-400'}`} />
          {order.status.replace('_', ' ')}
        </span>
      </div>

      {/* Customer name */}
      <p className="text-[#1D1D1F] font-medium truncate">{customerName}</p>

      {/* Order number */}
      <p className="text-[#86868B] truncate mt-0.5">#{order.orderNumber}</p>

      {/* Touch-friendly action buttons */}
      {(onReschedule || onUnassign) && (
        <div className="flex gap-1 mt-1.5">
          {onReschedule && (
            <button onClick={onReschedule} className="flex-1 text-[10px] font-medium text-[#0071E3] bg-[#0071E3]/10 rounded-md py-1 hover:bg-[#0071E3]/20 transition-colors">
              {rescheduleLabel}
            </button>
          )}
          {onUnassign && (
            <button onClick={onUnassign} className="flex-1 text-[10px] font-medium text-[#FF3B30] bg-[#FF3B30]/10 rounded-md py-1 hover:bg-[#FF3B30]/20 transition-colors">
              {unassignLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
