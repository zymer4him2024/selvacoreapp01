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

  const chipList = (items: string[], tone: 'primary' | 'warning') => {
    const chipClass = tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning';
    const emptyLabel = tone === 'primary' ? td.noServiceAreas : td.noCertifications;
    return (
      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-text-secondary">{emptyLabel}</p>
        ) : (
          items.map((it, i) => (
            <span key={i} className={`px-3 py-1 rounded-apple ${chipClass}`}>{it}</span>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />{td.serviceAreas}</h3>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="text" placeholder={td.addServiceArea} value={newArea} onChange={(e) => setNewArea(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addArea()} className="flex-1 px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none" />
              <button onClick={addArea} className="apple-button-primary">{t.common.add}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {edited.serviceAreas.map((a, i) => (
                <div key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-apple flex items-center gap-2">
                  <span>{a}</span>
                  <button onClick={() => removeArea(i)} className="hover:text-error"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        ) : chipList(technician.serviceAreas || [], 'primary')}
      </div>

      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-warning" />{td.certifications}</h3>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="text" placeholder={td.addCertification} value={newCert} onChange={(e) => setNewCert(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCert()} className="flex-1 px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none" />
              <button onClick={addCert} className="apple-button-primary">{t.common.add}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {edited.certifications.map((c, i) => (
                <div key={i} className="px-3 py-1 bg-warning/10 text-warning rounded-apple flex items-center gap-2">
                  <span>{c}</span>
                  <button onClick={() => removeCert(i)} className="hover:text-error"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        ) : chipList(technician.certifications || [], 'warning')}
      </div>

      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4">{td.professionalBio}</h3>
        {isEditing ? (
          <textarea value={edited.bio} onChange={(e) => setEdited((p) => ({ ...p, bio: e.target.value }))} placeholder={td.enterBio} rows={4} className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none" />
        ) : (<p className="text-text-secondary">{technician.bio || td.noBio}</p>)}
      </div>

      <div className="apple-card">
        <h3 className="text-xl font-semibold mb-4">{td.adminNotes}</h3>
        {isEditing ? (
          <textarea value={edited.adminNotes} onChange={(e) => setEdited((p) => ({ ...p, adminNotes: e.target.value }))} placeholder={td.enterNotes} rows={3} className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none" />
        ) : (<p className="text-text-secondary">{technician.adminNotes || td.noNotes}</p>)}
      </div>
    </>
  );
}
