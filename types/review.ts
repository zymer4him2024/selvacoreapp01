import { Timestamp } from 'firebase/firestore';

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  technicianId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  editableUntil: Timestamp;
  flagged: boolean;
  flaggedReason?: string;
  hidden: boolean;
}
