'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SUPPORTED_LANGUAGES } from '@/lib/utils/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { translations, Language } from '@/lib/translations';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { user, userData, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { t, changeLanguage } = useTranslation();

  useEffect(() => {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (!savedLanguage) {
      setShowLanguageSelection(true);
    } else {
      setSelectedLanguage(savedLanguage);
      changeLanguage(savedLanguage as Language);
    }
  }, []);

  useEffect(() => {
    if (user && userData) {
      if (userData.role === 'customer' && userData.roleSelected === false) {
        router.push(`/select-role?lang=${selectedLanguage}`);
      } else if (userData.role) {
        const roleDashboards: Record<string, string> = {
          'admin': '/admin',
          'sub-admin': '/admin',
          'technician': '/technician',
          'customer': '/customer',
        };
        router.push(roleDashboards[userData.role] || '/');
      }
    }
  }, [user, userData, router, selectedLanguage]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.login.error;
      toast.error(message);
    }
  };

  const mapAuthError = (error: unknown): string => {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';
    switch (code) {
      case 'auth/invalid-email':
        return t.login.authErrors.invalidEmail;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t.login.authErrors.incorrectCredentials;
      case 'auth/email-already-in-use':
        return t.login.authErrors.emailAlreadyInUse;
      case 'auth/weak-password':
        return t.login.authErrors.weakPassword;
      case 'auth/too-many-requests':
        return t.login.authErrors.tooManyAttempts;
      default:
        return error instanceof Error ? error.message : t.login.error;
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(t.login.enterEmailAndPassword);
      return;
    }
    if (authMode === 'signUp' && !displayName.trim()) {
      toast.error(t.login.enterYourName);
      return;
    }
    try {
      setSubmitting(true);
      if (authMode === 'signIn') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, displayName.trim());
      }
    } catch (error: unknown) {
      toast.error(mapAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="sc" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="sc-spinner" />
          <p className="sc-helper">{t.common.loading}</p>
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

  if (showLanguageSelection) {
    return (
      <div className="sc" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 48 }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h1 className="sc-h1" style={{ margin: 0, fontSize: 48, color: 'var(--brand)' }}>Selvacore</h1>
            <p style={{ fontSize: 20, color: 'var(--ink)', margin: 0 }}>{translations.en.home.subtitle}</p>
            <p className="sc-helper" style={{ fontSize: 16, margin: 0 }}>{translations.en.home.selectLanguage}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 24 }}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const langTranslations = translations[lang.code as Language].home;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  className="sc-card"
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 56, marginBottom: 16 }}>{lang.flag}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>{lang.name}</h3>
                  <p className="sc-helper" style={{ fontSize: 13, margin: 0 }}>{langTranslations.clickToContinue}</p>
                </button>
              );
            })}
          </div>

          <p className="sc-helper" style={{ textAlign: 'center', fontSize: 12, margin: 0 }}>{translations.en.home.footer}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 64 }}>{selectedLang?.flag || '🌍'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 className="sc-h1" style={{ margin: 0, fontSize: 40, color: 'var(--brand)' }}>{t.login.title}</h1>
            <p style={{ fontSize: 16, color: 'var(--soft)', margin: 0 }}>{selectedLang?.name || 'English'}</p>
          </div>
        </div>

        <div className="sc-card-static" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <h2 className="sc-h2" style={{ margin: 0 }}>{t.login.subtitle}</h2>
          </div>

          <button
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '14px 24px',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--paper)'; }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t.login.signInWithGoogle}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
            <span style={{ fontSize: 11, color: 'var(--soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {authMode === 'signIn' ? t.login.orSignInWithEmail : t.login.orCreateAccount}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
          </div>

          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {authMode === 'signUp' && (
              <input
                type="text"
                placeholder={t.login.namePlaceholder}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                className="sc-input"
              />
            )}
            <input
              type="email"
              placeholder={t.login.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="sc-input"
            />
            <input
              type="password"
              placeholder={t.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'}
              className="sc-input"
            />
            <button
              type="submit"
              disabled={submitting}
              className="sc-cta"
              style={{ width: '100%', padding: '12px 24px' }}
            >
              {submitting
                ? t.login.signingIn
                : authMode === 'signIn'
                  ? t.login.signInButton
                  : t.login.createAccountButton}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn')}
            style={{
              width: '100%',
              fontSize: 13,
              color: 'var(--soft)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--soft)'; }}
          >
            {authMode === 'signIn'
              ? t.login.dontHaveAccount
              : t.login.alreadyHaveAccount}
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setShowLanguageSelection(true)}
            style={{
              fontSize: 13,
              color: 'var(--soft)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--soft)'; }}
          >
            ← {t.home.selectLanguage}
          </button>
        </div>
      </div>
    </div>
  );
}
