'use client';

import { useState, useEffect } from 'react';
import { Save, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LogoUpload from '@/components/common/LogoUpload';
import toast from 'react-hot-toast';

export default function SubAdminSettingsPage() {
  const { userData, updateUserData } = useAuth();
  const [saving, setSaving] = useState(false);
  const [logoURL, setLogoURL] = useState('');

  useEffect(() => {
    if (userData?.logoURL) setLogoURL(userData.logoURL);
  }, [userData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateUserData({ logoURL: logoURL || undefined });
      toast.success('Settings saved successfully!');
    } catch (error: unknown) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Settings</h1>
          <p className="text-text-secondary">Manage your sub-contractor settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold rounded-apple transition-all"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Logo Upload */}
      <div className="apple-card">
        <div className="flex items-center gap-3 mb-6">
          <ImageIcon className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">Company Logo</h2>
        </div>
        <LogoUpload
          currentLogoURL={logoURL}
          onLogoUploaded={(url) => setLogoURL(url)}
          onLogoRemoved={() => setLogoURL('')}
          label="Sub-Contractor Logo"
          hint="This logo will be displayed on your dashboard. Recommended size: 256x256px."
        />
      </div>
    </div>
  );
}
