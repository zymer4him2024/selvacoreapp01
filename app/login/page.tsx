'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { translations, Language } from '@/lib/translations';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { user, userData, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const { t, changeLanguage } = useTranslation();

  useEffect(() => {
    // Check if language is already selected
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (!savedLanguage) {
      setShowLanguageSelection(true);
    } else {
      setSelectedLanguage(savedLanguage);
      changeLanguage(savedLanguage as Language);
    }
  }, []);

  useEffect(() => {
    // Redirect if already logged in
    if (user && userData) {
      // Check if user has completed role selection
      if (userData.roleSelected === false) {
        // New user who hasn't selected their role yet
        console.log('🎯 New user - redirecting to role selection...');
        router.push(`/select-role?lang=${selectedLanguage}`);
      } else if (userData.role) {
        // Existing user with confirmed role - redirect to their dashboard
        const roleDashboards: Record<string, string> = {
          'admin': '/admin',
          'sub-admin': '/sub-admin',
          'technician': '/technician',
          'customer': '/customer',
        };
        console.log('✅ Existing user - redirecting to dashboard:', userData.role);
        router.push(roleDashboards[userData.role] || '/');
      }
    }
  }, [user, userData, router, selectedLanguage]);

  const handleGoogleSignIn = async () => {
    console.log('🖱️ Google Sign-In button clicked!');
    try {
      console.log('📞 Calling signInWithGoogle from AuthContext...');
      await signInWithGoogle();
      console.log('🎉 Sign-in successful! User will be redirected automatically.');
      // The useEffect above will handle automatic redirect to dashboard
    } catch (error: any) {
      console.error('❌ Error in handleGoogleSignIn:', error);
      if (error) {
        toast.error(error.message || 'Failed to sign in');
      }
    }
  };

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

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    changeLanguage(languageCode as Language);
    localStorage.setItem('selectedLanguage', languageCode);
    setShowLanguageSelection(false);
  };

  const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage);

  // Show language selection if not selected yet
  if (showLanguageSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-4xl space-y-12 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Selvacore
            </h1>
            <p className="text-2xl text-text-secondary">
              {translations.en.home.subtitle}
            </p>
            <p className="text-lg text-text-tertiary mt-4">
              {translations.en.home.selectLanguage}
            </p>
          </div>
          
          {/* Language Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const langTranslations = translations[lang.code as Language].home;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className="apple-card hover:scale-[1.05] transition-all p-8 text-center group cursor-pointer"
                >
                  <div className="text-6xl mb-4">{lang.flag}</div>
                  <h3 className="text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {lang.name}
                  </h3>
                  <p className="text-sm text-text-tertiary">
                    {langTranslations.clickToContinue}
                  </p>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-text-tertiary">
            {translations.en.home.footer}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Language Display */}
        <div className="text-center space-y-4">
          <div className="text-7xl">{selectedLang?.flag || '🌍'}</div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t.login.title}
            </h1>
            <p className="text-lg text-text-secondary">
              {selectedLang?.name || 'English'}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="apple-card space-y-6 animate-slide-up">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">{t.login.subtitle}</h2>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
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
            {t.login.signInWithGoogle}
          </button>
        </div>

        {/* Change Language */}
        <div className="text-center">
          <button
            onClick={() => setShowLanguageSelection(true)}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            ← {t.home.selectLanguage}
          </button>
        </div>
      </div>
    </div>
  );
}
