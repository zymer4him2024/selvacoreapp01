'use client';

import { Mail, Phone, MessageCircle, Calendar, CheckCircle } from 'lucide-react';
import type { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import {
  formatOptionalString,
  formatOptionalDate,
} from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  technician: TechnicianWithStats;
  statusClassName: string;
}

export function TechnicianProfileCard({ technician, statusClassName }: Props) {
  const { t } = useTranslation();
  const td = t.admin.technicianDetail;

  return (
    <div className="apple-card">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-32 h-32 bg-surface-elevated rounded-apple overflow-hidden flex-shrink-0">
          {technician.photoURL ? (
            <img src={technician.photoURL} alt={technician.displayName} className="w-full h-full object-cover object-center" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <Mail className="w-16 h-16 text-primary" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{formatOptionalString(technician.displayName)}</h2>
              <p className="text-text-secondary">{formatOptionalString(technician.email)}</p>
            </div>
            <div className={`px-4 py-2 rounded-apple text-sm font-semibold ${statusClassName}`}>
              {technician.technicianStatus?.toUpperCase() || 'N/A'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-text-tertiary" />
              <span>{formatOptionalString(technician.phone)}</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-text-tertiary" />
              <span>{formatOptionalString(technician.whatsapp || technician.phone)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-text-tertiary" />
              <span>{td.applied} {formatOptionalDate(technician.applicationDate, 'short')}</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-success" />
              <span>{td.approvedDate} {formatOptionalDate(technician.approvedDate, 'short')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
