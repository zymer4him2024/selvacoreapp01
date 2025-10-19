'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const { user, userData, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    if (user && userData) {
      if (userData.role === 'admin') {
        // User is admin, redirect to dashboard
        router.push('/admin');
      } else {
        // User is not admin, show error
        toast.error('Access denied. This portal is for administrators only.');
      }
    }
  }, [user, userData, router]);

  const handleAdminSignIn = async () => {
    try {
      await signInWithGoogle();
      // The useEffect above will handle the redirect after auth state updates
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    }
  };

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

  // If user is logged in but not admin, show message
  if (user && userData && userData.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="apple-card space-y-6 bg-error/10 border-error/30">
            <div className="text-center space-y-4">
              <div className="text-6xl">🚫</div>
              <h1 className="text-3xl font-bold text-error">Access Denied</h1>
              <p className="text-text-secondary">
                This portal is for administrators only.
              </p>
              <p className="text-sm text-text-tertiary">
                You are signed in as: {userData.role}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/customer')}
                className="w-full px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
              >
                Go to Main Site
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3 bg-surface hover:bg-surface-elevated text-text-primary font-medium rounded-apple transition-all border border-border"
              >
                Sign Out & Try Different Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">👑</div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Admin Portal
            </h1>
            <p className="text-lg text-text-secondary">
              Administrators Only
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="apple-card space-y-6 animate-slide-up">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Sign In</h2>
            <p className="text-text-secondary text-sm">
              Use your authorized admin Google account
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleAdminSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Warning */}
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-apple">
            <p className="text-sm text-warning text-center">
              ⚠️ Authorized administrators only. Access is restricted.
            </p>
          </div>
        </div>

        {/* Back to Main Site */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            ← Back to Main Site
          </button>
        </div>
      </div>
    </div>
  );
}
