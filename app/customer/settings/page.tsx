'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ArrowLeft, Save, Globe, Bell, Shield, Monitor } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import type { Language } from '@/types';
import toast from 'react-hot-toast';
import ThemePreferenceRadio from '@/components/ui/ThemePreferenceRadio';

export default function CustomerSettingsPage() {
  const router = useRouter();
  const { user, userData, updateUserData } = useAuth();
  const { t, changeLanguage } = useTranslation();
  const ss = t.customer.settingsScreen;
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
        changeLanguage(settings.preferredLanguage as Language);
      }

      // Update local state
      if (updateUserData) {
        await updateUserData({
          preferredLanguage: settings.preferredLanguage as Language,
        });
      }

      toast.success(t.messages?.saved || 'Settings updated successfully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ss.updateError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    width: 44,
    height: 24,
    cursor: 'pointer',
  };

  const renderToggle = (checked: boolean, onChange: (v: boolean) => void, ariaLabel: string) => (
    <label style={toggleStyle}>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: checked ? 'var(--brand)' : 'var(--hairline)',
          borderRadius: 9999,
          transition: 'background 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          background: '#fff',
          borderRadius: 9999,
          transition: 'left 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </label>
  );

  return (
    <div className="sc">
      <main className="sc-main" style={{ maxWidth: 880 }}>
        <div className="sc-row" style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => router.back()}
            className="sc-cta-ghost"
            style={{ padding: 8, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="sc-eyebrow">{t.customer.settings}</div>
            <h1 className="sc-h1">{t.customer.settings}</h1>
            <p className="sc-lede">{ss.customize}</p>
          </div>
        </div>

        <div className="sc-stack-lg">
          <div className="sc-card-static">
            <div className="sc-row" style={{ marginBottom: 16 }}>
              <Globe className="w-6 h-6" style={{ color: 'var(--brand)' }} />
              <div>
                <h3 className="sc-h2" style={{ margin: 0 }}>{t.customer.language}</h3>
                <p className="sc-helper" style={{ margin: 0 }}>{ss.chooseLanguage}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const active = settings.preferredLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSettings({ ...settings, preferredLanguage: lang.code })}
                    style={{
                      padding: 16,
                      borderRadius: 'var(--radius-sm)',
                      border: active ? '2px solid var(--brand)' : '1px solid var(--hairline)',
                      background: active ? 'var(--brand-tint)' : 'var(--paper)',
                      color: 'var(--ink)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div className="sc-row" style={{ gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{lang.flag}</span>
                      <div>
                        <p style={{ fontWeight: 600, margin: 0 }}>{lang.name}</p>
                        {active && (
                          <p style={{ fontSize: 12, color: 'var(--brand)', margin: '2px 0 0' }}>{ss.current}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sc-card-static">
            <div className="sc-row" style={{ marginBottom: 16 }}>
              <Bell className="w-6 h-6" style={{ color: 'var(--brand)' }} />
              <div>
                <h3 className="sc-h2" style={{ margin: 0 }}>{t.customer.notifications}</h3>
                <p className="sc-helper" style={{ margin: 0 }}>{ss.manageUpdates}</p>
              </div>
            </div>

            <div className="sc-stack">
              <div className="sc-row-between" style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{ss.emailNotifications}</p>
                  <p className="sc-helper" style={{ margin: '4px 0 0' }}>{ss.emailNotificationsDesc}</p>
                </div>
                {renderToggle(settings.emailNotifications, (v) => setSettings({ ...settings, emailNotifications: v }), ss.emailNotifications)}
              </div>

              <div className="sc-row-between" style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{ss.smsNotifications}</p>
                  <p className="sc-helper" style={{ margin: '4px 0 0' }}>{ss.smsNotificationsDesc}</p>
                </div>
                {renderToggle(settings.smsNotifications, (v) => setSettings({ ...settings, smsNotifications: v }), ss.smsNotifications)}
              </div>

              <div className="sc-row-between" style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <p style={{ fontWeight: 600, margin: 0 }}>{ss.promotionalEmails}</p>
                  <p className="sc-helper" style={{ margin: '4px 0 0' }}>{ss.promotionalEmailsDesc}</p>
                </div>
                {renderToggle(settings.promotionalEmails, (v) => setSettings({ ...settings, promotionalEmails: v }), ss.promotionalEmails)}
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <div className="sc-row" style={{ marginBottom: 16 }}>
              <Shield className="w-6 h-6" style={{ color: 'var(--warn)' }} />
              <div>
                <h3 className="sc-h2" style={{ margin: 0 }}>{ss.privacySecurity}</h3>
                <p className="sc-helper" style={{ margin: 0 }}>{ss.privacySecurityDesc}</p>
              </div>
            </div>

            <div className="sc-stack">
              <div style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{ss.authenticationMethod}</p>
                <p className="sc-helper" style={{ margin: 0 }}>{ss.googleSignIn}</p>
              </div>

              <div style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{ss.dataStorage}</p>
                <p className="sc-helper" style={{ margin: 0 }}>{ss.dataStorageDesc}</p>
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <div className="sc-row" style={{ marginBottom: 16 }}>
              <Monitor className="w-6 h-6" style={{ color: 'var(--brand)' }} />
              <div>
                <h3 className="sc-h2" style={{ margin: 0 }}>{t.common.displayAndAppearance}</h3>
                <p className="sc-helper" style={{ margin: 0 }}>{t.common.displayAndAppearanceDesc}</p>
              </div>
            </div>
            <ThemePreferenceRadio />
          </div>

          <div className="sc-row" style={{ gap: 12 }}>
            <button
              type="button"
              onClick={() => router.back()}
              className="sc-cta-ghost"
              style={{ flex: 1 }}
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="sc-cta"
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Save className="w-5 h-5" />
              {loading ? t.common.loading : t.common.save}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

