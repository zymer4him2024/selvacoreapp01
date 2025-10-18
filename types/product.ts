import { Timestamp } from 'firebase/firestore';

export interface MultiLanguageText {
  en: string;
  es: string;
  fr: string;
  ar: string;
  [key: string]: string;
}

export interface Product {
  id: string;
  name: MultiLanguageText;
  description: MultiLanguageText;
  category: string;
  brand: string;
  basePrice: number;
  currency: string;
  variations: ProductVariation[];
  images: string[];
  specifications: Record<string, string>;
  installationTime: number; // hours
  active: boolean;
  featured: boolean;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProductVariation {
  id: string;
  name: string;
  attributes: Record<string, string | number>; // e.g., { size: "Small", stages: 5 }
  price: number;
  stock: number;
  sku: string;
  images: string[];
}

export interface Service {
  id: string;
  name: MultiLanguageText;
  description: MultiLanguageText;
  price: number;
  currency: string;
  duration: number; // hours
  includes: string[];
  category: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SubContractor {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  businessLicense: string;
  taxId: string;
  active: boolean;
  commission: number; // percentage
  stats: {
    totalInstallers: number;
    totalOrders: number;
    completedOrders: number;
    revenue: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

