// Service Service - Handle all service operations
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
import { Service } from '@/types';

/**
 * Get all services
 */
export async function getAllServices(): Promise<Service[]> {
  const servicesRef = collection(db, 'services');
  const q = query(servicesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Service));
}

/**
 * Get single service by ID
 */
export async function getServiceById(id: string): Promise<Service | null> {
  const docRef = doc(db, 'services', id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Service;
}

/**
 * Create new service
 */
export async function createService(
  serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const servicesRef = collection(db, 'services');

  const newService = {
    ...serviceData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(servicesRef, newService);
  return docRef.id;
}

/**
 * Update existing service
 */
export async function updateService(id: string, serviceData: Partial<Service>): Promise<void> {
  const docRef = doc(db, 'services', id);

  await updateDoc(docRef, {
    ...serviceData,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete service
 */
export async function deleteService(id: string): Promise<void> {
  const docRef = doc(db, 'services', id);
  await deleteDoc(docRef);
}

/**
 * Get active services only
 */
export async function getActiveServices(): Promise<Service[]> {
  const servicesRef = collection(db, 'services');
  const q = query(servicesRef, where('active', '==', true), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Service));
}

