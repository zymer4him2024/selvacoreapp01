'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, Search, Plus, Pencil, ChevronRight, ArrowUpDown,
  CheckCircle, AlertTriangle, XCircle, DollarSign, Boxes, MapPin,
  ArrowDownUp, Clock, User
} from 'lucide-react';
import { getAllItems, createItem, updateItem, adjustStock, getInventoryStats, getAllStockAdjustments, InventoryStats } from '@/lib/services/inventoryService';
import { InventoryItem, InventoryCategory, StockAdjustment, AdjustmentType, getInventoryStatus } from '@/types/inventory';
import InventoryFormModal, { InventoryFormData } from '@/components/admin/InventoryFormModal';
import StockAdjustmentModal from '@/components/admin/StockAdjustmentModal';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

type PageTab = 'items' | 'transactions';
type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type CategoryFilter = 'all' | InventoryCategory;
type TypeFilter = 'all' | AdjustmentType;

const TYPE_LABELS: Record<AdjustmentType, string> = {
  restock: 'Restock',
  used: 'Used',
  adjustment: 'Adjustment',
  returned: 'Returned',
};

const TYPE_COLORS: Record<AdjustmentType, string> = {
  restock: 'bg-success/20 text-success',
  used: 'bg-error/20 text-error',
  adjustment: 'bg-primary/20 text-primary',
  returned: 'bg-success/20 text-success',
};

const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  filter: 'Filter',
  part: 'Part',
  tool: 'Tool',
  supply: 'Supply',
  equipment: 'Equipment',
};

const CATEGORY_COLORS: Record<InventoryCategory, string> = {
  filter: 'bg-primary/10 text-primary',
  part: 'bg-warning/10 text-warning',
  tool: 'bg-purple-100 text-purple-700',
  supply: 'bg-teal-100 text-teal-700',
  equipment: 'bg-indigo-100 text-indigo-700',
};

function getStatusBadge(item: InventoryItem) {
  const status = getInventoryStatus(item);
  if (status === 'out_of_stock') return { label: 'Out of Stock', style: 'bg-error/20 text-error' };
  if (status === 'low_stock') return { label: 'Low Stock', style: 'bg-warning/20 text-warning' };
  return { label: 'In Stock', style: 'bg-success/20 text-success' };
}

