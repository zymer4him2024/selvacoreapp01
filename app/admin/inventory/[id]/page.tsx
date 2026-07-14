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
import { useFeatureAccess } from '@/hooks/useRolePermissions';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import toast from 'react-hot-toast';

const ADJUSTMENT_ICONS: Record<AdjustmentType, typeof Plus> = {
  restock: Plus,
  used: Minus,
  adjustment: RotateCcw,
  returned: Undo2,
};

const ADJUSTMENT_STYLES: Record<AdjustmentType, { color: string; bg: string }> = {
  restock: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  used: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  adjustment: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  returned: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: typeof CheckCircle }> = {
  in_stock: { color: 'var(--brand)', bg: 'var(--brand-tint)', icon: CheckCircle },
  low_stock: { color: 'var(--warn)', bg: 'var(--warn-tint)', icon: AlertTriangle },
  out_of_stock: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: XCircle },
};

export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const { user, userData } = useAuth();
  const { visible, canEdit, loading: accessLoading } = useFeatureAccess('featureInventory');
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useLocaleFormatters();
  const inv = t.admin.inventory;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const CATEGORY_LABELS: Record<string, string> = {
    filter: inv.categoryFilter,
    part: inv.categoryPart,
    tool: inv.categoryTool,
    supply: inv.categorySupply,
    equipment: inv.categoryEquipment,
  };

  const TYPE_LABELS: Record<AdjustmentType, string> = {
    restock: inv.restock,
    used: inv.used,
    adjustment: inv.adjustment,
    returned: inv.returned,
  };

  useEffect(() => {
    if (userData && userData.role !== 'admin' && !accessLoading && !visible) {
      router.replace('/admin');
    }
  }, [userData, router, accessLoading, visible]);

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
        toast.error(inv.itemNotFound);
        router.push('/admin/inventory');
        return;
      }

      setItem(itemData);
      setAdjustments(adjustmentsData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : inv.loadItemError;
      toast.error(message);
      router.push('/admin/inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (data: InventoryFormData) => {
    if (!user || !item) return;
    await updateItem(item.id, data, user.uid);
    toast.success(inv.itemUpdatedShort);
    setShowFormModal(false);
    setLoading(true);
    await loadData();
  };

  const handleAdjustSubmit = async (type: AdjustmentType, quantity: number, reason: string) => {
    if (!user || !item) return;
    const name = userData?.displayName || 'Admin';
    await adjustStock(item.id, type, quantity, reason, user.uid, name);
    toast.success(inv.stockAdjustedShort);
    setShowAdjustModal(false);
    setLoading(true);
    await loadData();
  };

  const handleDelete = async () => {
    if (!user || !item) return;
    if (!confirm(inv.confirmRemove)) return;
    await deleteItem(item.id, user.uid);
    toast.success(inv.itemRemoved);
    router.push('/admin/inventory');
  };

  if (userData && userData.role !== 'admin' && !accessLoading && !visible) return null;

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div className="sc-spinner" />
          <p className="sc-helper">{inv.loadingItem}</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const status = getInventoryStatus(item);
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const statusLabel = status === 'in_stock' ? inv.inStock : status === 'low_stock' ? inv.lowStock : inv.outOfStock;

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => router.push('/admin/inventory')}
            className="sc-cta-ghost"
            style={{ padding: 8, minWidth: 0 }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h1 className="sc-h1">{item.name}</h1>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: 'var(--soft)',
                  background: 'var(--off-paper)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {item.sku}
              </span>
            </div>
            <p className="sc-helper" style={{ marginTop: 4 }}>
              {CATEGORY_LABELS[item.category]} {item.supplier ? inv.fromSupplierFormat.replace('{supplier}', item.supplier) : ''}
            </p>
          </div>
        </div>

        {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowAdjustModal(true)}
            className="sc-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <ArrowUpDown size={16} />
            {inv.adjustStockButton}
          </button>
          <button
            onClick={() => setShowFormModal(true)}
            className="sc-cta-ghost"
            style={{ padding: 10, minWidth: 0 }}
            title={inv.editItemTitle}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: 10,
              background: 'var(--off-paper)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-md)',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; e.currentTarget.style.borderColor = 'var(--hairline)'; }}
            title={inv.removeItemTitle}
          >
            <Trash2 size={16} />
          </button>
        </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="sc-card-static" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: statusConfig.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <StatusIcon size={32} color={statusConfig.color} />
          </div>
          <p style={{ fontSize: 44, fontWeight: 700, color: statusConfig.color, margin: 0 }}>{item.quantity}</p>
          <p className="sc-helper" style={{ marginTop: 4 }}>{inv.unitsInStock}</p>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
            <p style={{ fontSize: 13, margin: 0 }}>
              <span className="sc-helper">{inv.minimumLabel}</span>{' '}
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{item.minQuantity}</span>
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: statusConfig.color }}>{statusLabel}</p>
          </div>
        </div>

        <div className="sc-card-static">
          <h3 className="sc-h2" style={{ marginBottom: 16 }}>{inv.itemDetails}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DollarSign size={20} color="var(--brand)" style={{ flexShrink: 0 }} />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{inv.unitCostLabel}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{formatCurrency(item.unitCost, item.currency)}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <DollarSign size={20} color="var(--brand)" style={{ flexShrink: 0 }} />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{inv.totalValueLabel}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{formatCurrency(item.quantity * item.unitCost, item.currency)}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Package size={20} color="var(--brand)" style={{ flexShrink: 0 }} />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{inv.supplierLabel}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{item.supplier || inv.notSpecified}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MapPin size={20} color="var(--brand)" style={{ flexShrink: 0 }} />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{inv.locationLabel}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{item.location || inv.notSpecified}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sc-card-static">
          <h3 className="sc-h2" style={{ marginBottom: 16 }}>{inv.additionalInfo}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calendar size={20} color="var(--brand)" style={{ flexShrink: 0 }} />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{inv.createdLabel}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{formatDate(item.createdAt, 'long')}</p>
              </div>
            </div>
            {item.lastRestockedAt && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Calendar size={20} color="var(--brand)" style={{ flexShrink: 0 }} />
                <div>
                  <p className="sc-helper" style={{ fontSize: 12 }}>{inv.lastRestockedLabel}</p>
                  <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{formatDate(item.lastRestockedAt, 'long')}</p>
                </div>
              </div>
            )}
            {item.description && (
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
                <p className="sc-helper" style={{ fontSize: 12, marginBottom: 4 }}>{inv.descriptionLabel}</p>
                <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0 }}>{item.description}</p>
              </div>
            )}
            {item.notes && (
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
                <p className="sc-helper" style={{ fontSize: 12, marginBottom: 4 }}>{inv.notesLabel}</p>
                <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0 }}>{item.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="sc-h2">{inv.stockHistory}</h2>

        {adjustments.length === 0 ? (
          <div className="sc-empty">
            <p className="sc-helper">{inv.noAdjustments}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {adjustments.map((adj) => {
              const Icon = ADJUSTMENT_ICONS[adj.type];
              const style = ADJUSTMENT_STYLES[adj.type];
              return (
                <div key={adj.id} className="sc-card-static">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-md)',
                        background: style.bg,
                        color: style.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{TYPE_LABELS[adj.type]}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, color: adj.quantity > 0 ? 'var(--brand)' : '#ef4444' }}>
                          {adj.quantity > 0 ? '+' : ''}{adj.quantity}
                        </span>
                        <span className="sc-helper" style={{ fontSize: 13 }}>
                          ({adj.previousQuantity} → {adj.newQuantity})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--soft)', marginTop: 2 }}>
                        <span>{adj.performedByName}</span>
                        <span>·</span>
                        <span>{formatDate(adj.createdAt, 'short')}</span>
                      </div>
                      {adj.reason && (
                        <p className="sc-helper" style={{ marginTop: 4 }}>{adj.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
