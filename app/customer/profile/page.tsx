'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ArrowLeft, Save, User as UserIcon, Mail, Phone, Globe } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import type { Language } from '@/types';
import toast from 'react-hot-toast';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, userData, updateUserData } = useAuth();
  const { t, changeLanguage } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const ps = t.customer.profileScreen;
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
      // Profile loading failed silently
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
        changeLanguage(formData.preferredLanguage as Language);
      }

      // Update local state
      if (updateUserData) {
        await updateUserData({
          displayName: formData.displayName,
          phone: formData.phone,
          preferredLanguage: formData.preferredLanguage as Language,
        });
      }

      toast.success(t.messages?.saved || 'Profile updated successfully');
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ps.updateError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
            <div className="sc-eyebrow">{t.customer.profile}</div>
            <h1 className="sc-h1">{t.customer.profile}</h1>
            <p className="sc-lede">{ps.manage}</p>
          </div>
        </div>

        <div className="sc-stack-lg">
          <div className="sc-card-static">
            <div className="sc-row" style={{ gap: 24 }}>
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.displayName || ps.defaultUser}
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--hairline)' }}
                />
              ) : (
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    color: 'var(--paper)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    fontWeight: 700,
                  }}
                >
                  {userData?.displayName?.[0] || ps.defaultUser.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="sc-h2" style={{ margin: 0 }}>{userData?.displayName}</h2>
                <p className="sc-lede" style={{ margin: '4px 0 8px' }}>{userData?.email}</p>
                <span className="sc-badge-inline" style={{ color: 'var(--brand)', background: 'var(--brand-tint)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)' }} />
                  {ps.accountActive}
                </span>
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <h3 className="sc-h2" style={{ marginBottom: 16 }}>{ps.personalInformation}</h3>

            <div className="sc-stack">
              <div>
                <label className="sc-label">
                  <UserIcon className="w-4 h-4 inline mr-2" />
                  {ps.fullName}
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="sc-input"
                  placeholder={ps.fullNamePlaceholder}
                />
              </div>

              <div>
                <label className="sc-label">
                  <Mail className="w-4 h-4 inline mr-2" />
                  {ps.emailAddress}
                </label>
                <input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="sc-input"
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                />
                <p className="sc-helper">{ps.emailLockedHint}</p>
              </div>

              <div>
                <label className="sc-label">
                  <Phone className="w-4 h-4 inline mr-2" />
                  {ps.phoneNumber}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="sc-input"
                  placeholder={ps.phoneNumberPlaceholder}
                />
              </div>

              <div>
                <label className="sc-label">
                  <Globe className="w-4 h-4 inline mr-2" />
                  {ps.preferredLanguage}
                </label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="sc-select"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                <p className="sc-helper">{ps.preferredLanguageHint}</p>
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <h3 className="sc-h2" style={{ marginBottom: 16 }}>{ps.accountInformation}</h3>

            <div className="grid grid-cols-2 gap-4" style={{ fontSize: 14 }}>
              <div>
                <p style={{ color: 'var(--soft)', fontSize: 12, margin: '0 0 4px' }}>{ps.accountType}</p>
                <p style={{ fontWeight: 600, textTransform: 'capitalize', margin: 0 }}>{userData?.role || ps.accountTypeCustomer}</p>
              </div>
              <div>
                <p style={{ color: 'var(--soft)', fontSize: 12, margin: '0 0 4px' }}>{ps.memberSince}</p>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {userData?.createdAt?.toDate ?
                    formatDate(userData.createdAt.toDate(), 'short') :
                    ps.notAvailable}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--soft)', fontSize: 12, margin: '0 0 4px' }}>{ps.lastLogin}</p>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {userData?.lastLoginAt?.toDate ?
                    formatDate(userData.lastLoginAt.toDate(), 'short') :
                    ps.notAvailable}
                </p>
              </div>
              <div>
                <p style={{ color: 'var(--soft)', fontSize: 12, margin: '0 0 4px' }}>{ps.emailVerified}</p>
                <p style={{ fontWeight: 600, margin: 0 }}>
                  {userData?.emailVerified ? (
                    <span style={{ color: 'var(--brand)' }}>✓ {ps.verified}</span>
                  ) : (
                    <span style={{ color: 'var(--warn)' }}>{ps.verificationPending}</span>
                  )}
                </p>
              </div>
            </div>
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

