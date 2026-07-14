import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  DEFAULT_ACCESS,
  RolePermissionsConfig,
  normalizeAccess,
} from '@/types/rolePermissions';

const DOC_PATH = ['config', 'rolePermissions'] as const;

export async function getRolePermissions(): Promise<RolePermissionsConfig> {
  const snap = await getDoc(doc(db, ...DOC_PATH));
  if (!snap.exists()) {
    return { visibility: DEFAULT_ACCESS };
  }
  const data = snap.data() as Partial<RolePermissionsConfig>;
  return {
    visibility: normalizeAccess(data.visibility),
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export async function saveRolePermissions(
  visibility: RolePermissionsConfig['visibility'],
  userId: string,
): Promise<void> {
  await setDoc(doc(db, ...DOC_PATH), {
    visibility,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
}
