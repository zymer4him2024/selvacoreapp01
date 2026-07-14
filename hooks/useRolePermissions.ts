'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import {
  AccessLevel,
  DEFAULT_ACCESS,
  FeatureAccess,
  RoleKey,
  RolePermissionsConfig,
  normalizeAccess,
} from '@/types/rolePermissions';

export function useRolePermissions(): {
  visibility: Record<string, FeatureAccess>;
  loading: boolean;
} {
  const [visibility, setVisibility] = useState<Record<string, FeatureAccess>>(
    DEFAULT_ACCESS,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'rolePermissions'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<RolePermissionsConfig>;
          setVisibility(normalizeAccess(data.visibility));
        } else {
          setVisibility(DEFAULT_ACCESS);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  return { visibility, loading };
}

export function featureLevel(
  visibility: Record<string, FeatureAccess>,
  feature: string,
  role: RoleKey,
): AccessLevel {
  return visibility[feature]?.[role] ?? DEFAULT_ACCESS[feature]?.[role] ?? 'hidden';
}

export function isFeatureVisible(
  visibility: Record<string, FeatureAccess>,
  feature: string,
  role: RoleKey,
): boolean {
  return featureLevel(visibility, feature, role) !== 'hidden';
}

// Access for the signed-in user on one feature. Admin always has full access;
// other roles follow the saved config. `canEdit` gates mutation controls in
// the UI (server rules remain the source of truth).
export function useFeatureAccess(feature: string): {
  visible: boolean;
  canEdit: boolean;
  loading: boolean;
} {
  const { userData } = useAuth();
  const { visibility, loading } = useRolePermissions();

  if (userData?.role === 'admin') {
    return { visible: true, canEdit: true, loading };
  }

  const roleMap: Record<string, RoleKey> = {
    'sub-admin': 'subAdmin',
    'technician': 'technician',
    'customer': 'customer',
  };
  const role = roleMap[userData?.role ?? ''];
  if (!role) return { visible: false, canEdit: false, loading };

  const level = featureLevel(visibility, feature, role);
  return { visible: level !== 'hidden', canEdit: level === 'edit', loading };
}
