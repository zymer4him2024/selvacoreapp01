'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ArrowLeft, Save, User as UserIcon, Mail, Phone, Globe } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import toast from 'react-hot-toast';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, userData, updateUserData } = useAuth();
  const { t, changeLanguage } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    preferredLanguage: 'en',
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        displayName: userData.displayName || '',
        phone: userData.phone || '',
        preferredLanguage: userData.preferredLanguage || 'en',
      });
    }
    loadCustomerProfile();
  }, [userData]);

  const loadCustomerProfile = async () => {
    if (!user) return;
    
    try {
      const customerDoc = await getDoc(doc(db, 'customers', user.uid));
      if (customerDoc.exists()) {
        setCustomerData(customerDoc.data());
      }
    } catch (error) {
      console.error('Error loading customer profile:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Update user document
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        phone: formData.phone,
        preferredLanguage: formData.preferredLanguage,
        updatedAt: new Date(),
      });

      // Update customer document if exists
      if (customerData) {
        await updateDoc(doc(db, 'customers', user.uid), {
          phone: formData.phone,
          updatedAt: new Date(),
        });
      }

      // Update language
      if (formData.preferredLanguage !== userData?.preferredLanguage) {
        changeLanguage(formData.preferredLanguage as any);
      }

      // Update local state
      if (updateUserData) {
        await updateUserData({
          displayName: formData.displayName,
          phone: formData.phone,
          preferredLanguage: formData.preferredLanguage as any,
        });
      }

      toast.success(t.messages?.saved || 'Profile updated successfully');
      router.back();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
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
              <h1 className="text-3xl font-bold">{t.customer.profile}</h1>
              <p className="text-sm text-text-secondary mt-1">
                Manage your account information
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-6 animate-fade-in">
          {/* Profile Picture */}
          <div className="apple-card">
            <div className="flex items-center gap-6">
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.displayName || 'User'}
                  className="w-24 h-24 rounded-full object-cover object-center border-4 border-border"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold">
                  {userData?.displayName?.[0] || 'U'}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">{userData?.displayName}</h2>
                <p className="text-text-secondary">{userData?.email}</p>
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full text-xs font-medium">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  Account Active
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="apple-card space-y-6">
            <h3 className="text-xl font-semibold mb-4">Personal Information</h3>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <UserIcon className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                placeholder="Enter your full name"
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={userData?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-surface border border-border rounded-apple text-text-tertiary cursor-not-allowed"
              />
              <p className="text-xs text-text-tertiary mt-1">
                Email cannot be changed (linked to Google account)
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Preferred Language */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Preferred Language
              </label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-tertiary mt-1">
                All content will be displayed in this language
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="apple-card space-y-4">
            <h3 className="text-xl font-semibold mb-4">Account Information</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-tertiary">Account Type</p>
                <p className="font-medium capitalize">{userData?.role || 'Customer'}</p>
              </div>
              <div>
                <p className="text-text-tertiary">Member Since</p>
                <p className="font-medium">
                  {userData?.createdAt?.toDate ? 
                    userData.createdAt.toDate().toLocaleDateString() : 
                    'N/A'}
                </p>
              </div>
              <div>
                <p className="text-text-tertiary">Last Login</p>
                <p className="font-medium">
                  {userData?.lastLoginAt?.toDate ? 
                    userData.lastLoginAt.toDate().toLocaleDateString() : 
                    'N/A'}
                </p>
              </div>
              <div>
                <p className="text-text-tertiary">Email Verified</p>
                <p className="font-medium">
                  {userData?.emailVerified ? (
                    <span className="text-success">✓ Verified</span>
                  ) : (
                    <span className="text-warning">Pending</span>
                  )}
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
              Cancel
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

