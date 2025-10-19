// Application constants

export const APP_NAME = 'Selvacore';
export const APP_DESCRIPTION = 'Professional Installation Management Platform';

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
] as const;

// Time slots for installation
export const TIME_SLOTS = [
  { value: '9-12', label: '9:00 AM - 12:00 PM' },
  { value: '13-15', label: '1:00 PM - 3:00 PM' },
  { value: '15-18', label: '3:00 PM - 6:00 PM' },
  { value: '18-21', label: '6:00 PM - 9:00 PM' },
] as const;

// Order statuses
export const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'accepted', label: 'Accepted', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'purple' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'refunded', label: 'Refunded', color: 'gray' },
] as const;

// User roles
export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'sub-admin', label: 'Sub-Admin' },
  { value: 'technician', label: 'Technician' },
  { value: 'customer', label: 'Customer' },
] as const;

// Product categories
export const PRODUCT_CATEGORIES = [
  'Water Filtration',
  'Air Purification',
  'Water Softener',
  'Reverse Osmosis',
  'UV Systems',
  'Whole House Filter',
] as const;

// Service categories
export const SERVICE_CATEGORIES = [
  'Standard Installation',
  'Premium Installation',
  'Maintenance',
  'Repair',
  'Inspection',
  'Consultation',
] as const;

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

// Pagination
export const ITEMS_PER_PAGE = 10;
export const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Currency
export const DEFAULT_CURRENCY = 'USD';
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR'];

// Commission
export const DEFAULT_COMMISSION_RATE = 20; // 20%

