'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { UserRole } from '@/types';
import { isDualModeUser } from '@/lib/auth/dualMode';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const isDualMode = isDualModeUser(userData);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo);
      } else if (
        allowedRoles &&
        userData &&
        !allowedRoles.includes(userData.role) &&
        !isDualMode
      ) {
        const roleDashboards: Record<UserRole, string> = {
          admin: '/admin',
          'sub-admin': '/admin',
          technician: '/technician',
          customer: '/customer',
        };
        router.push(roleDashboards[userData.role]);
      }
    }
  }, [user, userData, loading, allowedRoles, router, redirectTo, isDualMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (
    !user ||
    (allowedRoles &&
      userData &&
      !allowedRoles.includes(userData.role) &&
      !isDualMode)
  ) {
    return null;
  }

  return <>{children}</>;
}

