'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  DEFAULT_VISIBILITY,
  FeatureVisibility,
  RoleKey,
  RolePermissionsConfig,
} from '@/types/rolePermissions';

export function useRolePermissions(): {
  visibility: Record<string, FeatureVisibility>;
  loading: boolean;
} {
  const [visibility, setVisibility] = useState<Record<string, FeatureVisibility>>(
    DEFAULT_VISIBILITY,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'config', 'rolePermissions'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<RolePermissionsConfig>;
          setVisibility({ ...DEFAULT_VISIBILITY, ...(data.visibility ?? {}) });
        } else {
          setVisibility(DEFAULT_VISIBILITY);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  return { visibility, loading };
}

export function isFeatureVisible(
  visibility: Record<string, FeatureVisibility>,
  feature: string,
  role: RoleKey,
): boolean {
  return visibility[feature]?.[role] ?? DEFAULT_VISIBILITY[feature]?.[role] ?? false;
}
