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

export function TechnicianActionButtons(props: Props) {
  const { technician, disabled, onApprove, onDecline, onSuspend, onReactivate } = props;
  const { t } = useTranslation();
  const td = t.admin.technicianDetail;
  const status = technician.technicianStatus;

  return (
    <div className="apple-card">
      <h3 className="text-xl font-semibold mb-4">{td.actions}</h3>
      <div className="flex flex-wrap gap-3">
        {status === 'pending' && (
          <>
            <button onClick={onApprove} disabled={disabled} className="flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all disabled:opacity-50">
              <CheckCircle className="w-5 h-5" />{td.approveTechnician}
            </button>
            <button onClick={onDecline} disabled={disabled} className="flex items-center gap-2 px-6 py-3 bg-error hover:bg-error/90 text-white font-semibold rounded-apple transition-all disabled:opacity-50">
              <XCircle className="w-5 h-5" />{td.declineApplication}
            </button>
          </>
        )}
        {status === 'approved' && (
          <button onClick={onSuspend} disabled={disabled} className="flex items-center gap-2 px-6 py-3 bg-warning hover:bg-warning/90 text-white font-semibold rounded-apple transition-all disabled:opacity-50">
            <Pause className="w-5 h-5" />{td.suspendTechnician}
          </button>
        )}
        {(status === 'suspended' || status === 'declined') && (
          <button onClick={onReactivate} disabled={disabled} className="flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all disabled:opacity-50">
            <Play className="w-5 h-5" />{td.reactivateTechnician}
          </button>
        )}
      </div>
    </div>
  );
}
