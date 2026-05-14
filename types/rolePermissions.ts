import { Timestamp } from 'firebase/firestore';

export interface FeatureVisibility {
  admin: boolean;
  subAdmin: boolean;
  technician: boolean;
  customer: boolean;
}

export interface RolePermissionsConfig {
  visibility: Record<string, FeatureVisibility>;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export type RoleKey = keyof FeatureVisibility;

// Static defaults: a feature is "visible" by default for every role that has
// any database access in firestore.rules. Sub-admin is platform-wide
// (Selvacore staff) and reads/manages everything operational; only inventory
// stays admin-only at the rules layer.
export const DEFAULT_VISIBILITY: Record<string, FeatureVisibility> = {
  featureOrders:         { admin: true,  subAdmin: true,  technician: true,  customer: true  },
  featureProducts:       { admin: true,  subAdmin: true,  technician: true,  customer: true  },
  featureServices:       { admin: true,  subAdmin: true,  technician: true,  customer: true  },
  featureUsers:          { admin: true,  subAdmin: true,  technician: true,  customer: true  },
  featureSubContractors: { admin: true,  subAdmin: true,  technician: false, customer: false },
  featureDevices:        { admin: true,  subAdmin: true,  technician: true,  customer: true  },
  featureMaintenance:    { admin: true,  subAdmin: true,  technician: true,  customer: true  },
  featureReviews:        { admin: true,  subAdmin: true,  technician: true,  customer: true  },
  featureInventory:      { admin: true,  subAdmin: false, technician: false, customer: false },
  featureNotifications:  { admin: true,  subAdmin: true,  technician: false, customer: true  },
  featureTransactions:   { admin: true,  subAdmin: false, technician: true,  customer: false },
};

// Locked cells: roles that have 'none' in firestore.rules. The editor disables
// these checkboxes — toggling them on would have no effect since rules deny.
export const LOCKED: Record<string, Partial<Record<RoleKey, boolean>>> = {
  featureSubContractors: { technician: true, customer: true },
  featureInventory:      { subAdmin: true, technician: true, customer: true },
  featureNotifications:  { technician: true },
  featureTransactions:   { subAdmin: true, customer: true },
};
