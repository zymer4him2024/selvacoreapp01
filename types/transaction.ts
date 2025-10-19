import { Timestamp } from 'firebase/firestore';

export type TransactionType =
  | 'order_created'
  | 'payment_received'
  | 'order_accepted'
  | 'order_started'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_changed'
  | 'refund_issued'
  | 'installer_assigned'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'service_created'
  | 'service_updated'
  | 'service_deleted'
  | 'sub_contractor_created'
  | 'sub_contractor_updated';

export interface Transaction {
  id: string;
  type: TransactionType;
  
  // Related entities
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  technicianId?: string;
  subContractorId?: string;
  
  // Financial data
  amount?: number;
  currency?: string;
  
  // Metadata
  metadata: Record<string, any>;
  
  // Audit trail
  performedBy: string; // userId
  performedByRole: string;
  ipAddress?: string;
  userAgent?: string;
  
  timestamp: Timestamp;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  installerId: string;
  subContractorId: string;
  rating: number;
  review: string;
  categories: {
    punctuality: number;
    professionalism: number;
    quality: number;
    cleanliness: number;
  };
  images: string[];
  response?: string;
  respondedAt?: Timestamp;
  helpful: number;
  createdAt: Timestamp;
}

