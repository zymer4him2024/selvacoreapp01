// Customer History Service - Track customer activities and transactions
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface CustomerHistoryRecord {
  id?: string;
  customerId: string;
  type: 'order_placed' | 'payment_made' | 'order_updated' | 'service_completed' | 'order_cancelled';
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  orderId?: string;
  transactionId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Add a new customer history record
 */
export async function addCustomerHistoryRecord(record: Omit<CustomerHistoryRecord, 'id' | 'timestamp'>): Promise<string> {
  const historyRef = collection(db, 'customerHistory');
  
  const historyRecord = {
    ...record,
    timestamp: Timestamp.now(),
  };

  const docRef = await addDoc(historyRef, historyRecord);
  return docRef.id;
}

/**
 * Get customer history records
 */
export async function getCustomerHistory(customerId: string): Promise<CustomerHistoryRecord[]> {
  const historyRef = collection(db, 'customerHistory');
  const q = query(
    historyRef,
    where('customerId', '==', customerId),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate()
  } as CustomerHistoryRecord));
}

/**
 * Get customer history by type
 */
export async function getCustomerHistoryByType(
  customerId: string, 
  type: CustomerHistoryRecord['type']
): Promise<CustomerHistoryRecord[]> {
  const historyRef = collection(db, 'customerHistory');
  const q = query(
    historyRef,
    where('customerId', '==', customerId),
    where('type', '==', type),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate()
  } as CustomerHistoryRecord));
}

/**
 * Get customer payment history
 */
export async function getCustomerPaymentHistory(customerId: string): Promise<CustomerHistoryRecord[]> {
  return getCustomerHistoryByType(customerId, 'payment_made');
}

/**
 * Get customer order history
 */
export async function getCustomerOrderHistory(customerId: string): Promise<CustomerHistoryRecord[]> {
  return getCustomerHistoryByType(customerId, 'order_placed');
}
