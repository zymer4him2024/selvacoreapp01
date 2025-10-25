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

  console.log('🔍 PROTECTED ROUTE DEBUG - user:', !!user, 'userData:', userData, 'loading:', loading, 'allowedRoles:', allowedRoles);

  useEffect(() => {
    console.log('🔍 PROTECTED ROUTE useEffect - loading:', loading, 'user:', !!user, 'userData.role:', userData?.role);
    if (!loading) {
      if (!user) {
        console.log('🔍 PROTECTED ROUTE - No user, redirecting to login');
        router.push(redirectTo);
      } else if (allowedRoles && userData && !allowedRoles.includes(userData.role)) {
        console.log('🔍 PROTECTED ROUTE - Wrong role, redirecting to dashboard');
        const roleDashboards: Record<UserRole, string> = {
          admin: '/admin',
          'sub-admin': '/sub-admin',
          technician: '/technician',
          customer: '/customer',
        };
        router.push(roleDashboards[userData.role]);
      } else {
        console.log('🔍 PROTECTED ROUTE - Access granted');
      }
    }
  }, [user, userData, loading, allowedRoles, router, redirectTo]);

  // Show loading spinner while checking auth
  if (loading) {
    console.log('🔍 PROTECTED ROUTE - Showing loading spinner');
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
    console.log('🔍 PROTECTED ROUTE - Blocking access, returning null');
    return null;
  }

  console.log('🔍 PROTECTED ROUTE - Rendering children');
  return <>{children}</>;
}

