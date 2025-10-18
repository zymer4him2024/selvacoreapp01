// Sub-Contractor Service - Handle all sub-contractor operations
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SubContractor } from '@/types';

/**
 * Get all sub-contractors
 */
export async function getAllSubContractors(): Promise<SubContractor[]> {
  const subContractorsRef = collection(db, 'subContractors');
  const q = query(subContractorsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as SubContractor));
}

/**
 * Get single sub-contractor by ID
 */
export async function getSubContractorById(id: string): Promise<SubContractor | null> {
  const docRef = doc(db, 'subContractors', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as SubContractor;
}

/**
 * Create new sub-contractor
 */
export async function createSubContractor(
  data: Omit<SubContractor, 'id' | 'createdAt' | 'updatedAt' | 'stats'>
): Promise<string> {
  const subContractorsRef = collection(db, 'subContractors');

  const newSubContractor = {
    ...data,
    stats: {
      totalInstallers: 0,
      totalOrders: 0,
      completedOrders: 0,
      revenue: 0,
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(subContractorsRef, newSubContractor);
  return docRef.id;
}

/**
 * Update existing sub-contractor
 */
export async function updateSubContractor(
  id: string,
  data: Partial<SubContractor>
): Promise<void> {
  const docRef = doc(db, 'subContractors', id);

  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete sub-contractor
 */
export async function deleteSubContractor(id: string): Promise<void> {
  const docRef = doc(db, 'subContractors', id);
  await deleteDoc(docRef);
}

/**
 * Get active sub-contractors only
 */
export async function getActiveSubContractors(): Promise<SubContractor[]> {
  const subContractorsRef = collection(db, 'subContractors');
  const q = query(subContractorsRef, where('active', '==', true), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as SubContractor));
}