export default function InventoryPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<PageTab>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<StockAdjustment[]>([]);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions' && !transactionsLoaded) {
      loadTransactions();
    }
  }, [activeTab, transactionsLoaded]);

  const loadData = async () => {
    try {
      const [itemsData, statsData] = await Promise.all([
        getAllItems(),
        getInventoryStats(),
      ]);
      setItems(itemsData);
      setStats(statsData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load inventory';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const data = await getAllStockAdjustments(200);
      setTransactions(data);
      setTransactionsLoaded(true);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load transactions';
      toast.error(message);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowFormModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (data: InventoryFormData) => {
    if (!user) return;

    if (editingItem) {
      await updateItem(editingItem.id, data, user.uid);
      toast.success('Item updated');
    } else {
      await createItem({ ...data, createdBy: user.uid });
      toast.success('Item added');
    }

    setShowFormModal(false);
    setEditingItem(null);
    setLoading(true);
    await loadData();
  };

  const handleAdjustStock = async (type: AdjustmentType, quantity: number, reason: string) => {
    if (!user || !adjustingItem) return;

    const name = userData?.displayName || 'Admin';
    await adjustStock(adjustingItem.id, type, quantity, reason, user.uid, name);
    toast.success('Stock adjusted');
    setAdjustingItem(null);
    setTransactionsLoaded(false);
    setLoading(true);
    await loadData();
  };

  const filtered = items.filter((item) => {
    const status = getInventoryStatus(item);
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.supplier.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term)
    );
  });

  const statusCounts = {
    all: items.length,
    in_stock: items.filter((i) => getInventoryStatus(i) === 'in_stock').length,
    low_stock: items.filter((i) => getInventoryStatus(i) === 'low_stock').length,
    out_of_stock: items.filter((i) => getInventoryStatus(i) === 'out_of_stock').length,
  };

  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Inventory</h1>
          <p className="text-text-secondary">
            Manage parts, filters, tools, and supplies
          </p>
        </div>
        {activeTab === 'items' && (
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        )}
      </div>

      {/* Top-level Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-4 py-2 rounded-apple text-sm font-medium transition-all ${
            activeTab === 'items'
              ? 'bg-primary text-white'
              : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Items
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-apple text-sm font-medium transition-all ${
            activeTab === 'transactions'
              ? 'bg-primary text-white'
              : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
          }`}
        >
          <ArrowDownUp className="w-4 h-4" />
          Transactions
        </button>
      </div>

      {/* Items Tab Content */}
      {activeTab === 'items' && (
        <>
          {/* Summary Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="apple-card text-center">
                <Boxes className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-text-tertiary text-sm">Total Items</p>
                <p className="text-3xl font-bold mt-1">{stats.totalItems}</p>
              </div>
              <div className="apple-card text-center">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                <p className="text-text-tertiary text-sm">In Stock</p>
                <p className="text-3xl font-bold mt-1 text-success">{stats.inStock}</p>
              </div>
              <div className="apple-card text-center">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-warning" />
                <p className="text-text-tertiary text-sm">Low Stock</p>
                <p className="text-3xl font-bold mt-1 text-warning">{stats.lowStock}</p>
              </div>
              <div className="apple-card text-center">
                <XCircle className="w-8 h-8 mx-auto mb-2 text-error" />
                <p className="text-text-tertiary text-sm">Out of Stock</p>
                <p className="text-3xl font-bold mt-1 text-error">{stats.outOfStock}</p>
              </div>
              <div className="apple-card text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-text-tertiary text-sm">Total Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalValue, 'BRL')}</p>
              </div>
            </div>
          )}

          {/* Search & Filters */}
          <div className="space-y-4">
            <div className="apple-card">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search by name, SKU, supplier, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                  className="px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2">
              {([
                { label: 'All', value: 'all' as StatusFilter },
                { label: 'In Stock', value: 'in_stock' as StatusFilter },
                { label: 'Low Stock', value: 'low_stock' as StatusFilter },
                { label: 'Out of Stock', value: 'out_of_stock' as StatusFilter },
              ]).map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-4 py-2 rounded-apple text-sm font-medium transition-all ${
                    statusFilter === tab.value
                      ? 'bg-primary text-white'
                      : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.label} ({statusCounts[tab.value]})
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          {filtered.length === 0 ? (
            <div className="apple-card text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
              <h3 className="text-xl font-semibold mb-2">No items found</h3>
              <p className="text-text-secondary">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Add your first inventory item to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const badge = getStatusBadge(item);
                return (
                  <div key={item.id} className="apple-card hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Name + Badges */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-semibold">{item.name}</h3>
                          <span className="font-mono text-xs text-text-tertiary bg-surface-elevated px-2 py-0.5 rounded">
                            {item.sku}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category]}`}>
                            {CATEGORY_LABELS[item.category]}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.style}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-text-tertiary text-xs">Quantity</p>
                            <p className={`font-bold text-lg ${
                              item.quantity <= 0 ? 'text-error' :
                              item.quantity <= item.minQuantity ? 'text-warning' :
                              'text-text-primary'
                            }`}>
                              {item.quantity}
                              <span className="text-xs font-normal text-text-tertiary ml-1">(min: {item.minQuantity})</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-text-tertiary text-xs">Unit Cost</p>
                            <p className="font-medium">{formatCurrency(item.unitCost, item.currency)}</p>
                          </div>
                          <div>
                            <p className="text-text-tertiary text-xs">Supplier</p>
                            <p className="font-medium truncate">{item.supplier || '—'}</p>
                          </div>
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-text-tertiary mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-text-tertiary text-xs">Location</p>
                              <p className="font-medium truncate">{item.location || '—'}</p>
                            </div>
                          </div>
                        </div>

                        {item.description && (
                          <p className="text-sm text-text-secondary mt-2 line-clamp-1">{item.description}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => setAdjustingItem(item)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-surface-elevated border border-border rounded-apple text-sm font-medium hover:border-primary transition-all"
                          title="Adjust stock"
                        >
                          <ArrowUpDown className="w-4 h-4" />
                          Stock
                        </button>
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
                          title="Edit item"
                        >
                          <Pencil className="w-4 h-4 text-text-tertiary" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/inventory/${item.id}`)}
                          className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
                          title="View details"
                        >
                          <ChevronRight className="w-5 h-5 text-text-tertiary" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Transactions Tab Content */}
      {activeTab === 'transactions' && (
        <>
          {/* Type Filter */}
          <div className="flex gap-2 flex-wrap">
            {([
              { label: 'All Types', value: 'all' as TypeFilter },
              { label: 'Restock', value: 'restock' as TypeFilter },
              { label: 'Used', value: 'used' as TypeFilter },
              { label: 'Adjustment', value: 'adjustment' as TypeFilter },
              { label: 'Returned', value: 'returned' as TypeFilter },
            ]).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={`px-4 py-2 rounded-apple text-sm font-medium transition-all ${
                  typeFilter === tab.value
                    ? 'bg-primary text-white'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {transactionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-text-secondary">Loading transactions...</p>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="apple-card text-center py-16">
              <ArrowDownUp className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
              <h3 className="text-xl font-semibold mb-2">No transactions found</h3>
              <p className="text-text-secondary">
                {typeFilter !== 'all'
                  ? 'Try selecting a different type filter'
                  : 'Stock adjustments will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((t) => {
                const isPositive = t.type === 'restock' || t.type === 'returned';
                return (
                  <div key={t.id} className="apple-card hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Type indicator */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isPositive ? 'bg-success/10' : t.type === 'used' ? 'bg-error/10' : 'bg-primary/10'
                        }`}>
                          <ArrowDownUp className={`w-5 h-5 ${
                            isPositive ? 'text-success' : t.type === 'used' ? 'text-error' : 'text-primary'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Item name + type badge */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold truncate">{t.itemName || t.itemId}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[t.type]}`}>
                              {TYPE_LABELS[t.type]}
                            </span>
                          </div>

                          {/* Details row */}
                          <div className="flex items-center gap-4 text-sm text-text-secondary flex-wrap">
                            <span className={`font-bold ${isPositive ? 'text-success' : t.type === 'used' ? 'text-error' : 'text-text-primary'}`}>
                              {t.quantity > 0 ? '+' : ''}{t.quantity}
                            </span>
                            <span className="text-text-tertiary">
                              {t.previousQuantity} → {t.newQuantity}
                            </span>
                            {t.reason && (
                              <span className="truncate max-w-[200px]" title={t.reason}>{t.reason}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side: performer + date */}
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm text-text-secondary justify-end mb-1">
                          <User className="w-3.5 h-3.5" />
                          <span>{t.performedByName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-text-tertiary justify-end">
                          <Clock className="w-3 h-3" />
                          <span>{t.createdAt ? formatDateTime(t.createdAt) : '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showFormModal && (
        <InventoryFormModal
          item={editingItem}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowFormModal(false); setEditingItem(null); }}
        />
      )}
      {adjustingItem && (
        <StockAdjustmentModal
          item={adjustingItem}
          onSubmit={handleAdjustStock}
          onClose={() => setAdjustingItem(null)}
        />
      )}
    </div>
  );
}
