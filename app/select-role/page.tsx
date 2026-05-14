'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { UserRole, Language } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

function SelectRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const { t } = useTranslation();

  useEffect(() => {
    const langFromUrl = searchParams.get('lang') as Language;
    const langFromStorage = localStorage.getItem('selectedLanguage') as Language;
    setSelectedLanguage(langFromUrl || langFromStorage || 'en');
  }, [searchParams]);

  const handleContinue = async () => {
    if (!selectedRole || !user) {
      toast.error(t.selectRole.selectRole);
      return;
    }

    try {
      setLoading(true);

      if (selectedRole === 'technician') {
        await setDoc(doc(db, 'users', user.uid), {
          role: selectedRole,
          email: user.email,
          displayName: user.displayName || '',
          phone: '',
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          preferredLanguage: selectedLanguage,
          active: false,
          roleSelected: true,
          technicianStatus: 'draft',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        });

        router.push('/technician/apply');
        return;
      }

      await setDoc(doc(db, 'users', user.uid), {
        role: selectedRole,
        email: user.email,
        displayName: user.displayName,
        phone: '',
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        preferredLanguage: selectedLanguage,
        active: true,
        roleSelected: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      });

      toast.success(t.selectRole.welcomeToast);

      const roleDashboards: Record<UserRole, string> = {
        admin: '/admin',
        'sub-admin': '/admin',
        technician: '/technician',
        customer: '/customer/register',
      };

      router.push(roleDashboards[selectedRole]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save role';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const roles: Array<{ value: UserRole; label: string; icon: string; description: string }> = [
    {
      value: 'technician',
      label: t.selectRole.technician.label,
      icon: '🔧',
      description: t.selectRole.technician.description,
    },
    {
      value: 'customer',
      label: t.selectRole.customer.label,
      icon: '🏠',
      description: t.selectRole.customer.description,
    },
  ];

  return (
    <div className="sc" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 672, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="sc-h1" style={{ margin: 0 }}>{t.selectRole.title}</h1>
          <p className="sc-helper" style={{ margin: 0, fontSize: 16 }}>{t.selectRole.subtitle}</p>
        </div>

        <div className="sc-card-static">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {roles.map((role) => {
              const isSelected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  style={{
                    width: '100%',
                    padding: 24,
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--brand-tint)' : 'var(--off-paper)',
                    border: isSelected ? '2px solid var(--brand)' : '1px solid var(--hairline)',
                    color: 'var(--ink)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 36 }}>{role.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>{role.label}</div>
                      <div style={{ fontSize: 13, marginTop: 4, color: 'var(--soft)' }}>
                        {role.description}
                      </div>
                    </div>
                    {isSelected && (
                      <svg width={24} height={24} fill="none" stroke="var(--brand)" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className="sc-cta"
            style={{ width: '100%', marginTop: 24, padding: '14px 24px', fontSize: 15 }}
          >
            {loading ? t.common.loading : t.selectRole.continue}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <Suspense fallback={
      <div className="sc" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sc-spinner" />
      </div>
    }>
      <SelectRoleContent />
    </Suspense>
  );
}
