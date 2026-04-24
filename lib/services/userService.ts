import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface CustomerContactInfo {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
}

export async function getCustomerContactInfo(customerId: string): Promise<CustomerContactInfo | null> {
  if (!customerId) return null;
  try {
    const snap = await getDoc(doc(db, 'users', customerId));
    if (!snap.exists()) return null;
    const u = snap.data() as { displayName?: string; email?: string; phone?: string; whatsapp?: string };
    return {
      name: u.displayName || '',
      email: u.email || '',
      phone: u.phone || '',
      whatsapp: u.whatsapp || u.phone || '',
    };
  } catch {
    return null;
  }
}

export async function getCustomerContactMap(customerIds: string[]): Promise<Map<string, CustomerContactInfo>> {
  const unique = Array.from(new Set(customerIds.filter(Boolean)));
  const map = new Map<string, CustomerContactInfo>();
  await Promise.all(
    unique.map(async (id) => {
      const info = await getCustomerContactInfo(id);
      if (info) map.set(id, info);
    })
  );
  return map;
}
