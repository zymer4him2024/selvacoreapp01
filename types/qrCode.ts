import { Timestamp } from 'firebase/firestore';

export type QRCodePurpose =
  | 'customer_signup'
  | 'technician_signup'
  | 'product_page'
  | 'order_tracking'
  | 'device_registration'
  | 'maintenance_card'
  | 'custom';

export interface QRCode {
  id: string;
  label: string;
  purpose: QRCodePurpose;
  content: string;
  description?: string;
  active: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateQRCodeInput {
  label: string;
  purpose: QRCodePurpose;
  content: string;
  description?: string;
}
