'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Package, MapPin, DollarSign, Calendar, ArrowUpDown,
  Pencil, Trash2, CheckCircle, AlertTriangle, XCircle, Plus, Minus, RotateCcw, Undo2
} from 'lucide-react';
import { getItemById, getStockAdjustments, adjustStock, updateItem, deleteItem } from '@/lib/services/inventoryService';
import { InventoryItem, StockAdjustment, getInventoryStatus, AdjustmentType } from '@/types/inventory';
import InventoryFormModal, { InventoryFormData } from '@/components/admin/InventoryFormModal';
import StockAdjustmentModal from '@/components/admin/StockAdjustmentModal';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

const ADJUSTMENT_ICONS: Record<AdjustmentType, typeof Plus> = {
  restock: Plus,
  used: Minus,
  adjustment: RotateCcw,
  returned: Undo2,
};

const ADJUSTMENT_COLORS: Record<AdjustmentType, string> = {
  restock: 'text-success bg-success/10',
  used: 'text-warning bg-warning/10',
  adjustment: 'text-primary bg-primary/10',
  returned: 'text-primary bg-primary/10',
};

const CATEGORY_LABELS: Record<string, string> = {
  filter: 'Filter',
  part: 'Part',
  tool: 'Tool',
  supply: 'Supply',
  equipment: 'Equipment',
};

export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const { user, userData } = useAuth();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [itemId]);

  const loadData = async () => {
    try {
      const [itemData, adjustmentsData] = await Promise.all([
        getItemById(itemId),
        getStockAdjustments(itemId),
      ]);

      if (!itemData) {
        toast.error('Item not found');
        router.push('/admin/inventory');
        return;
      }

      setItem(itemData);
      setAdjustments(adjustmentsData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load item';
      toast.error(message);
      router.push('/admin/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (data: InventoryFormData) => {
    if (!user || !item) return;
    await updateItem(item.id, data, user.uid);
    toast.success('Item updated');
    setShowFormModal(false);
    setLoading(true);
    await loadData();
  };

  const handleAdjustSubmit = async (type: AdjustmentType, quantity: number, reason: string) => {
    if (!user || !item) return;
    const name = userData?.displayName || 'Admin';
    await adjustStock(item.id, type, quantity, reason, user.uid, name);
    toast.success('Stock adjusted');
    setShowAdjustModal(false);
    setLoading(true);
    await loadData();
  };

  const handleDelete = async () => {
    if (!user || !item) return;
    if (!confirm('Are you sure you want to remove this item from inventory?')) return;
    await deleteItem(item.id, user.uid);
    toast.success('Item removed');
    router.push('/admin/inventory');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading item...</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const status = getInventoryStatus(item);
  const statusConfig = {
    in_stock: { label: 'In Stock', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    low_stock: { label: 'Low Stock', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
    out_of_stock: { label: 'Out of Stock', icon: XCircle, color: 'text-error', bg: 'bg-error/10' },
  }[status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/inventory')}
            className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
              <span className="font-mono text-sm text-text-tertiary bg-surface-elevated px-2 py-1 rounded">
                {item.sku}
              </span>
            </div>
            <p className="text-text-secondary mt-1">
              {CATEGORY_LABELS[item.category]} {item.supplier ? `from ${item.supplier}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all"
          >
            <ArrowUpDown className="w-4 h-4" />
            Adjust Stock
          </button>
          <button
            onClick={() => setShowFormModal(true)}
            className="p-2.5 hover:bg-surface-elevated rounded-apple transition-colors border border-border"
            title="Edit item"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2.5 hover:bg-error/10 rounded-apple transition-colors border border-border"
            title="Remove item"
          >
            <Trash2 className="w-4 h-4 text-error" />
          </button>
        </div>
      </div>

      {/* Item Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stock Level Card */}
        <div className="apple-card text-center">
          <div className={`w-16 h-16 rounded-full ${statusConfig.bg} flex items-center justify-center mx-auto mb-3`}>
            <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
          </div>
          <p className={`text-5xl font-bold ${statusConfig.color}`}>{item.quantity}</p>
          <p className="text-text-tertiary text-sm mt-1">units in stock</p>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-sm">
              <span className="text-text-tertiary">Minimum:</span>{' '}
              <span className="font-medium">{item.minQuantity}</span>
            </p>
            <p className={`text-sm font-medium mt-1 ${statusConfig.color}`}>
              {statusConfig.label}
            </p>
          </div>
        </div>

        {/* Item Info */}
        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">Item Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-tertiary">Unit Cost</p>
                <p className="font-medium">{formatCurrency(item.unitCost, item.currency)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-tertiary">Total Value</p>
                <p className="font-medium">{formatCurrency(item.quantity * item.unitCost, item.currency)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-tertiary">Supplier</p>
                <p className="font-medium">{item.supplier || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-tertiary">Location</p>
                <p className="font-medium">{item.location || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timestamps & Notes */}
        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">Additional Info</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-tertiary">Created</p>
                <p className="font-medium">{formatDate(item.createdAt, 'long')}</p>
              </div>
            </div>
            {item.lastRestockedAt && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-success flex-shrink-0" />
                <div>
                  <p className="text-sm text-text-tertiary">Last Restocked</p>
                  <p className="font-medium">{formatDate(item.lastRestockedAt, 'long')}</p>
                </div>
              </div>
            )}
            {item.description && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-text-tertiary mb-1">Description</p>
                <p className="text-sm">{item.description}</p>
              </div>
            )}
            {item.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-text-tertiary mb-1">Notes</p>
                <p className="text-sm">{item.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment History */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Stock History</h2>

        {adjustments.length === 0 ? (
          <div className="apple-card text-center py-8">
            <p className="text-text-secondary">No stock adjustments recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {adjustments.map((adj) => {
              const Icon = ADJUSTMENT_ICONS[adj.type];
              const colorClass = ADJUSTMENT_COLORS[adj.type];
              return (
                <div key={adj.id} className="apple-card">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-apple flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold capitalize">{adj.type}</span>
                        <span className={`text-sm font-mono ${adj.quantity > 0 ? 'text-success' : 'text-error'}`}>
                          {adj.quantity > 0 ? '+' : ''}{adj.quantity}
                        </span>
                        <span className="text-text-tertiary text-sm">
                          ({adj.previousQuantity} → {adj.newQuantity})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary mt-0.5">
                        <span>{adj.performedByName}</span>
                        <span className="text-text-tertiary">·</span>
                        <span>{formatDate(adj.createdAt, 'short')}</span>
                      </div>
                      {adj.reason && (
                        <p className="text-sm text-text-tertiary mt-1">{adj.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showFormModal && (
        <InventoryFormModal
          item={item}
          onSubmit={handleEditSubmit}
          onClose={() => setShowFormModal(false)}
        />
      )}
      {showAdjustModal && (
        <StockAdjustmentModal
          item={item}
          onSubmit={handleAdjustSubmit}
          onClose={() => setShowAdjustModal(false)}
        />
      )}
    </div>
  );
}
