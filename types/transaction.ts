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
  | 'sub_contractor_updated'
  | 'device_registered'
  | 'device_status_changed'
  | 'maintenance_completed'
  | 'maintenance_visit'
  | 'inventory_created'
  | 'inventory_updated'
  | 'stock_adjusted'
  | 'review_created'
  | 'review_updated'
  | 'review_flagged'
  | 'review_hidden'
  | 'review_unhidden'
  | 'review_restored';

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
  metadata: Record<string, unknown>;
  
  // Audit trail
  performedBy: string; // userId
  performedByRole: string;
  ipAddress?: string;
  userAgent?: string;
  
  timestamp: Timestamp;
}


