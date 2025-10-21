'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ArrowLeft, Save, Globe, Bell, Shield } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import toast from 'react-hot-toast';

export default function CustomerSettingsPage() {
  const router = useRouter();
  const { user, userData, updateUserData } = useAuth();
  const { t, changeLanguage } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    preferredLanguage: 'en',
    emailNotifications: true,
    smsNotifications: false,
    promotionalEmails: true,
  });

  useEffect(() => {
    if (userData) {
      setSettings({
        preferredLanguage: userData.preferredLanguage || 'en',
        emailNotifications: true,
        smsNotifications: false,
        promotionalEmails: true,
      });
    }
  }, [userData]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Update user document
      await updateDoc(doc(db, 'users', user.uid), {
        preferredLanguage: settings.preferredLanguage,
        updatedAt: new Date(),
      });

      // Update language
      if (settings.preferredLanguage !== userData?.preferredLanguage) {
        changeLanguage(settings.preferredLanguage as any);
      }

      // Update local state
      if (updateUserData) {
        await updateUserData({
          preferredLanguage: settings.preferredLanguage as any,
        });
      }

      toast.success(t.messages?.saved || 'Settings updated successfully');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">{t.customer.settings}</h1>
              <p className="text-sm text-text-secondary mt-1">
                Customize your experience
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-6 animate-fade-in">
          {/* Language Settings */}
          <div className="apple-card space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 rounded-apple">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{t.customer.language}</h3>
                <p className="text-sm text-text-secondary">
                  Choose your preferred language
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSettings({ ...settings, preferredLanguage: lang.code })}
                  className={`
                    p-4 border-2 rounded-apple transition-all text-left
                    ${settings.preferredLanguage === lang.code
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-surface-elevated'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{lang.flag}</span>
                    <div>
                      <p className="font-semibold">{lang.name}</p>
                      {settings.preferredLanguage === lang.code && (
                        <p className="text-xs text-primary">Current</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="apple-card space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-secondary/10 rounded-apple">
                <Bell className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{t.customer.notifications}</h3>
                <p className="text-sm text-text-secondary">
                  Manage how you receive updates
                </p>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-apple">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-text-secondary">
                  Receive order updates via email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-apple">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-text-secondary">
                  Receive text messages for urgent updates
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => setSettings({ ...settings, smsNotifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Promotional Emails */}
            <div className="flex items-center justify-between p-4 bg-surface-elevated rounded-apple">
              <div>
                <p className="font-medium">Promotional Emails</p>
                <p className="text-sm text-text-secondary">
                  Receive special offers and updates
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.promotionalEmails}
                  onChange={(e) => setSettings({ ...settings, promotionalEmails: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="apple-card space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-warning/10 rounded-apple">
                <Shield className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Privacy & Security</h3>
                <p className="text-sm text-text-secondary">
                  Your account security information
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-surface-elevated rounded-apple">
                <p className="font-medium mb-1">Authentication Method</p>
                <p className="text-sm text-text-secondary">Google Sign-In</p>
              </div>

              <div className="p-4 bg-surface-elevated rounded-apple">
                <p className="font-medium mb-1">Data Storage</p>
                <p className="text-sm text-text-secondary">
                  Your data is securely stored in Firebase Cloud
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-surface-elevated hover:bg-surface-secondary text-text-primary font-semibold rounded-apple transition-all"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {loading ? t.common.loading : t.common.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

