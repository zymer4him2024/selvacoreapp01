'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { UserRole, Language } from '@/types';
import toast from 'react-hot-toast';

export default function SelectRolePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');

  useEffect(() => {
    // Get language from URL or localStorage
    const langFromUrl = searchParams.get('lang') as Language;
    const langFromStorage = localStorage.getItem('selectedLanguage') as Language;
    setSelectedLanguage(langFromUrl || langFromStorage || 'en');
  }, [searchParams]);

  const handleContinue = async () => {
    if (!selectedRole || !user) {
      toast.error('Please select a role');
      return;
    }

    try {
      setLoading(true);

      // Create user document with role and language
      await setDoc(doc(db, 'users', user.uid), {
        role: selectedRole,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        preferredLanguage: selectedLanguage,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      });

      toast.success('Welcome to Selvacore!');

      // Redirect based on role
      const roleDashboards: Record<UserRole, string> = {
        admin: '/admin',
        'sub-admin': '/sub-admin',
        technician: '/technician',
        customer: '/customer/register',
      };

      router.push(roleDashboards[selectedRole]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  const roles: Array<{ value: UserRole; label: string; icon: string; description: string }> = [
    {
      value: 'technician',
      label: 'Technician',
      icon: '🔧',
      description: 'Accept and complete installation orders',
    },
    {
      value: 'customer',
      label: 'Customer',
      icon: '🏠',
      description: 'Order installation services',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome! 👋
          </h1>
          <p className="text-lg text-text-secondary">
            Choose your role to get started
          </p>
          <p className="text-sm text-text-tertiary">
            This is a one-time setup
          </p>
        </div>

        {/* Role Selection */}
        <div className="apple-card">
          <div className="space-y-3">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`
                  w-full p-6 rounded-apple transition-all duration-200 text-left
                  ${
                    selectedRole === role.value
                      ? 'bg-primary text-white shadow-apple-focus scale-[1.02]'
                      : 'bg-surface hover:bg-surface-elevated border border-border hover:border-border-light'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{role.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{role.label}</div>
                    <div
                      className={`text-sm mt-1 ${
                        selectedRole === role.value
                          ? 'text-white/80'
                          : 'text-text-tertiary'
                      }`}
                    >
                      {role.description}
                    </div>
                  </div>
                  {selectedRole === role.value && (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className={`
              w-full mt-6 px-8 py-4 font-semibold rounded-apple transition-all shadow-apple
              ${
                selectedRole && !loading
                  ? 'bg-primary hover:bg-primary-hover text-white hover:scale-[1.02]'
                  : 'bg-surface-secondary text-text-tertiary cursor-not-allowed'
              }
            `}
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
