'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { USER_ROLES } from '@/lib/utils/constants';

export default function SelectRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>('');

  const handleContinue = () => {
    if (!selectedRole) return;
    
    // Store role preference temporarily
    localStorage.setItem('selectedRole', selectedRole);
    
    // Redirect to login
    router.push('/login');
  };

  const roleDescriptions: Record<string, string> = {
    admin: 'Manage products, services, and sub-contractors',
    'sub-admin': 'Manage your installers and track orders',
    installer: 'Accept and complete installation orders',
    customer: 'Order installation services',
  };

  const roleIcons: Record<string, string> = {
    admin: '👑',
    'sub-admin': '🏢',
    installer: '🔧',
    customer: '🏠',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Select Your Role
          </h1>
          <p className="text-lg text-text-secondary">
            How would you like to use Selvacore?
          </p>
        </div>

        {/* Role Selection */}
        <div className="apple-card">
          <div className="space-y-3">
            {USER_ROLES.map((role) => (
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
                  <span className="text-4xl">{roleIcons[role.value]}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{role.label}</div>
                    <div
                      className={`text-sm mt-1 ${
                        selectedRole === role.value
                          ? 'text-white/80'
                          : 'text-text-tertiary'
                      }`}
                    >
                      {roleDescriptions[role.value]}
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
            disabled={!selectedRole}
            className={`
              w-full mt-6 px-8 py-4 font-semibold rounded-apple transition-all shadow-apple
              ${
                selectedRole
                  ? 'bg-primary hover:bg-primary-hover text-white hover:scale-[1.02]'
                  : 'bg-surface-secondary text-text-tertiary cursor-not-allowed'
              }
            `}
          >
            Continue to Sign In
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <button
            onClick={() => router.push('/select-language')}
            className="text-text-secondary hover:text-text-primary transition-colors text-sm"
          >
            ← Back to Language Selection
          </button>
        </div>
      </div>
    </div>
  );
}

