'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Save, Globe, Bell, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);

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
      // Will save to Firestore settings collection
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save
      toast.success('Settings saved successfully!');
    } catch (error: any) {
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
          <p className="text-text-secondary">Configure platform settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* General Settings */}
      <div className="apple-card">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">General Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Business Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Support Email</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Default Language</label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="pt">Português</option>
              <option value="ar">العربية</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Default Currency</label>
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
          <h2 className="text-2xl font-semibold">Payment Settings</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
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
                💳 Using Fake Payment Gateway for development
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Switch to Amazon Pay in production
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="apple-card">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-secondary" />
          <h2 className="text-2xl font-semibold">Notifications</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-surface rounded-apple cursor-pointer hover:bg-surface-elevated transition-colors">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-text-secondary mt-1">
                Send email updates to customers and installers
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
              <p className="font-medium">WhatsApp Notifications</p>
              <p className="text-sm text-text-secondary mt-1">
                Send WhatsApp messages for order updates (requires Business API)
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

