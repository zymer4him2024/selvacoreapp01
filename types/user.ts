import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'sub-admin' | 'technician' | 'customer';

export type Language = 'en' | 'es' | 'fr' | 'pt' | 'ar' | 'zh';

export type TechnicianStatus = 'pending' | 'approved' | 'declined' | 'suspended';

export interface User {
  id: string;
  role: UserRole;
  email: string;
  displayName: string;
  photoURL?: string;
  phone: string;
  whatsapp?: string; // WhatsApp number for communication (can be different from phone)
  preferredLanguage: Language;
  subContractorId?: string | null;
  active: boolean;
  emailVerified: boolean;
  roleSelected?: boolean; // Track if user has chosen their role
  
  // Technician-specific fields
  technicianStatus?: TechnicianStatus; // Application/approval status for technicians
  applicationDate?: Timestamp; // When they applied to be a technician
  approvedDate?: Timestamp; // When admin approved them
  serviceAreas?: string[]; // Cities/regions they serve
  certifications?: string[]; // List of certifications
  bio?: string; // Professional bio
  adminNotes?: string; // Admin notes about this technician
  
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

