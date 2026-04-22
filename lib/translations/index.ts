// Translation index
import { en } from './en';
import { pt } from './pt';
import { es } from './es';
import { ko } from './ko';

export type { Language } from '@/types/user';

export const translations = {
  en,
  pt,
  es,
  ko,
} as const;

export type TranslationKeys = typeof en;

