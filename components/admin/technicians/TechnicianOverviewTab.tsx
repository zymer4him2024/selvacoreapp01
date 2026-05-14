'use client';

import type { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import { TechnicianProfileCard } from './TechnicianProfileCard';
import { TechnicianStatsGrid } from './TechnicianStatsGrid';
import { TechnicianProfileForms, type EditedProfile } from './TechnicianProfileForms';
import { TechnicianActionButtons } from './TechnicianActionButtons';

interface Props {
  technician: TechnicianWithStats;
  statusStyle: { color: string; bg: string };
  isEditing: boolean;
  edited: EditedProfile;
  setEdited: React.Dispatch<React.SetStateAction<EditedProfile>>;
  actionLoading: boolean;
  canModify?: boolean;
  onApprove: () => void;
  onDecline: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}

export function TechnicianOverviewTab(props: Props) {
  const { technician, statusStyle, isEditing, edited, setEdited, actionLoading, canModify = true } = props;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TechnicianProfileCard technician={technician} statusStyle={statusStyle} />
      <TechnicianStatsGrid technician={technician} />
      <TechnicianProfileForms technician={technician} isEditing={isEditing} edited={edited} setEdited={setEdited} />
      {canModify && (
        <TechnicianActionButtons
          technician={technician}
          disabled={actionLoading}
          onApprove={props.onApprove}
          onDecline={props.onDecline}
          onSuspend={props.onSuspend}
          onReactivate={props.onReactivate}
        />
      )}
    </div>
  );
}
