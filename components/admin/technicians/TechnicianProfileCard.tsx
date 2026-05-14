'use client';

import { Mail, Phone, MessageCircle, Calendar, CheckCircle } from 'lucide-react';
import type { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import { formatOptionalString } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

interface Props {
  technician: TechnicianWithStats;
  statusStyle: { color: string; bg: string };
}

export function TechnicianProfileCard({ technician, statusStyle }: Props) {
  const { t } = useTranslation();
  const { formatOptionalDate } = useLocaleFormatters();
  const td = t.admin.technicianDetail;

  return (
    <div className="sc-card-static">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{
          width: 128,
          height: 128,
          background: 'var(--off-paper)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {technician.photoURL ? (
            <img
              src={technician.photoURL}
              alt={technician.displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-tint)' }}>
              <Mail size={64} color="var(--brand)" />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 className="sc-h2" style={{ margin: 0 }}>{formatOptionalString(technician.displayName)}</h2>
              <p className="sc-helper" style={{ margin: 0 }}>{formatOptionalString(technician.email)}</p>
            </div>
            <div style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 600,
              color: statusStyle.color,
              background: statusStyle.bg,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {technician.technicianStatus || t.admin.technicians.naLabel}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink)' }}>
              <Phone size={18} color="var(--soft)" />
              <span>{formatOptionalString(technician.phone)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink)' }}>
              <MessageCircle size={18} color="var(--soft)" />
              <span>{formatOptionalString(technician.whatsapp || technician.phone)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink)' }}>
              <Calendar size={18} color="var(--soft)" />
              <span>{td.applied} {formatOptionalDate(technician.applicationDate, 'short')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink)' }}>
              <CheckCircle size={18} color="var(--brand)" />
              <span>{td.approvedDate} {formatOptionalDate(technician.approvedDate, 'short')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
