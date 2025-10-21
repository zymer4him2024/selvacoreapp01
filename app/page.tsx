'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    // Redirect logged-in users to their dashboard
    if (user && userData && !loading) {
      const roleDashboards: Record<string, string> = {
        'admin': '/admin',
        'sub-admin': '/sub-admin',
        'technician': '/technician',
        'customer': '/customer',
      };
      
      if (userData.role) {
        router.push(roleDashboards[userData.role] || '/login');
      } else {
        router.push('/login');
      }
    } else if (!loading && !user) {
      // Not logged in - go to login
      router.push('/login');
    }
  }, [user, userData, loading, router]);

  // Show loading while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}
