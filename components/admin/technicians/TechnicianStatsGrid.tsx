'use client';

import { TrendingUp, CheckCircle, Award, DollarSign } from 'lucide-react';
import type { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import {
  formatOptionalCurrency,
  formatOptionalNumber,
} from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';

export function TechnicianStatsGrid({ technician }: { technician: TechnicianWithStats }) {
  const { t } = useTranslation();
  const td = t.admin.technicianDetail;

  const tile = (icon: React.ReactNode, bg: string, value: string, label: string) => (
    <div className="apple-card">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 ${bg} rounded-apple flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-text-secondary">{label}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {tile(
        <TrendingUp className="w-6 h-6 text-primary" />,
        'bg-primary/10',
        formatOptionalNumber(technician.totalJobs),
        td.totalJobs
      )}
      {tile(
        <CheckCircle className="w-6 h-6 text-success" />,
        'bg-success/10',
        formatOptionalNumber(technician.completedJobs),
        td.completed
      )}
      {tile(
        <Award className="w-6 h-6 text-warning" />,
        'bg-warning/10',
        technician.averageRating ? `${technician.averageRating.toFixed(1)}★` : 'N/A',
        td.avgRating
      )}
      {tile(
        <DollarSign className="w-6 h-6 text-success" />,
        'bg-success/10',
        formatOptionalCurrency(technician.totalEarnings, 'BRL'),
        td.totalEarnings
      )}
    </div>
  );
}
