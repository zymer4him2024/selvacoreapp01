'use client';

import { TrendingUp, CheckCircle, Award, DollarSign } from 'lucide-react';
import type { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import { formatOptionalNumber } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';

export function TechnicianStatsGrid({ technician }: { technician: TechnicianWithStats }) {
  const { t } = useTranslation();
  const { formatOptionalCurrency } = useLocaleFormatters();
  const td = t.admin.technicianDetail;

  const tile = (icon: React.ReactNode, bg: string, value: string, label: string) => (
    <div className="sc-card-static" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 48, height: 48, background: bg, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{value}</p>
        <p className="sc-helper" style={{ margin: 0 }}>{label}</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
      {tile(
        <TrendingUp size={24} color="var(--brand)" />,
        'var(--brand-tint)',
        formatOptionalNumber(technician.totalJobs),
        td.totalJobs
      )}
      {tile(
        <CheckCircle size={24} color="var(--brand)" />,
        'var(--brand-tint)',
        formatOptionalNumber(technician.completedJobs),
        td.completed
      )}
      {tile(
        <Award size={24} color="var(--warn)" />,
        'var(--warn-tint)',
        technician.averageRating ? `${technician.averageRating.toFixed(1)}★` : t.admin.technicians.naLabel,
        td.avgRating
      )}
      {tile(
        <DollarSign size={24} color="var(--brand)" />,
        'var(--brand-tint)',
        formatOptionalCurrency(technician.totalEarnings, DEFAULT_CURRENCY),
        td.totalEarnings
      )}
    </div>
  );
}
