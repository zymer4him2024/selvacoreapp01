import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'sub-admin' | 'technician' | 'customer';

export type Language = 'en' | 'es' | 'fr' | 'pt' | 'ar' | 'zh';

export interface User {
  id: string;
  role: UserRole;
  email: string;
  displayName: string;
  photoURL?: string;
  phone: string;
  preferredLanguage: Language;
  subContractorId?: string | null;
  active: boolean;
  emailVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface Customer {
  userId: string;
  addresses: Address[];
  orders: number;
  totalSpent: number;
  createdAt: Timestamp;
}

export interface Address {
  id: string;
  label: 'home' | 'office' | 'other';
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  landmark?: string;
  isDefault: boolean;
}

export interface Installer {
  userId: string;
  subContractorId: string;
  whatsapp: string;
  certifications: Certification[];
  serviceAreas: string[];
  specializations: string[];
  availability: InstallerAvailability;
  rating: number;
  totalInstallations: number;
  completedInstallations: number;
  cancelledInstallations: number;
  earnings: number;
  active: boolean;
  verified: boolean;
  createdAt: Timestamp;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: Timestamp;
  expiryDate?: Timestamp;
  documentUrl: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type TimeSlot = '9-12' | '13-15' | '15-18' | '18-21';

export interface InstallerAvailability {
  [key: string]: {
    available: boolean;
    slots: TimeSlot[];
  };
}

