'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Save, QrCode, ChevronRight, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import LogoUpload from '@/components/common/LogoUpload';
import PermissionsTable from '@/components/admin/PermissionsTable';
import FeatureVisibilityEditor from '@/components/admin/FeatureVisibilityEditor';

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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{st.title}</h1>
          <p className="text-text-secondary">{isSubAdmin ? st.subtitleSubAdmin : st.subtitle}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
        >
          <Save className="w-5 h-5" />
          {saving ? t.common.saving : st.saveChanges}
        </button>
      </div>

      {/* Logo Upload */}
      <div className="apple-card">
        <div className="flex items-center gap-3 mb-6">
          <ImageIcon className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">{st.businessLogoHeading}</h2>
        </div>
        <LogoUpload
          currentLogoURL={logoURL}
          onLogoUploaded={(url) => setLogoURL(url)}
          onLogoRemoved={() => setLogoURL('')}
          label={st.companyLogoLabel}
          hint={st.companyLogoHint}
        />
      </div>

      {/* QR Code Management (admin only) */}
      {!isSubAdmin && (
      <Link
        href="/admin/qr-codes"
        className="apple-card block hover:shadow-apple-lg hover:border-primary/40 transition-all group"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-apple bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">{st.qrManagementHeading}</h2>
              <p className="text-sm text-text-secondary mt-1">
                {st.qrManagementSubtitle}
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-text-tertiary group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </Link>
      )}

      {/* Access Permissions */}
      <PermissionsTable />

      {/* Feature Visibility Editor (admin only) */}
      <FeatureVisibilityEditor />
    </div>
  );
}

