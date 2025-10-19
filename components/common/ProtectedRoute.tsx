'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

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
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in - redirect to login
        router.push(redirectTo);
      } else if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        // Logged in but not authorized - redirect to appropriate dashboard
        const roleDashboards: Record<UserRole, string> = {
          admin: '/admin',
          'sub-admin': '/sub-admin',
          technician: '/technician',
          customer: '/customer',
        };
        router.push(roleDashboards[userData.role]);
      }
    }
  }, [user, userData, loading, allowedRoles, router, redirectTo]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing if redirecting
  if (!user || (allowedRoles && userData && !allowedRoles.includes(userData.role))) {
    return null;
  }

  return <>{children}</>;
}

