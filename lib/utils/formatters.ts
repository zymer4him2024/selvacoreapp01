// LOCALE NOTE: These functions accept an optional locale arg, defaulting to 'en-US' for backward compatibility.
// Customer pages use the useLocaleFormatters() hook to bind to the current language automatically.
// Admin/technician/sub-admin pages still pass no locale arg, meaning they render English regardless of user language.
// This is intentional debt — to be paid off in Tier C (admin) and Tier D (technician/sub-admin) i18n passes.

import { Timestamp } from 'firebase/firestore';
import type { Language } from '@/types/user';

export type BcpLocale = 'en-US' | 'pt-BR' | 'es-ES' | 'ko-KR';

export const LANGUAGE_TO_LOCALE: Record<Language, BcpLocale> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-ES',
  ko: 'ko-KR',
};

export function localeFor(language: Language | undefined | null): BcpLocale {
  return language ? LANGUAGE_TO_LOCALE[language] : 'en-US';
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(
  date: Date | Timestamp,
  format: 'short' | 'long' | 'full' = 'short',
  locale: string = 'en-US',
): string {
  const jsDate = date instanceof Timestamp ? date.toDate() : date;

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };

  return new Intl.DateTimeFormat(locale, optionsMap[format]).format(jsDate);
}

/**
 * Format time
 */
export function formatTime(date: Date | Timestamp, locale: string = 'en-US'): string {
  const jsDate = date instanceof Timestamp ? date.toDate() : date;
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(jsDate);
}

/**
 * Format datetime
 */
export function formatDateTime(date: Date | Timestamp, locale: string = 'en-US'): string {
  const jsDate = date instanceof Timestamp ? date.toDate() : date;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(jsDate);
}

/**
 * Format relative time (e.g., "2 hours ago"). Uses Intl.RelativeTimeFormat for locale-aware output.
 */
export function formatRelativeTime(date: Date | Timestamp, locale: string = 'en-US'): string {
  const jsDate = date instanceof Timestamp ? date.toDate() : date;
  const now = new Date();
  const diffMs = jsDate.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSec < 60) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) <= 7) return rtf.format(diffDay, 'day');
  return formatDate(jsDate, 'short', locale);
}

/**
 * Format phone number
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}`;
  }
  return phone;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Generate order number
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}-${random}`;
}

/**
 * Return N/A for missing values
 */
export function formatValue<T>(value: T | undefined | null, formatFn?: (value: T) => string): string {
  if (value === undefined || value === null || value === '') {
    return 'N/A';
  }
  return formatFn ? formatFn(value) : String(value);
}

/**
 * Format optional currency (returns N/A if amount is 0 or undefined)
 */
export function formatOptionalCurrency(amount?: number, currency: string = 'USD', locale: string = 'en-US'): string {
  if (amount === undefined || amount === null || amount === 0) return 'N/A';
  return formatCurrency(amount, currency, locale);
}

/**
 * Format optional date (returns N/A if date is missing)
 */
export function formatOptionalDate(
  date?: Date | Timestamp,
  format: 'short' | 'long' | 'full' = 'short',
  locale: string = 'en-US',
): string {
  if (!date) return 'N/A';
  return formatDate(date, format, locale);
}

/**
 * Format optional number with N/A for 0 or undefined
 */
export function formatOptionalNumber(value?: number, suffix: string = ''): string {
  if (value === undefined || value === null || value === 0) return 'N/A';
  return `${value}${suffix}`;
}

/**
 * Format optional boolean as Yes/No/N/A
 */
export function formatOptionalBoolean(value?: boolean): string {
  if (value === undefined || value === null) return 'N/A';
  return value ? 'Yes' : 'No';
}

/**
 * Format optional string (returns N/A if empty)
 */
export function formatOptionalString(value?: string): string {
  if (!value || value.trim() === '') return 'N/A';
  return value;
}

/**
 * Order status label — single source of truth across roles.
 * Reads from the t.orderStatus.{role} namespace which has per-role wording
 * for statuses where customers/staff need different copy (e.g. customer sees
 * "Waiting for Installer" while staff sees "Pending").
 */
export type OrderStatusRole = 'customer' | 'admin' | 'technician';

interface OrderStatusBundle {
  pending: string;
  accepted: string;
  in_progress: string;
  completed: string;
  cancelled: string;
  refunded: string;
}

interface MinimalOrderStatusTranslations {
  orderStatus: Record<OrderStatusRole, OrderStatusBundle>;
}

export function getOrderStatusLabel(
  status: string,
  role: OrderStatusRole,
  t: MinimalOrderStatusTranslations,
): string {
  const bundle = t.orderStatus[role];
  const key = status as keyof OrderStatusBundle;
  return bundle[key] ?? status;
}
