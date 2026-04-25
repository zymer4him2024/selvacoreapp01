'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { translations, Language, TranslationKeys } from '@/lib/translations';
import { useAuth } from '@/contexts/AuthContext';

interface LanguageContextValue {
  t: TranslationKeys;
  language: Language;
  changeLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'selectedLanguage';

function readStoredLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null;
  return stored && translations[stored] ? stored : null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, userData } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const userPickedRef = useRef<boolean>(false);

  // 1. Hydrate from localStorage on mount. localStorage is the runtime source of truth.
  useEffect(() => {
    const stored = readStoredLanguage();
    if (stored) {
      setLanguage(stored);
      userPickedRef.current = true;
    }
  }, []);

  // 2. Fallback only: if there's NO localStorage value yet (fresh browser/device),
  //    seed from the user's Firestore preference once it arrives. Never override
  //    a value the user has already chosen in this browser.
  useEffect(() => {
    if (userPickedRef.current) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;

    const profileLang = userData?.preferredLanguage;
    if (profileLang && translations[profileLang]) {
      setLanguage(profileLang);
      window.localStorage.setItem(STORAGE_KEY, profileLang);
    }
  }, [userData?.preferredLanguage]);

  const changeLanguage = (lang: Language) => {
    if (!translations[lang]) return;
    userPickedRef.current = true;
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
    // Persist to Firestore so the choice survives across devices.
    if (user) {
      updateDoc(doc(db, 'users', user.uid), {
        preferredLanguage: lang,
        updatedAt: new Date(),
      }).catch(() => {
        // Non-fatal: localStorage still holds the choice for this browser.
      });
    }
  };

  return (
    <LanguageContext.Provider value={{ t: translations[language], language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return ctx;
}
