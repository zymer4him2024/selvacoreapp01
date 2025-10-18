// Transaction Service - Handle all transaction logging
import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  where,
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

