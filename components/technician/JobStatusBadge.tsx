'use client';

import { OrderStatus } from '@/types/order';
import { getOrderStatusLabel } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';

interface JobStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<OrderStatus, { bg: string; color: string }> = {
  pending: { bg: 'var(--brand-tint)', color: 'var(--brand)' },
  accepted: { bg: 'var(--brand-tint)', color: 'var(--brand)' },
  in_progress: { bg: 'var(--warn-tint)', color: 'var(--warn)' },
  completed: { bg: 'var(--brand-tint)', color: 'var(--brand)' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
  refunded: { bg: 'var(--off-paper)', color: 'var(--soft)' },
};

export default function JobStatusBadge({ status, size = 'md' }: JobStatusBadgeProps) {
  const { t } = useTranslation();
  const label = getOrderStatusLabel(status, 'technician', t);
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.refunded;
  const padding = size === 'sm' ? '2px 8px' : '8px 16px';
  const fontSize = size === 'sm' ? 12 : 14;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: 'var(--radius-sm)',
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
