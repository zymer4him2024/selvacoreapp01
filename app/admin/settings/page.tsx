'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Save, QrCode, ChevronRight, ImageIcon, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import LogoUpload from '@/components/common/LogoUpload';
import PermissionsTable from '@/components/admin/PermissionsTable';
import FeatureVisibilityEditor from '@/components/admin/FeatureVisibilityEditor';
import ThemePreferenceRadio from '@/components/ui/ThemePreferenceRadio';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { userData, updateUserData } = useAuth();
  const st = t.admin.settings;
  const isSubAdmin = userData?.role === 'sub-admin';
  const [saving, setSaving] = useState(false);
  const [logoURL, setLogoURL] = useState('');

  useEffect(() => {
    if (userData?.logoURL) setLogoURL(userData.logoURL);
  }, [userData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUserData({ logoURL: logoURL || undefined });
      toast.success(st.saveSuccess);
    } catch {
      toast.error(st.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{st.title}</h1>
          <p className="sc-helper" style={{ margin: 0 }}>{isSubAdmin ? st.subtitleSubAdmin : st.subtitle}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="sc-cta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Save className="w-5 h-5" />
          {saving ? t.common.saving : st.saveChanges}
        </button>
      </div>

      <div className="sc-card-static">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <ImageIcon className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>{st.businessLogoHeading}</h2>
        </div>
        <LogoUpload
          currentLogoURL={logoURL}
          onLogoUploaded={(url) => setLogoURL(url)}
          onLogoRemoved={() => setLogoURL('')}
          label={st.companyLogoLabel}
          hint={st.companyLogoHint}
        />
      </div>

      <div className="sc-card-static">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Monitor className="w-6 h-6" style={{ color: 'var(--brand)' }} />
          <div>
            <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>{t.common.displayAndAppearance}</h2>
            <p className="sc-helper" style={{ margin: '4px 0 0' }}>{t.common.displayAndAppearanceDesc}</p>
          </div>
        </div>
        <ThemePreferenceRadio />
      </div>

      {!isSubAdmin && (
        <Link
          href="/admin/qr-codes"
          className="sc-card"
          style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-tint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <QrCode className="w-6 h-6" style={{ color: 'var(--brand)' }} />
              </div>
              <div>
                <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>{st.qrManagementHeading}</h2>
                <p className="sc-helper" style={{ margin: '4px 0 0' }}>{st.qrManagementSubtitle}</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6" style={{ color: 'var(--soft)' }} />
          </div>
        </Link>
      )}

      <PermissionsTable />

      <FeatureVisibilityEditor />
    </div>
  );
}
