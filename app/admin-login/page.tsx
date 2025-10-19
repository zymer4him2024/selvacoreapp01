'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const { user, userData, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Redirect if already logged in as admin
    if (user && userData) {
      if (userData.role === 'admin') {
        router.push('/admin');
      } else {
        toast.error('Access denied. Admin access only.');
        // Don't redirect, let them try different account
      }
    }
  }, [user, userData, router]);

  const handleAdminSignIn = async () => {
    try {
      setChecking(true);
      await signInWithGoogle();
      
      // Wait a moment for auth state to update
      setTimeout(async () => {
        // The useEffect will handle the redirect
        // But we'll do an additional check here
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists() || userDoc.data()?.role !== 'admin') {
            toast.error('Access denied. This portal is for administrators only.');
            // The useEffect will prevent access
          }
        }
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      setChecking(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">
            {checking ? 'Verifying admin access...' : 'Loading...'}
          </p>
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
            disabled={checking}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium rounded-apple transition-all hover:scale-[1.02] shadow-apple"
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
            {checking ? 'Verifying...' : 'Continue with Google'}
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

