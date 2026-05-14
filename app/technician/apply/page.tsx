'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import {
  User, Phone, MessageCircle, MapPin, Award, FileText,
  CheckCircle, AlertCircle, Plus, X
} from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

const ERROR_COLOR = '#ef4444';

export default function TechnicianApplicationPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const a = t.technician.apply;
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    displayName: userData?.displayName || '',
    phone: userData?.phone || '',
    whatsapp: userData?.phone || '',
    bio: '',
    serviceAreas: [] as string[],
    certifications: [] as string[],
  });

  const [newArea, setNewArea] = useState('');
  const [newCert, setNewCert] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userData) return;
    setFormData(prev => ({
      ...prev,
      displayName: prev.displayName || userData.displayName || '',
      phone: prev.phone || userData.phone || '',
      whatsapp: prev.whatsapp || userData.phone || '',
    }));
  }, [userData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.displayName.trim()) newErrors.displayName = a.errorFullNameRequired;
    if (!formData.phone.trim()) newErrors.phone = a.errorPhoneRequired;
    if (!formData.whatsapp.trim()) newErrors.whatsapp = a.errorWhatsappRequired;
    if (!formData.bio.trim() || formData.bio.length < 50) newErrors.bio = a.errorBioMinLength;
    if (formData.serviceAreas.length === 0) newErrors.serviceAreas = a.errorServiceAreasRequired;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addServiceArea = () => {
    if (newArea.trim() && !formData.serviceAreas.includes(newArea.trim())) {
      setFormData(prev => ({ ...prev, serviceAreas: [...prev.serviceAreas, newArea.trim()] }));
      setNewArea('');
      setErrors(prev => ({ ...prev, serviceAreas: '' }));
    }
  };

  const removeServiceArea = (index: number) => {
    setFormData(prev => ({ ...prev, serviceAreas: prev.serviceAreas.filter((_, i) => i !== index) }));
  };

  const addCertification = () => {
    if (newCert.trim() && !formData.certifications.includes(newCert.trim())) {
      setFormData(prev => ({ ...prev, certifications: [...prev.certifications, newCert.trim()] }));
      setNewCert('');
    }
  };

  const removeCertification = (index: number) => {
    setFormData(prev => ({ ...prev, certifications: prev.certifications.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(a.toastFillRequired);
      return;
    }

    if (!user) {
      toast.error(a.toastMustLogin);
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        bio: formData.bio,
        serviceAreas: formData.serviceAreas,
        certifications: formData.certifications,
        role: 'technician',
        technicianStatus: 'pending',
        applicationDate: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success(a.toastSubmitted);
      toast(a.toastUnderReview, { icon: '⏳', duration: 5000 });

      setTimeout(() => {
        router.push('/technician');
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : a.toastSubmitError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const errorStyle = (hasError: boolean): React.CSSProperties =>
    hasError ? { borderColor: ERROR_COLOR } : {};

  const renderErrorText = (msg: string) => (
    <p style={{ color: ERROR_COLOR, fontSize: 13, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
      <AlertCircle className="w-4 h-4" />
      {msg}
    </p>
  );

  const InfoTile = ({
    icon: Icon,
    iconColor,
    iconBg,
    title,
    desc,
  }: {
    icon: typeof CheckCircle;
    iconColor: string;
    iconBg: string;
    title: string;
    desc: string;
  }) => (
    <div className="sc-card-static" style={{ textAlign: 'center' }}>
      <div
        style={{
          width: 48,
          height: 48,
          background: iconBg,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 8px',
        }}
      >
        <Icon className="w-6 h-6" style={{ color: iconColor }} />
      </div>
      <h3 style={{ fontWeight: 600, margin: 0 }}>{title}</h3>
      <p className="sc-helper" style={{ marginTop: 4 }}>{desc}</p>
    </div>
  );

  return (
    <div className="sc" style={{ minHeight: '100vh' }}>
      <main className="sc-main" style={{ maxWidth: 768, padding: '48px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 80,
              height: 80,
              background: 'var(--brand-tint)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <User className="w-10 h-10" style={{ color: 'var(--brand)' }} />
          </div>
          <h1 className="sc-h1" style={{ marginBottom: 8 }}>{a.pageTitle}</h1>
          <p className="sc-lede">{a.pageSubtitle}</p>
        </div>

        <div
          className="sc-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}
        >
          <InfoTile
            icon={CheckCircle}
            iconColor="var(--brand)"
            iconBg="var(--brand-tint)"
            title={a.benefitFlexibleTitle}
            desc={a.benefitFlexibleDesc}
          />
          <InfoTile
            icon={Award}
            iconColor="var(--brand)"
            iconBg="var(--brand-tint)"
            title={a.benefitPayTitle}
            desc={a.benefitPayDesc}
          />
          <InfoTile
            icon={MapPin}
            iconColor="var(--warn)"
            iconBg="var(--warn-tint)"
            title={a.benefitLocalTitle}
            desc={a.benefitLocalDesc}
          />
        </div>

        <form onSubmit={handleSubmit} className="sc-card-static">
          <h2 className="sc-h2" style={{ marginBottom: 24 }}>{a.formTitle}</h2>

          <div className="sc-stack-lg">
            <div>
              <label className="sc-label">
                {a.fullNameLabel} <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User className="w-5 h-5" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder={a.fullNamePlaceholder}
                  className="sc-input"
                  style={{ paddingLeft: 44, ...errorStyle(!!errors.displayName) }}
                />
              </div>
              {errors.displayName && renderErrorText(errors.displayName)}
            </div>

            <div>
              <label className="sc-label">
                {a.phoneLabel} <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone className="w-5 h-5" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={a.phonePlaceholder}
                  className="sc-input"
                  style={{ paddingLeft: 44, ...errorStyle(!!errors.phone) }}
                />
              </div>
              {errors.phone && renderErrorText(errors.phone)}
            </div>

            <div>
              <label className="sc-label">
                {a.whatsappLabel} <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <MessageCircle className="w-5 h-5" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder={a.whatsappPlaceholder}
                  className="sc-input"
                  style={{ paddingLeft: 44, ...errorStyle(!!errors.whatsapp) }}
                />
              </div>
              {errors.whatsapp ? renderErrorText(errors.whatsapp) : (
                <p className="sc-helper">{a.whatsappHint}</p>
              )}
            </div>

            <div>
              <label className="sc-label">
                {a.serviceAreasLabel} <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <div className="sc-row" style={{ gap: 8, marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <MapPin className="w-5 h-5" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addServiceArea(); } }}
                    placeholder={a.serviceAreasPlaceholder}
                    className="sc-input"
                    style={{ paddingLeft: 44, ...errorStyle(!!errors.serviceAreas) }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addServiceArea}
                  className="sc-cta"
                  style={{ padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Plus className="w-5 h-5" />
                  {a.addButton}
                </button>
              </div>
              <div className="sc-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {formData.serviceAreas.map((area, index) => (
                  <div
                    key={index}
                    className="sc-row"
                    style={{
                      padding: '8px 12px',
                      background: 'var(--brand-tint)',
                      color: 'var(--brand)',
                      borderRadius: 'var(--radius-sm)',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>{area}</span>
                    <button
                      type="button"
                      onClick={() => removeServiceArea(index)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brand)', padding: 0, display: 'inline-flex' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.serviceAreas && renderErrorText(errors.serviceAreas)}
            </div>

            <div>
              <label className="sc-label">
                {a.certificationsLabel} <span style={{ color: 'var(--soft)' }}>{a.optional}</span>
              </label>
              <div className="sc-row" style={{ gap: 8, marginBottom: 12 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Award className="w-5 h-5" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCertification(); } }}
                    placeholder={a.certificationsPlaceholder}
                    className="sc-input"
                    style={{ paddingLeft: 44 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addCertification}
                  className="sc-cta"
                  style={{ padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Plus className="w-5 h-5" />
                  {a.addButton}
                </button>
              </div>
              <div className="sc-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {formData.certifications.map((cert, index) => (
                  <div
                    key={index}
                    className="sc-row"
                    style={{
                      padding: '8px 12px',
                      background: 'var(--warn-tint)',
                      color: 'var(--warn)',
                      borderRadius: 'var(--radius-sm)',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Award className="w-4 h-4" />
                    <span>{cert}</span>
                    <button
                      type="button"
                      onClick={() => removeCertification(index)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--warn)', padding: 0, display: 'inline-flex' }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="sc-label">
                {a.bioLabel} <span style={{ color: ERROR_COLOR }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <FileText className="w-5 h-5" style={{ position: 'absolute', left: 14, top: 14, color: 'var(--soft)', pointerEvents: 'none' }} />
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={a.bioPlaceholder}
                  rows={5}
                  className="sc-textarea"
                  style={{ paddingLeft: 44, ...errorStyle(!!errors.bio) }}
                />
              </div>
              {errors.bio ? renderErrorText(errors.bio) : (
                <p className="sc-helper">{a.bioCounter.replace('{count}', String(formData.bio.length))}</p>
              )}
            </div>

            <div style={{ paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
              <button
                type="submit"
                disabled={loading}
                className="sc-cta"
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <div className="sc-spinner" style={{ width: 20, height: 20 }} />
                    {a.submittingButton}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {a.submitButton}
                  </>
                )}
              </button>
              <p className="sc-helper" style={{ textAlign: 'center', marginTop: 12 }}>
                {a.termsAgreement}
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
