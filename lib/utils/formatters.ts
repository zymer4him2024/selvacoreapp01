// Utility functions for formatting data

import { Timestamp } from 'firebase/firestore';

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(date: Date | Timestamp, format: 'short' | 'long' | 'full' = 'short'): string {
  const jsDate = date instanceof Timestamp ? date.toDate() : date;
  
  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };
  
  return new Intl.DateTimeFormat('en-US', optionsMap[format]).format(jsDate);
}

/**
 * Format time
 */
export function formatTime(date: Date | Timestamp): string {
  const jsDate = date instanceof Timestamp ? date.toDate() : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(jsDate);
}

/**
 * Format datetime
 */
export function formatDateTime(date: Date | Timestamp): string {
  return `${formatDate(date, 'short')} at ${formatTime(date)}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | Timestamp): string {
  const jsDate = date instanceof Timestamp ? date.toDate() : date;
  const now = new Date();
  const diff = now.getTime() - jsDate.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) return formatDate(jsDate, 'short');
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
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

