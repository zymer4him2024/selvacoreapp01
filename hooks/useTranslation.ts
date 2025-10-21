import { useState, useEffect } from 'react';
import { translations, Language, TranslationKeys } from '@/lib/translations';

export function useTranslation() {
  const [language, setLanguage] = useState<Language>('en');
  const [t, setT] = useState<TranslationKeys>(translations.en);

  useEffect(() => {
    // Get language from localStorage
    const savedLanguage = localStorage.getItem('selectedLanguage') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
      setT(translations[savedLanguage]);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    if (translations[lang]) {
      setLanguage(lang);
      setT(translations[lang]);
      localStorage.setItem('selectedLanguage', lang);
    }
  };

  return { t, language, changeLanguage };
}

