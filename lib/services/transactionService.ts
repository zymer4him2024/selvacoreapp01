// Transaction Service - Handle all transaction logging
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Transaction, TransactionType } from '@/types';

/**
 * Log a new transaction
 */
export async function logTransaction(
  data: Omit<Transaction, 'id' | 'timestamp'>
): Promise<string> {
  const transactionsRef = collection(db, 'transactions');

  const transaction = {
    ...data,
    timestamp: Timestamp.now(),
  };

  const docRef = await addDoc(transactionsRef, transaction);
  return docRef.id;
}

/**
 * Get all transactions
 */
export async function getAllTransactions(limitCount: number = 100): Promise<Transaction[]> {
  const transactionsRef = collection(db, 'transactions');
  const q = query(transactionsRef, orderBy('timestamp', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Transaction));
}

export interface PaginatedResult<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Get transactions with cursor-based pagination
 */
export async function getTransactionsPaginated(
  pageSize: number = 50,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  typeFilter?: string
): Promise<PaginatedResult<Transaction>> {
  const transactionsRef = collection(db, 'transactions');
  const hasType = typeFilter && typeFilter !== 'all';

  let q;
  if (hasType && lastDoc) {
    q = query(transactionsRef, where('type', '==', typeFilter), orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(pageSize + 1));
  } else if (hasType) {
    q = query(transactionsRef, where('type', '==', typeFilter), orderBy('timestamp', 'desc'), limit(pageSize + 1));
  } else if (lastDoc) {
    q = query(transactionsRef, orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(pageSize + 1));
  } else {
    q = query(transactionsRef, orderBy('timestamp', 'desc'), limit(pageSize + 1));
  }

  const snapshot = await getDocs(q);

  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;

  return {
    items: docs.map((doc) => ({ id: doc.id, ...doc.data() } as Transaction)),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

/**
 * Get transactions by type
 */
export async function getTransactionsByType(
  type: TransactionType,
  limitCount: number = 100
): Promise<Transaction[]> {
  const transactionsRef = collection(db, 'transactions');
  const q = query(
    transactionsRef,
    where('type', '==', type),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Transaction));
}

/**
 * Get transactions by order ID
 */
export async function getTransactionsByOrderId(orderId: string): Promise<Transaction[]> {
  const transactionsRef = collection(db, 'transactions');
  const q = query(
    transactionsRef,
    where('orderId', '==', orderId),
    orderBy('timestamp', 'asc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Transaction));
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', transactionId));
}

