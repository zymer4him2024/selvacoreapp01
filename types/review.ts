import { Timestamp } from 'firebase/firestore';

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  customerName?: string; // Denormalized at write time; pre-existing docs may be missing
  technicianId: string;
  technicianName?: string; // Denormalized at write time; pre-existing docs may be missing
  rating: number; // 1-5
  comment?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  editableUntil: Timestamp;
  flagged: boolean;
  flaggedReason?: string;
  hidden: boolean;
}
