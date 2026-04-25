'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Save, X } from 'lucide-react';
import {
  getTechnicianById,
  approveTechnician,
  declineTechnician,
  suspendTechnician,
  reactivateTechnician,
  updateTechnicianProfile,
  TechnicianWithStats,
} from '@/lib/services/technicianAdminService';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import { TechnicianOverviewTab } from '@/components/admin/technicians/TechnicianOverviewTab';
import { TechnicianReviewsTab } from '@/components/admin/technicians/TechnicianReviewsTab';
import type { EditedProfile } from '@/components/admin/technicians/TechnicianProfileForms';

type DetailTab = 'overview' | 'reviews';

function statusClassFor(status: TechnicianWithStats['technicianStatus']): string {
  switch (status) {
    case 'approved': return 'bg-success/10 text-success';
    case 'pending': return 'bg-warning/10 text-warning';
    case 'declined': return 'bg-error/10 text-error';
    case 'suspended': return 'bg-text-tertiary/10 text-text-tertiary';
    default: return 'bg-surface-elevated text-text-secondary';
  }
}

export default function TechnicianDetailPage() {
  const { t } = useTranslation();
  const td = t.admin.technicianDetail;
  const router = useRouter();
  const params = useParams();
  const technicianId = params?.id as string;

  const [technician, setTechnician] = useState<TechnicianWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<EditedProfile>({
    serviceAreas: [], certifications: [], bio: '', adminNotes: '',
  });
  const [tab, setTab] = useState<DetailTab>('overview');

  const loadTechnician = async () => {
    try {
      setLoading(true);
      const data = await getTechnicianById(technicianId);
      setTechnician(data);
      if (data) {
        setEdited({
          serviceAreas: data.serviceAreas || [],
          certifications: data.certifications || [],
          bio: data.bio || '',
          adminNotes: data.adminNotes || '',
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : td.loadError);
      router.push('/admin/technicians');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (technicianId) loadTechnician();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [technicianId]);

  const runAction = async (action: () => Promise<void>, okMsg: string, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActionLoading(true);
    try {
      await action();
      toast.success(okMsg);
      loadTechnician();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : td.actionFailed);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = () =>
    runAction(() => approveTechnician(technicianId, edited.adminNotes), td.approvedSuccess, td.confirmApprove);
  const handleDecline = async () => {
    const reason = prompt(td.reasonDecline);
    if (!reason) return;
    runAction(() => declineTechnician(technicianId, reason), td.declinedSuccess);
  };
  const handleSuspend = async () => {
    const reason = prompt(td.reasonSuspend);
    if (!reason) return;
    runAction(() => suspendTechnician(technicianId, reason), td.suspendedSuccess);
  };
  const handleReactivate = () =>
    runAction(() => reactivateTechnician(technicianId), td.reactivatedSuccess, td.confirmReactivate);

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      await updateTechnicianProfile(technicianId, { ...edited });
      toast.success(td.profileUpdated);
      setIsEditing(false);
      loadTechnician();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : td.updateFailed);
    } finally {
      setActionLoading(false);
    }
  };

  const cancelEdit = () => {
    if (!technician) return;
    setIsEditing(false);
    setEdited({
      serviceAreas: technician.serviceAreas || [],
      certifications: technician.certifications || [],
      bio: technician.bio || '',
      adminNotes: technician.adminNotes || '',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">{td.loading}</p>
        </div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">{td.notFound}</h2>
        <button onClick={() => router.push('/admin/technicians')} className="apple-button-primary">
          {td.backToTechnicians}
        </button>
      </div>
    );
  }

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: td.tabOverview },
    { key: 'reviews', label: td.tabReviews },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/admin/technicians')} className="p-2 hover:bg-surface-elevated rounded-apple transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{td.title}</h1>
          <p className="text-text-secondary">{td.subtitle}</p>
        </div>
        {tab === 'overview' && (
          <>
            <button onClick={isEditing ? cancelEdit : () => setIsEditing(true)} className="apple-button-secondary flex items-center gap-2">
              {isEditing ? <X className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
              {isEditing ? t.common.cancel : t.common.edit}
            </button>
            {isEditing && (
              <button onClick={handleSaveEdit} disabled={actionLoading} className="apple-button-primary flex items-center gap-2">
                <Save className="w-5 h-5" />{td.saveChanges}
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex gap-1 bg-surface-elevated rounded-apple p-1 w-fit">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 rounded-apple text-sm font-medium transition-colors ${
              tab === tb.key ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <TechnicianOverviewTab
          technician={technician}
          statusClassName={statusClassFor(technician.technicianStatus)}
          isEditing={isEditing}
          edited={edited}
          setEdited={setEdited}
          actionLoading={actionLoading}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onSuspend={handleSuspend}
          onReactivate={handleReactivate}
        />
      ) : (
        <TechnicianReviewsTab technicianId={technicianId} />
      )}
    </div>
  );
}
