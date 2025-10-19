import { Timestamp } from 'firebase/firestore';
import { TimeSlot } from './user';
import { MultiLanguageText } from './product';

export type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'completed' | 'refunded';
export type PaymentMethod = 'fake_payment' | 'amazon_pay' | 'credit_card';

export interface Order {
  id: string;
  orderNumber: string;
  
  // Participants
  customerId: string;
  technicianId: string | null;
  subContractorId: string | null;
  
  // Product & Service
  productId: string;
  productVariationId: string;
  productSnapshot: {
    name: MultiLanguageText;
    variation: string;
    price: number;
    image: string;
  };
  serviceId: string;
  serviceSnapshot: {
    name: MultiLanguageText;
    price: number;
    duration: number;
  };
  
  // Installation Details
  installationAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    landmark?: string;
  };
  installationDate: Timestamp;
  timeSlot: TimeSlot;
  
  // Site Photos (from customer)
  sitePhotos: {
    waterSource?: {
      url: string;
      uploadedAt: Timestamp;
    };
    productLocation?: {
      url: string;
      uploadedAt: Timestamp;
    };
    waterRunningVideo?: {
      url: string;
      uploadedAt: Timestamp;
    };
  };
  
  // Installation Evidence (from technician)
  installationPhotos: InstallationPhoto[];
  
  // Status & Workflow
  status: OrderStatus;
  statusHistory: StatusHistoryItem[];
  
  // Payment
  payment: OrderPayment;
  
  // Timeline
  createdAt: Timestamp;
  acceptedAt: Timestamp | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  cancelledAt: Timestamp | null;
  
  // Customer Info Snapshot
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    whatsapp?: string;
  };
  
  // Technician Info (when accepted)
  technicianInfo: {
    name: string;
    phone: string;
    whatsapp: string;
    photo: string;
    rating: number;
  } | null;
  
  // Notes & Communication
  customerNotes?: string;
  technicianNotes?: string;
  adminNotes?: string;
  
  // Rating & Review
  rating: {
    score: number;
    review: string;
    ratedAt: Timestamp;
  } | null;
  
  // Cancellation
  cancellation: {
    reason: string;
    cancelledBy: 'customer' | 'technician' | 'admin';
    refundIssued: boolean;
    timestamp: Timestamp;
  } | null;
  
  // Change History
  changeHistory: ChangeHistoryItem[];
}

export interface InstallationPhoto {
  url: string;
  description: string;
  uploadedAt: Timestamp;
}

export interface StatusHistoryItem {
  status: OrderStatus;
  timestamp: Timestamp;
  note?: string;
  changedBy: string; // userId
}

export interface OrderPayment {
  amount: number;
  currency: string;
  productPrice: number;
  servicePrice: number;
  tax: number;
  discount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  paidAt?: Timestamp;
  refundedAt?: Timestamp;
  refundReason?: string;
}

export interface ChangeHistoryItem {
  field: string;
  oldValue: any;
  newValue: any;
  changedAt: Timestamp;
  changedBy: string; // userId
}

