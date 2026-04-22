import { Timestamp } from 'firebase/firestore';

export type InventoryCategory = 'filter' | 'part' | 'tool' | 'supply' | 'equipment';
export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type AdjustmentType = 'restock' | 'used' | 'adjustment' | 'returned';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  description: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  currency: string;
  supplier: string;
  location: string;
  lastRestockedAt: Timestamp | null;
  notes: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface StockAdjustment {
  id: string;
  itemId: string;
  itemName: string;
  type: AdjustmentType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  performedBy: string;
  performedByName: string;
  createdAt: Timestamp;
}

export function getInventoryStatus(item: InventoryItem): InventoryStatus {
  if (item.quantity <= 0) return 'out_of_stock';
  if (item.quantity <= item.minQuantity) return 'low_stock';
  return 'in_stock';
}
