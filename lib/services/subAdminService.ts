import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Order, User } from '@/types';
import { getSubContractorById } from './subContractorService';
import { SubContractor } from '@/types';

/**
 * Get orders scoped to a sub-contractor
 */
export async function getSubAdminOrders(subContractorId: string): Promise<Order[]> {
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('subContractorId', '==', subContractorId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Order));
}

/**
 * Get technicians belonging to a sub-contractor
 */
export async function getSubAdminTechnicians(subContractorId: string): Promise<User[]> {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('role', '==', 'technician'),
    where('subContractorId', '==', subContractorId)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as User));
}

/**
 * Get sub-contractor details for the current sub-admin
 */
export async function getSubAdminContractor(subContractorId: string): Promise<SubContractor | null> {
  return getSubContractorById(subContractorId);
}

export interface SubAdminStats {
  totalTechnicians: number;
  approvedTechnicians: number;
  pendingTechnicians: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
}

/**
 * Get dashboard stats for a sub-admin
 */
export async function getSubAdminStats(subContractorId: string): Promise<SubAdminStats> {
  const [technicians, orders] = await Promise.all([
    getSubAdminTechnicians(subContractorId),
    getSubAdminOrders(subContractorId),
  ]);

  return {
    totalTechnicians: technicians.length,
    approvedTechnicians: technicians.filter((t) => t.technicianStatus === 'approved').length,
    pendingTechnicians: technicians.filter((t) => t.technicianStatus === 'pending').length,
    totalOrders: orders.length,
    completedOrders: orders.filter((o) => o.status === 'completed').length,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    inProgressOrders: orders.filter((o) => o.status === 'in_progress' || o.status === 'accepted').length,
  };
}
