import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { InventoryItem, StockAdjustment, AdjustmentType, getInventoryStatus } from '@/types/inventory';
import { logTransaction } from './transactionService';

export interface InventoryStats {
  totalItems: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

export async function createItem(
  data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'lastRestockedAt' | 'active'>,
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'inventory'), {
    ...data,
    active: true,
    lastRestockedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await logTransaction({
    type: 'inventory_created',
    metadata: { itemId: docRef.id, name: data.name, sku: data.sku },
    performedBy: data.createdBy,
    performedByRole: 'admin',
  });

  return docRef.id;
}

export async function updateItem(
  id: string,
  data: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'createdBy'>>,
  performedBy: string,
): Promise<void> {
  const ref = doc(db, 'inventory', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: Timestamp.now(),
  });

  await logTransaction({
    type: 'inventory_updated',
    metadata: { itemId: id, updatedFields: Object.keys(data) },
    performedBy,
    performedByRole: 'admin',
  });
}

export async function deleteItem(id: string, performedBy: string): Promise<void> {
  await updateItem(id, { active: false }, performedBy);
}

export async function getAllItems(): Promise<InventoryItem[]> {
  const q = query(
    collection(db, 'inventory'),
    where('active', '==', true),
    orderBy('name', 'asc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
}

export async function getItemById(id: string): Promise<InventoryItem | null> {
  const snap = await getDoc(doc(db, 'inventory', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as InventoryItem;
}

export async function adjustStock(
  itemId: string,
  type: AdjustmentType,
  quantity: number,
  reason: string,
  performedBy: string,
  performedByName: string,
): Promise<void> {
  const item = await getItemById(itemId);
  if (!item) throw new Error('Item not found');

  const previousQuantity = item.quantity;
  const delta = type === 'used' ? -Math.abs(quantity) : Math.abs(quantity);
  const newQuantity = Math.max(0, previousQuantity + delta);

  const now = Timestamp.now();

  await updateDoc(doc(db, 'inventory', itemId), {
    quantity: newQuantity,
    updatedAt: now,
    ...(type === 'restock' ? { lastRestockedAt: now } : {}),
  });

  await addDoc(collection(db, 'stockAdjustments'), {
    itemId,
    itemName: item.name,
    type,
    quantity: delta,
    previousQuantity,
    newQuantity,
    reason,
    performedBy,
    performedByName,
    createdAt: now,
  });

  await logTransaction({
    type: 'stock_adjusted',
    metadata: { itemId, adjustmentType: type, delta, previousQuantity, newQuantity, reason },
    performedBy,
    performedByRole: 'admin',
  });
}

export async function getStockAdjustments(itemId: string): Promise<StockAdjustment[]> {
  const q = query(
    collection(db, 'stockAdjustments'),
    where('itemId', '==', itemId),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StockAdjustment));
}

export async function getAllStockAdjustments(maxResults: number = 100): Promise<StockAdjustment[]> {
  const q = query(
    collection(db, 'stockAdjustments'),
    orderBy('createdAt', 'desc'),
    firestoreLimit(maxResults),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StockAdjustment));
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const items = await getAllItems();
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let totalValue = 0;

  for (const item of items) {
    const status = getInventoryStatus(item);
    if (status === 'in_stock') inStock++;
    else if (status === 'low_stock') lowStock++;
    else outOfStock++;
    totalValue += item.quantity * item.unitCost;
  }

  return {
    totalItems: items.length,
    inStock,
    lowStock,
    outOfStock,
    totalValue,
  };
}
