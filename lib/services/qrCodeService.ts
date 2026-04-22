import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { QRCode, CreateQRCodeInput } from '@/types/qrCode';

const COLLECTION = 'qrCodes';

export async function listQRCodes(): Promise<QRCode[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QRCode);
}

export async function createQRCode(
  input: CreateQRCodeInput,
  createdBy: string
): Promise<string> {
  const ref = collection(db, COLLECTION);
  const now = Timestamp.now();
  const docRef = await addDoc(ref, {
    label: input.label,
    purpose: input.purpose,
    content: input.content,
    description: input.description || '',
    active: true,
    createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateQRCode(
  id: string,
  updates: Partial<Omit<QRCode, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteQRCode(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
