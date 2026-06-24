'use client';

import { CheckCircle, XCircle, Pause, Play } from 'lucide-react';
import type { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  technician: TechnicianWithStats;
  disabled: boolean;
  onApprove: () => void;
  onDecline: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}

const actionBtnStyle = (color: string, disabled: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 24px',
  background: color,
  color: '#fff',
  fontWeight: 600,
  fontSize: 14,
  borderRadius: 'var(--radius-md)',
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  transition: 'all 0.15s ease',
});

export function TechnicianActionButtons(props: Props) {
  const { technician, disabled, onApprove, onDecline, onSuspend, onReactivate } = props;
  const { t } = useTranslation();
  const td = t.admin.technicianDetail;
  const status = technician.technicianStatus;

  // "Not yet decided": a pending application, or an account that selected the
  // technician role but never submitted (draft / no status). The admin can
  // approve or decline any of these.
  const canDecide =
    status !== 'approved' && status !== 'declined' && status !== 'suspended';

  const hoverable = (baseColor: string, hoverColor: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) e.currentTarget.style.background = hoverColor;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = baseColor;
    },
  });

  return (
    <div className="sc-card-static">
      <h3 className="sc-h2" style={{ marginTop: 0, marginBottom: 16 }}>{td.actions}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {canDecide && (
          <>
            <button
              onClick={onApprove}
              disabled={disabled}
              style={actionBtnStyle('var(--brand)', disabled)}
              {...hoverable('var(--brand)', 'var(--brand-hover)')}
            >
              <CheckCircle size={20} />{td.approveTechnician}
            </button>
            <button
              onClick={onDecline}
              disabled={disabled}
              style={actionBtnStyle('#ef4444', disabled)}
              {...hoverable('#ef4444', '#dc2626')}
            >
              <XCircle size={20} />{td.declineApplication}
            </button>
          </>
        )}
        {status === 'approved' && (
          <button
            onClick={onSuspend}
            disabled={disabled}
            style={actionBtnStyle('var(--warn)', disabled)}
            {...hoverable('var(--warn)', '#d97706')}
          >
            <Pause size={20} />{td.suspendTechnician}
          </button>
        )}
        {(status === 'suspended' || status === 'declined') && (
          <button
            onClick={onReactivate}
            disabled={disabled}
            style={actionBtnStyle('var(--brand)', disabled)}
            {...hoverable('var(--brand)', 'var(--brand-hover)')}
          >
            <Play size={20} />{td.reactivateTechnician}
          </button>
        )}
      </div>
    </div>
  );
}
