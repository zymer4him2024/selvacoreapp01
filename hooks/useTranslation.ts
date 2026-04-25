import { useLanguageContext } from '@/contexts/LanguageContext';

export function useTranslation() {
  return useLanguageContext();
}
