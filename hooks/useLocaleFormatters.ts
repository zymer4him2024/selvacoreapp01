import { useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useLanguageContext } from '@/contexts/LanguageContext';
import {
  localeFor,
  formatCurrency,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatOptionalCurrency,
  formatOptionalDate,
} from '@/lib/utils/formatters';

/**
 * Pre-binds locale-aware formatters to the current UI language.
 * Use in customer pages so dates/currency follow the user's selected locale.
 */
export function useLocaleFormatters() {
  const { language } = useLanguageContext();
  const locale = localeFor(language);

  return useMemo(
    () => ({
      locale,
      formatCurrency: (amount: number, currency: string = 'USD') =>
        formatCurrency(amount, currency, locale),
      formatDate: (date: Date | Timestamp, format: 'short' | 'long' | 'full' = 'short') =>
        formatDate(date, format, locale),
      formatTime: (date: Date | Timestamp) => formatTime(date, locale),
      formatDateTime: (date: Date | Timestamp) => formatDateTime(date, locale),
      formatRelativeTime: (date: Date | Timestamp) => formatRelativeTime(date, locale),
      formatOptionalCurrency: (amount?: number, currency: string = 'USD') =>
        formatOptionalCurrency(amount, currency, locale),
      formatOptionalDate: (
        date?: Date | Timestamp,
        format: 'short' | 'long' | 'full' = 'short',
      ) => formatOptionalDate(date, format, locale),
    }),
    [locale],
  );
}
