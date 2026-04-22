import { Timestamp } from 'firebase/firestore';
import { MultiLanguageText } from './product';

export type DeviceStatus = 'active' | 'inactive' | 'decommissioned';
export type MaintenanceType = 'ezer_maintenance' | 'filter_replacement';

export interface Device {
  id: string;
  qrCodeData: string;
  orderId: string;
  customerId: string;
  technicianId: string;
  productSnapshot: {
    name: MultiLanguageText;
    variation: string;
    image: string;
  };
  installationAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    landmark?: string;
  };
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    whatsapp?: string;
  };
  registeredAt: Timestamp;
  status: DeviceStatus;
  lastEzerMaintenanceAt: Timestamp | null;
  lastFilterReplacementAt: Timestamp | null;
  nextEzerMaintenanceDue: Timestamp;
  nextFilterReplacementDue: Timestamp;
}

export interface MaintenanceCompletion {
  completedAt: Timestamp;
  completedBy: string;
  notes?: string;
}

export interface MaintenanceSchedule {
  id: string;
  deviceId: string;
  orderId: string;
  type: MaintenanceType;
  filterName?: string;
  intervalDays: number;
  nextDueDate: Timestamp;
  lastCompletedAt: Timestamp | null;
  completionHistory: MaintenanceCompletion[];
  escalationLevel?: number;
  lastReminderSentAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

export interface MaintenanceScheduleInput {
  type: MaintenanceType;
  filterName?: string;
  intervalDays: number;
  firstDueDate: Date;
}

export interface DeviceRegistrationInput {
  qrCodeData: string;
  schedules: MaintenanceScheduleInput[];
}

export interface ManualDeviceInput {
  qrCodeData: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    whatsapp?: string;
  };
  installationAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    landmark?: string;
  };
  productName: string;
  productVariation: string;
  schedules: MaintenanceScheduleInput[];
}

export interface DeviceUpdateInput {
  qrCodeData?: string;
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
    whatsapp?: string;
  };
  installationAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    landmark?: string;
  };
  productName?: string;
  productVariation?: string;
  status?: DeviceStatus;
}

export interface MaintenanceVisitChecks {
  installationOk: boolean;
  operationOk: boolean;
  waterPressureOk: boolean;
  sedimentFilterReplaced: boolean;
  carbonFilterReplaced: boolean;
}

export interface MaintenanceVisit {
  id: string;
  deviceId: string;
  technicianId: string;
  technicianName: string;
  checks: MaintenanceVisitChecks;
  notes: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  createdAt: Timestamp;
}
