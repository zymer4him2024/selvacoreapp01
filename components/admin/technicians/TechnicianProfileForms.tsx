'use client';

import { useState } from 'react';
import { MapPin, Award, X } from 'lucide-react';
import type { TechnicianWithStats } from '@/lib/services/technicianAdminService';
import { useTranslation } from '@/hooks/useTranslation';

export interface EditedProfile {
  serviceAreas: string[];
  certifications: string[];
  bio: string;
  adminNotes: string;
}

interface Props {
  technician: TechnicianWithStats;
  isEditing: boolean;
  edited: EditedProfile;
  setEdited: React.Dispatch<React.SetStateAction<EditedProfile>>;
}

export function TechnicianProfileForms({ technician, isEditing, edited, setEdited }: Props) {
  const { t } = useTranslation();
  const td = t.admin.technicianDetail;
  const [newArea, setNewArea] = useState('');
  const [newCert, setNewCert] = useState('');

  const addArea = () => {
    if (!newArea.trim()) return;
    setEdited((p) => ({ ...p, serviceAreas: [...p.serviceAreas, newArea.trim()] }));
    setNewArea('');
  };
  const removeArea = (i: number) =>
    setEdited((p) => ({ ...p, serviceAreas: p.serviceAreas.filter((_, idx) => idx !== i) }));
  const addCert = () => {
    if (!newCert.trim()) return;
    setEdited((p) => ({ ...p, certifications: [...p.certifications, newCert.trim()] }));
    setNewCert('');
  };
  const removeCert = (i: number) =>
    setEdited((p) => ({ ...p, certifications: p.certifications.filter((_, idx) => idx !== i) }));

  const chipStyle = (tone: 'brand' | 'warn'): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: 12,
    fontWeight: 500,
    color: tone === 'brand' ? 'var(--brand)' : 'var(--warn)',
    background: tone === 'brand' ? 'var(--brand-tint)' : 'var(--warn-tint)',
  });

  const chipList = (items: string[], tone: 'brand' | 'warn') => {
    const emptyLabel = tone === 'brand' ? td.noServiceAreas : td.noCertifications;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.length === 0 ? (
          <p className="sc-helper" style={{ margin: 0 }}>{emptyLabel}</p>
        ) : (
          items.map((it, i) => (
            <span key={i} style={chipStyle(tone)}>{it}</span>
          ))
        )}
      </div>
    );
  };

  const editChipStyle = (tone: 'brand' | 'warn'): React.CSSProperties => ({
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: 12,
    fontWeight: 500,
    color: tone === 'brand' ? 'var(--brand)' : 'var(--warn)',
    background: tone === 'brand' ? 'var(--brand-tint)' : 'var(--warn-tint)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  });

  return (
    <>
      <div className="sc-card-static">
        <h3 className="sc-h2" style={{ marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={20} color="var(--brand)" />{td.serviceAreas}
        </h3>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder={td.addServiceArea}
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addArea()}
                className="sc-input"
                style={{ flex: 1 }}
              />
              <button onClick={addArea} className="sc-cta">{t.common.add}</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {edited.serviceAreas.map((a, i) => (
                <div key={i} style={editChipStyle('brand')}>
                  <span>{a}</span>
                  <button
                    onClick={() => removeArea(i)}
                    style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', display: 'flex' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'inherit'; }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : chipList(technician.serviceAreas || [], 'brand')}
      </div>

      <div className="sc-card-static">
        <h3 className="sc-h2" style={{ marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={20} color="var(--warn)" />{td.certifications}
        </h3>
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder={td.addCertification}
                value={newCert}
                onChange={(e) => setNewCert(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCert()}
                className="sc-input"
                style={{ flex: 1 }}
              />
              <button onClick={addCert} className="sc-cta">{t.common.add}</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {edited.certifications.map((c, i) => (
                <div key={i} style={editChipStyle('warn')}>
                  <span>{c}</span>
                  <button
                    onClick={() => removeCert(i)}
                    style={{ background: 'transparent', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', display: 'flex' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'inherit'; }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : chipList(technician.certifications || [], 'warn')}
      </div>

      <div className="sc-card-static">
        <h3 className="sc-h2" style={{ marginTop: 0, marginBottom: 16 }}>{td.professionalBio}</h3>
        {isEditing ? (
          <textarea
            value={edited.bio}
            onChange={(e) => setEdited((p) => ({ ...p, bio: e.target.value }))}
            placeholder={td.enterBio}
            rows={4}
            className="sc-textarea"
          />
        ) : (
          <p className="sc-helper" style={{ margin: 0 }}>{technician.bio || td.noBio}</p>
        )}
      </div>

      <div className="sc-card-static">
        <h3 className="sc-h2" style={{ marginTop: 0, marginBottom: 16 }}>{td.adminNotes}</h3>
        {isEditing ? (
          <textarea
            value={edited.adminNotes}
            onChange={(e) => setEdited((p) => ({ ...p, adminNotes: e.target.value }))}
            placeholder={td.enterNotes}
            rows={3}
            className="sc-textarea"
          />
        ) : (
          <p className="sc-helper" style={{ margin: 0 }}>{technician.adminNotes || td.noNotes}</p>
        )}
      </div>
    </>
  );
}
