'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings as SettingsIcon, Save, Globe, Bell, CreditCard, QrCode, ChevronRight, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import LogoUpload from '@/components/common/LogoUpload';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { userData, updateUserData } = useAuth();
  const st = t.admin.settings;
  const [saving, setSaving] = useState(false);
  const [logoURL, setLogoURL] = useState('');

  useEffect(() => {
    if (userData?.logoURL) setLogoURL(userData.logoURL);
  }, [userData]);

  // Settings state
  const [businessName, setBusinessName] = useState('Selvacore');
  const [supportEmail, setSupportEmail] = useState('support@selvacore.com');
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('10');
  
  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(true);

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
          <h1 className="text-4xl font-bold tracking-tight mb-2">{st.title}</h1>
          <p className="text-text-secondary">{st.subtitle}</p>
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
          <h2 className="text-2xl font-semibold">Business Logo</h2>
        </div>
        <LogoUpload
          currentLogoURL={logoURL}
          onLogoUploaded={(url) => setLogoURL(url)}
          onLogoRemoved={() => setLogoURL('')}
          label="Company Logo"
          hint="This logo will be displayed on the dashboard. Recommended size: 256x256px."
        />
      </div>

      {/* General Settings */}
      <div className="apple-card">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">{st.generalSettings}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">{st.businessName}</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{st.supportEmail}</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{st.defaultLanguage}</label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            >
              <option value="en">{st.english}</option>
              <option value="es">{st.spanish}</option>
              <option value="fr">{st.french}</option>
              <option value="pt">{st.portuguese}</option>
              <option value="ar">{st.arabic}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{st.defaultCurrency}</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="BRL">BRL (R$)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="apple-card">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-6 h-6 text-success" />
          <h2 className="text-2xl font-semibold">{st.paymentSettings}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">{st.taxRate}</label>
            <input
              type="number"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center">
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-apple">
              <p className="text-sm text-warning">
                {st.fakePayment}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                {st.switchProduction}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Management */}
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
              <h2 className="text-2xl font-semibold">QR Code Management</h2>
              <p className="text-sm text-text-secondary mt-1">
                Create QR codes for any purpose and share them via email, SMS, or WhatsApp.
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-text-tertiary group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </Link>

      {/* Notification Settings */}
      <div className="apple-card">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-secondary" />
          <h2 className="text-2xl font-semibold">{st.notifications}</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-surface rounded-apple cursor-pointer hover:bg-surface-elevated transition-colors">
            <div>
              <p className="font-medium">{st.emailNotifications}</p>
              <p className="text-sm text-text-secondary mt-1">
                {st.emailHelp}
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="w-12 h-6 rounded-full accent-primary"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-surface rounded-apple cursor-pointer hover:bg-surface-elevated transition-colors">
            <div>
              <p className="font-medium">{st.whatsappNotifications}</p>
              <p className="text-sm text-text-secondary mt-1">
                {st.whatsappHelp}
              </p>
            </div>
            <input
              type="checkbox"
              checked={whatsappNotifications}
              onChange={(e) => setWhatsappNotifications(e.target.checked)}
              className="w-12 h-6 rounded-full accent-primary"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

