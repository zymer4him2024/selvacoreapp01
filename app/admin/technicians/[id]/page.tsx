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
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { TechnicianOverviewTab } from '@/components/admin/technicians/TechnicianOverviewTab';
import { TechnicianReviewsTab } from '@/components/admin/technicians/TechnicianReviewsTab';
import type { EditedProfile } from '@/components/admin/technicians/TechnicianProfileForms';

type DetailTab = 'overview' | 'reviews';

function statusStyleFor(status: TechnicianWithStats['technicianStatus']): { color: string; bg: string } {
  switch (status) {
    case 'approved': return { color: 'var(--brand)', bg: 'var(--brand-tint)' };
    case 'pending': return { color: 'var(--warn)', bg: 'var(--warn-tint)' };
    case 'declined': return { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
    case 'suspended': return { color: 'var(--soft)', bg: 'var(--off-paper)' };
    default: return { color: 'var(--soft)', bg: 'var(--off-paper)' };
  }
}

const subTabStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  fontWeight: 500,
  border: 'none',
  background: active ? 'var(--paper)' : 'transparent',
  color: active ? 'var(--ink)' : 'var(--soft)',
  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

export default function TechnicianDetailPage() {
  const { t } = useTranslation();
  const { userData } = useAuth();
  const canModify = userData?.role !== 'sub-admin';
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
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div className="sc-spinner" />
          <p className="sc-helper">{td.loading}</p>
        </div>
      </div>
    );
  }

  if (!technician) {
    return (
      <div className="sc" style={{ textAlign: 'center', padding: 48 }}>
        <h2 className="sc-h2" style={{ marginBottom: 16 }}>{td.notFound}</h2>
        <button onClick={() => router.push('/admin/technicians')} className="sc-cta">
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
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          onClick={() => router.push('/admin/technicians')}
          style={{
            padding: 8,
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ArrowLeft size={24} />
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="sc-h1" style={{ margin: 0 }}>{td.title}</h1>
          <p className="sc-helper" style={{ margin: 0 }}>{td.subtitle}</p>
        </div>
        {tab === 'overview' && canModify && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={isEditing ? cancelEdit : () => setIsEditing(true)}
              className="sc-cta-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isEditing ? <X size={18} /> : <Edit size={18} />}
              {isEditing ? t.common.cancel : t.common.edit}
            </button>
            {isEditing && (
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="sc-cta"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Save size={18} />{td.saveChanges}
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: 4,
        background: 'var(--off-paper)',
        borderRadius: 'var(--radius-md)',
        padding: 4,
        width: 'fit-content',
      }}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={subTabStyle(tab === tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <TechnicianOverviewTab
          technician={technician}
          statusStyle={statusStyleFor(technician.technicianStatus)}
          isEditing={isEditing}
          edited={edited}
          setEdited={setEdited}
          actionLoading={actionLoading}
          canModify={canModify}
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
