import { useState, useEffect } from 'react';
import { translations, Language, TranslationKeys } from '@/lib/translations';
import { useAuth } from '@/contexts/AuthContext';

export function useTranslation() {
  const { userData } = useAuth();
  const [language, setLanguage] = useState<Language>('en');
  const [t, setT] = useState<TranslationKeys>(translations.en);

  useEffect(() => {
    // Priority: Firestore userData.preferredLanguage > localStorage > 'en'
    const profileLang = userData?.preferredLanguage;
    const storedLang = typeof window !== 'undefined'
      ? (localStorage.getItem('selectedLanguage') as Language | null)
      : null;

    const next: Language =
      profileLang && translations[profileLang]
        ? profileLang
        : storedLang && translations[storedLang]
          ? storedLang
          : 'en';

    setLanguage(next);
    setT(translations[next]);

    // Keep localStorage in sync so non-authenticated views (login, select-role) match
    if (typeof window !== 'undefined' && profileLang && translations[profileLang]) {
      localStorage.setItem('selectedLanguage', profileLang);
    }
  }, [userData?.preferredLanguage]);

  const changeLanguage = (lang: Language) => {
    if (translations[lang]) {
      setLanguage(lang);
      setT(translations[lang]);
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedLanguage', lang);
      }
    }
  };

  return { t, language, changeLanguage };
}
