import { Timestamp } from 'firebase/firestore';

// Per-role access level for a feature:
// 'hidden' — removed from that role's sidebars and routes
// 'read'   — visible, but edit controls are hidden in the UI
// 'edit'   — visible with full UI controls (server rules still apply)
export type AccessLevel = 'hidden' | 'read' | 'edit';

export interface FeatureAccess {
  admin: AccessLevel;
  subAdmin: AccessLevel;
  technician: AccessLevel;
  customer: AccessLevel;
}

export interface RolePermissionsConfig {
  visibility: Record<string, FeatureAccess>;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export type RoleKey = keyof FeatureAccess;

// The Firestore doc historically stored booleans (visible/hidden). A legacy
// `true` meant "visible under the old static rules", which for some cells was
// read-only — never silently upgrade those to an edit grant.
export function normalizeLevel(
  value: unknown,
  fallback: AccessLevel,
  legacyTrueLevel: AccessLevel = 'edit',
): AccessLevel {
  if (value === 'hidden' || value === 'read' || value === 'edit') return value;
  if (value === true) return legacyTrueLevel;
  if (value === false) return 'hidden';
  return fallback;
}

// What a legacy boolean `true` translates to, per cell: the access the old
// static firestore.rules actually gave that role. Unlisted cells were fully
// writable, so legacy `true` maps to 'edit'.
const LEGACY_TRUE_LEVEL: Record<string, Partial<Record<RoleKey, AccessLevel>>> = {
  featureProducts:       { subAdmin: 'read', technician: 'read', customer: 'read' },
  featureServices:       { subAdmin: 'read', technician: 'read', customer: 'read' },
  featureUsers:          { technician: 'read', customer: 'read' },
  featureSubContractors: { subAdmin: 'read' },
  featureMaintenance:    { customer: 'read' },
  featureReviews:        { technician: 'read' },
  featureInventory:      { subAdmin: 'hidden' },
  featureTransactions:   { subAdmin: 'hidden' },
};

export function normalizeAccess(
  data: unknown,
): Record<string, FeatureAccess> {
  const result: Record<string, FeatureAccess> = { ...DEFAULT_ACCESS };
  if (!data || typeof data !== 'object') return result;
  const clamp = (feature: string, role: RoleKey, level: AccessLevel): AccessLevel => {
    const cap = maxLevel(feature, role);
    if (cap === 'hidden') return 'hidden';
    if (cap === 'read' && level === 'edit') return 'read';
    return level;
  };
  const legacyTrue = (feature: string, role: RoleKey): AccessLevel =>
    LEGACY_TRUE_LEVEL[feature]?.[role] ?? 'edit';
  for (const [feature, defaults] of Object.entries(DEFAULT_ACCESS)) {
    const raw = (data as Record<string, Partial<Record<RoleKey, unknown>>>)[feature];
    if (!raw || typeof raw !== 'object') continue;
    result[feature] = {
      admin: 'edit',
      subAdmin: clamp(feature, 'subAdmin', normalizeLevel(raw.subAdmin, defaults.subAdmin, legacyTrue(feature, 'subAdmin'))),
      technician: clamp(feature, 'technician', normalizeLevel(raw.technician, defaults.technician, legacyTrue(feature, 'technician'))),
      customer: clamp(feature, 'customer', normalizeLevel(raw.customer, defaults.customer, legacyTrue(feature, 'customer'))),
    };
  }
  return result;
}

// Static defaults: every role that has any database access in firestore.rules
// starts at its maximum allowed level. Sub-admin is platform-wide (Selvacore
// staff); only inventory stays admin-only at the rules layer.
export const DEFAULT_ACCESS: Record<string, FeatureAccess> = {
  featureOrders:         { admin: 'edit', subAdmin: 'edit',   technician: 'edit',   customer: 'edit' },
  featureProducts:       { admin: 'edit', subAdmin: 'read',   technician: 'read',   customer: 'read' },
  featureServices:       { admin: 'edit', subAdmin: 'read',   technician: 'read',   customer: 'read' },
  featureUsers:          { admin: 'edit', subAdmin: 'edit',   technician: 'read',   customer: 'read' },
  featureSubContractors: { admin: 'edit', subAdmin: 'read',   technician: 'hidden', customer: 'hidden' },
  featureDevices:        { admin: 'edit', subAdmin: 'edit',   technician: 'edit',   customer: 'edit' },
  featureMaintenance:    { admin: 'edit', subAdmin: 'edit',   technician: 'edit',   customer: 'read' },
  featureReviews:        { admin: 'edit', subAdmin: 'edit',   technician: 'read',   customer: 'edit' },
  featureInventory:      { admin: 'edit', subAdmin: 'hidden', technician: 'hidden', customer: 'hidden' },
  featureNotifications:  { admin: 'edit', subAdmin: 'edit',   technician: 'hidden', customer: 'edit' },
  featureTransactions:   { admin: 'edit', subAdmin: 'hidden', technician: 'edit',   customer: 'hidden' },
};

// Locked cells: roles that have 'none' in firestore.rules. The editor disables
// these — granting UI access would have no effect since rules deny everything.
// Sub-admin cells are never locked: firestore.rules consults the saved
// config (subAdminCanRead/subAdminCanEdit), so every grant is enforceable.
export const LOCKED: Record<string, Partial<Record<RoleKey, boolean>>> = {
  featureSubContractors: { technician: true, customer: true },
  featureInventory:      { technician: true, customer: true },
  featureNotifications:  { technician: true },
  featureTransactions:   { customer: true },
};

// Maximum grantable level per cell, mirroring firestore.rules: where rules
// only allow reads for a role, the editor caps the cell at 'read' so the UI
// never promises an edit the server would reject. Cells not listed cap at 'edit'.
export const MAX_LEVEL: Record<string, Partial<Record<RoleKey, AccessLevel>>> = {
  featureProducts:       { technician: 'read', customer: 'read' },
  featureServices:       { technician: 'read', customer: 'read' },
  featureUsers:          { technician: 'read', customer: 'read' },
  featureMaintenance:    { customer: 'read' },
  featureReviews:        { technician: 'read' },
};

export function maxLevel(feature: string, role: RoleKey): AccessLevel {
  if (role === 'admin') return 'edit';
  if (LOCKED[feature]?.[role]) return 'hidden';
  return MAX_LEVEL[feature]?.[role] ?? 'edit';
}
