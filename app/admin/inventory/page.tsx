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
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';

type PageTab = 'items' | 'transactions';
type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type CategoryFilter = 'all' | InventoryCategory;
type TypeFilter = 'all' | AdjustmentType;

const TYPE_STYLES: Record<AdjustmentType, { color: string; bg: string }> = {
  restock: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  used: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  adjustment: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  returned: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
};

const CATEGORY_STYLES: Record<InventoryCategory, { color: string; bg: string }> = {
  filter: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  part: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  tool: { color: '#9333ea', bg: 'rgba(147,51,234,0.15)' },
  supply: { color: '#0891b2', bg: 'rgba(8,145,178,0.15)' },
  equipment: { color: '#4f46e5', bg: 'rgba(79,70,229,0.15)' },
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  fontWeight: 600,
  border: `1px solid ${active ? 'var(--brand)' : 'var(--hairline)'}`,
  background: active ? 'var(--brand)' : 'var(--off-paper)',
  color: active ? '#fff' : 'var(--soft)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

const statTileStyle: React.CSSProperties = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  padding: 20,
};

export default function InventoryPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency, formatDateTime } = useLocaleFormatters();
  const inv = t.admin.inventory;

  const TYPE_LABELS: Record<AdjustmentType, string> = {
    restock: inv.restock,
    used: inv.used,
    adjustment: inv.adjustment,
    returned: inv.returned,
  };

  const CATEGORY_LABELS: Record<InventoryCategory, string> = {
    filter: inv.categoryFilter,
    part: inv.categoryPart,
    tool: inv.categoryTool,
    supply: inv.categorySupply,
    equipment: inv.categoryEquipment,
  };

  const getStatusBadge = (item: InventoryItem) => {
    const status = getInventoryStatus(item);
    if (status === 'out_of_stock') return { label: inv.outOfStock, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
    if (status === 'low_stock') return { label: inv.lowStock, color: 'var(--warn)', bg: 'var(--warn-tint)' };
    return { label: inv.inStock, color: 'var(--brand)', bg: 'var(--brand-tint)' };
  };

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
    if (userData && userData.role !== 'admin') {
      router.replace('/admin');
    }
  }, [userData, router]);

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
      const message = error instanceof Error ? error.message : inv.loadInventoryError;
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
      const message = error instanceof Error ? error.message : inv.loadTransactionsError;
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
      toast.success(inv.itemUpdatedShort);
    } else {
      await createItem({ ...data, createdBy: user.uid });
      toast.success(inv.itemAddedShort);
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
    toast.success(inv.stockAdjustedShort);
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

  if (userData && userData.role !== 'admin') return null;

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div className="sc-spinner" />
          <p className="sc-helper">{inv.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="sc-h1" style={{ marginBottom: 8 }}>{inv.title}</h1>
          <p className="sc-helper">{inv.subtitle}</p>
        </div>
        {activeTab === 'items' && (
          <button
            onClick={handleAddItem}
            className="sc-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={18} />
            {inv.addItem}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setActiveTab('items')} style={tabBtnStyle(activeTab === 'items')}>
          <Boxes size={16} />
          {inv.items}
        </button>
        <button onClick={() => setActiveTab('transactions')} style={tabBtnStyle(activeTab === 'transactions')}>
          <ArrowDownUp size={16} />
          {inv.transactions}
        </button>
      </div>

      {activeTab === 'items' && (
        <>
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              <div className="sc-card-static" style={statTileStyle}>
                <Boxes size={28} color="var(--brand)" />
                <p className="sc-helper" style={{ fontSize: 13 }}>{inv.totalItems}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{stats.totalItems}</p>
              </div>
              <div className="sc-card-static" style={statTileStyle}>
                <CheckCircle size={28} color="var(--brand)" />
                <p className="sc-helper" style={{ fontSize: 13 }}>{inv.inStock}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--brand)' }}>{stats.inStock}</p>
              </div>
              <div className="sc-card-static" style={statTileStyle}>
                <AlertTriangle size={28} color="var(--warn)" />
                <p className="sc-helper" style={{ fontSize: 13 }}>{inv.lowStock}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--warn)' }}>{stats.lowStock}</p>
              </div>
              <div className="sc-card-static" style={statTileStyle}>
                <XCircle size={28} color="#ef4444" />
                <p className="sc-helper" style={{ fontSize: 13 }}>{inv.outOfStock}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#ef4444' }}>{stats.outOfStock}</p>
              </div>
              <div className="sc-card-static" style={statTileStyle}>
                <DollarSign size={28} color="var(--brand)" />
                <p className="sc-helper" style={{ fontSize: 13 }}>{inv.totalValue}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>{formatCurrency(stats.totalValue, DEFAULT_CURRENCY)}</p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="sc-card-static">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={20}
                    style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    placeholder={inv.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="sc-input"
                    style={{ paddingLeft: 44 }}
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                  className="sc-select"
                  style={{ minWidth: 160 }}
                >
                  <option value="all">{inv.allCategories}</option>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { label: inv.all, value: 'all' as StatusFilter },
                { label: inv.inStock, value: 'in_stock' as StatusFilter },
                { label: inv.lowStock, value: 'low_stock' as StatusFilter },
                { label: inv.outOfStock, value: 'out_of_stock' as StatusFilter },
              ]).map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  style={tabBtnStyle(statusFilter === tab.value)}
                >
                  {tab.label} ({statusCounts[tab.value]})
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <Package size={56} color="var(--soft)" style={{ margin: '0 auto 16px' }} />
              <h3 className="sc-h2" style={{ marginBottom: 8 }}>{inv.noItems}</h3>
              <p className="sc-helper">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? inv.tryAdjusting
                  : inv.addFirstItem}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((item) => {
                const badge = getStatusBadge(item);
                const catStyle = CATEGORY_STYLES[item.category];
                return (
                  <div key={item.id} className="sc-card-static">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{item.name}</h3>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: 'var(--soft)',
                              background: 'var(--off-paper)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {item.sku}
                          </span>
                          <span
                            style={{
                              padding: '2px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 11,
                              fontWeight: 600,
                              color: catStyle.color,
                              background: catStyle.bg,
                            }}
                          >
                            {CATEGORY_LABELS[item.category]}
                          </span>
                          <span
                            style={{
                              padding: '2px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 11,
                              fontWeight: 600,
                              color: badge.color,
                              background: badge.bg,
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                          <div>
                            <p className="sc-helper" style={{ fontSize: 11 }}>{inv.quantityLabel}</p>
                            <p style={{
                              fontWeight: 700,
                              fontSize: 18,
                              margin: 0,
                              color:
                                item.quantity <= 0 ? '#ef4444' :
                                item.quantity <= item.minQuantity ? 'var(--warn)' :
                                'var(--ink)',
                            }}>
                              {item.quantity}
                              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--soft)', marginLeft: 4 }}>
                                ({inv.minPrefix} {item.minQuantity})
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="sc-helper" style={{ fontSize: 11 }}>{inv.unitCostLabel}</p>
                            <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, fontSize: 14 }}>{formatCurrency(item.unitCost, item.currency)}</p>
                          </div>
                          <div>
                            <p className="sc-helper" style={{ fontSize: 11 }}>{inv.supplierLabel}</p>
                            <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.supplier || '—'}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                            <MapPin size={14} color="var(--soft)" style={{ marginTop: 2, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <p className="sc-helper" style={{ fontSize: 11 }}>{inv.locationLabel}</p>
                              <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.location || '—'}</p>
                            </div>
                          </div>
                        </div>

                        {item.description && (
                          <p className="sc-helper" style={{ marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => setAdjustingItem(item)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            background: 'var(--off-paper)',
                            border: '1px solid var(--hairline)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--ink)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hairline)'; }}
                          title={inv.adjustStock}
                        >
                          <ArrowUpDown size={14} />
                          {inv.stockButton}
                        </button>
                        <button
                          onClick={() => handleEditItem(item)}
                          style={{
                            padding: 8,
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: 'var(--soft)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          title={inv.editItemTitle}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/inventory/${item.id}`)}
                          style={{
                            padding: 8,
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            color: 'var(--soft)',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          title={inv.viewDetails}
                        >
                          <ChevronRight size={18} />
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

      {activeTab === 'transactions' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { label: inv.allTypes, value: 'all' as TypeFilter },
              { label: inv.restock, value: 'restock' as TypeFilter },
              { label: inv.used, value: 'used' as TypeFilter },
              { label: inv.adjustment, value: 'adjustment' as TypeFilter },
              { label: inv.returned, value: 'returned' as TypeFilter },
            ]).map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                style={tabBtnStyle(typeFilter === tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {transactionsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div className="sc-spinner" />
                <p className="sc-helper">{inv.loadingTransactions}</p>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <ArrowDownUp size={56} color="var(--soft)" style={{ margin: '0 auto 16px' }} />
              <h3 className="sc-h2" style={{ marginBottom: 8 }}>{inv.noTransactions}</h3>
              <p className="sc-helper">
                {typeFilter !== 'all' ? inv.tryDifferentType : inv.adjustmentsAppearHere}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTransactions.map((t) => {
                const isPositive = t.type === 'restock' || t.type === 'returned';
                const typeStyle = TYPE_STYLES[t.type];
                const deltaColor = isPositive ? 'var(--brand)' : t.type === 'used' ? '#ef4444' : 'var(--ink)';
                return (
                  <div key={t.id} className="sc-card-static">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background: typeStyle.bg,
                            color: typeStyle.color,
                          }}
                        >
                          <ArrowDownUp size={18} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <h3 style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.itemName || t.itemId}
                            </h3>
                            <span
                              style={{
                                padding: '2px 10px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 11,
                                fontWeight: 600,
                                color: typeStyle.color,
                                background: typeStyle.bg,
                              }}
                            >
                              {TYPE_LABELS[t.type]}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--soft)', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: deltaColor }}>
                              {t.quantity > 0 ? '+' : ''}{t.quantity}
                            </span>
                            <span>{t.previousQuantity} → {t.newQuantity}</span>
                            {t.reason && (
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={t.reason}>
                                {t.reason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--soft)', justifyContent: 'flex-end', marginBottom: 2 }}>
                          <User size={14} />
                          <span>{t.performedByName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--soft)', justifyContent: 'flex-end' }}>
                          <Clock size={12} />
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
