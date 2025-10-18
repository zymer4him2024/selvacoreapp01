'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { user, userData, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if already logged in
    if (user && userData) {
      const roleDashboards: Record<string, string> = {
        'admin': '/admin',
        'sub-admin': '/sub-admin',
        'installer': '/installer',
        'customer': '/customer',
      };
      router.push(roleDashboards[userData.role] || '/');
    }
  }, [user, userData, router]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Successfully signed in!');
      
      // Check if customer needs to complete registration
      if (user && userData?.role === 'customer') {
        const customerDoc = await getDoc(doc(db, 'customers', user.uid));
        if (!customerDoc.exists()) {
          router.push('/customer/register');
          return;
        }
      }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Selvacore
            </h1>
            <p className="text-lg text-text-secondary">
              Installation Management Platform
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="apple-card space-y-6 animate-slide-up">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Welcome Back</h2>
            <p className="text-text-secondary text-sm">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="text-center text-xs text-text-tertiary">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-text-tertiary">
          Need help? Contact support@selvacore.com
        </p>
      </div>
    </div>
  );
}

