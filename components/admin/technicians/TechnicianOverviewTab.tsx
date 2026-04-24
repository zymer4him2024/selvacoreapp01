'use client';

import type { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import { TechnicianProfileCard } from './TechnicianProfileCard';
import { TechnicianStatsGrid } from './TechnicianStatsGrid';
import { TechnicianProfileForms, type EditedProfile } from './TechnicianProfileForms';
import { TechnicianActionButtons } from './TechnicianActionButtons';

interface Props {
  technician: TechnicianWithStats;
  statusClassName: string;
  isEditing: boolean;
  edited: EditedProfile;
  setEdited: React.Dispatch<React.SetStateAction<EditedProfile>>;
  actionLoading: boolean;
  onApprove: () => void;
  onDecline: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}

export function TechnicianOverviewTab(props: Props) {
  const { technician, statusClassName, isEditing, edited, setEdited, actionLoading } = props;
  return (
    <div className="space-y-6">
      <TechnicianProfileCard technician={technician} statusClassName={statusClassName} />
      <TechnicianStatsGrid technician={technician} />
      <TechnicianProfileForms technician={technician} isEditing={isEditing} edited={edited} setEdited={setEdited} />
      <TechnicianActionButtons
        technician={technician}
        disabled={actionLoading}
        onApprove={props.onApprove}
        onDecline={props.onDecline}
        onSuspend={props.onSuspend}
        onReactivate={props.onReactivate}
      />
    </div>
  );
}
