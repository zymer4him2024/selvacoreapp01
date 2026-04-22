import { Timestamp } from 'firebase/firestore';

export type NotificationType =
  // Order lifecycle (customer-facing)
  | 'order_placed'
  | 'order_accepted'
  | 'order_started'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_reassigned'
  // Technician-facing
  | 'new_job_available'
  | 'technician_approved'
  | 'technician_declined'
  | 'technician_suspended'
  // Maintenance
  | 'maintenance_due_soon'
  | 'maintenance_overdue';

export interface Notification {
  id: string;
  userId: string;           // recipient
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  link?: string;            // in-app deep link, e.g. /customer/orders/abc123
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}
