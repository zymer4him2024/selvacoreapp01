'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Filter,
  ShoppingCart,
  Wrench,
  CalendarClock,
  Activity,
  Search,
  User,
  Phone,
  MapPin,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { Transaction, Order, Device } from '@/types';
import { getTransactionsPaginated, deleteTransaction } from '@/lib/services/transactionService';
import { getOrdersPaginated, getAllOrders, deleteOrder } from '@/lib/services/orderService';
import { getAllDevices } from '@/lib/services/deviceService';
import {
  getMaintenanceSummaryStats,
  getSchedulesByDeviceId,
  MaintenanceSummaryStats,
} from '@/lib/services/maintenanceService';
import { MaintenanceSchedule } from '@/types/device';
import { formatOptionalString, getOrderStatusLabel } from '@/lib/utils/formatters';
import { QueryDocumentSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureAccess } from '@/hooks/useRolePermissions';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

type MainTab = 'orders' | 'installation' | 'maintenance' | 'activity';
type InstallationSubTab = 'all' | 'accepted' | 'in_progress' | 'completed';
type MaintenanceFilter = 'all' | 'overdue' | 'due_week' | 'ok';

const PAGE_SIZE = 50;

const ORDER_STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  pending: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  accepted: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  in_progress: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  completed: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  refunded: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

function getOrderStatusStyle(status: string): { color: string; bg: string } {
  return ORDER_STATUS_STYLES[status] || { color: 'var(--soft)', bg: 'var(--off-paper)' };
}

function maxTs(...vals: (Timestamp | null | undefined)[]): Timestamp | null {
  let best: Timestamp | null = null;
  for (const v of vals) {
    if (!v) continue;
    if (!best || v.toMillis() > best.toMillis()) best = v;
  }
  return best;
}

function minTs(...vals: (Timestamp | null | undefined)[]): Timestamp | null {
  let best: Timestamp | null = null;
  for (const v of vals) {
    if (!v) continue;
    if (!best || v.toMillis() < best.toMillis()) best = v;
  }
  return best;
}

function daysUntil(ts: Timestamp | null): number | null {
  if (!ts) return null;
  const ms = ts.toMillis() - Date.now();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getInstallationStatusLabel(status: string, tr: { subtabScheduled: string; subtabInProgress: string; subtabInstalled: string }): string {
  switch (status) {
    case 'accepted':
      return tr.subtabScheduled;
    case 'in_progress':
      return tr.subtabInProgress;
    case 'completed':
      return tr.subtabInstalled;
    default:
      return status;
  }
}

function getTxTypeColor(type: string): string {
  if (type.includes('payment') || type.includes('completed')) return 'var(--brand)';
  if (type.includes('cancelled') || type.includes('refund')) return '#ef4444';
  if (type.includes('accepted') || type.includes('created')) return 'var(--brand)';
  return 'var(--soft)';
}

function getTxTypeIcon(type: string): string {
  if (type.includes('payment')) return '$';
  if (type.includes('order')) return '#';
  if (type.includes('product')) return '@';
  if (type.includes('service')) return '~';
  if (type.includes('refund')) return '<';
  if (type.includes('maintenance')) return '+';
  if (type.includes('device')) return '*';
  return '·';
}

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

const pillStyle = (color: string, bg: string): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 'var(--radius-full)',
  fontSize: 11,
  fontWeight: 600,
  color,
  background: bg,
  whiteSpace: 'nowrap',
});

export default function TransactionsPage() {
  const { t } = useTranslation();
  const { userData } = useAuth();
  const { visible, loading: accessLoading } = useFeatureAccess('featureTransactions');
  const router = useRouter();
  const tr = t.admin.transactions;
  const [activeTab, setActiveTab] = useState<MainTab>('orders');

  useEffect(() => {
    if (userData && userData.role !== 'admin' && !accessLoading && !visible) {
      router.replace('/admin');
    }
  }, [userData, router, accessLoading, visible]);

  const [summary, setSummary] = useState({
    totalOrders: 0,
    revenue: 0,
    activeInstallations: 0,
    completedInstallations: 0,
    devicesUnderMaintenance: 0,
    overdueMaintenance: 0,
    upcomingWeek: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const [allOrders, maintStats]: [Order[], MaintenanceSummaryStats] =
        await Promise.all([getAllOrders(), getMaintenanceSummaryStats()]);

      const revenue = allOrders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
        .reduce((sum, o) => sum + (o.payment?.amount || 0), 0);

      const active = allOrders.filter(
        (o) => o.status === 'accepted' || o.status === 'in_progress'
      ).length;

      const completed = allOrders.filter((o) => o.status === 'completed').length;

      setSummary({
        totalOrders: allOrders.length,
        revenue,
        activeInstallations: active,
        completedInstallations: completed,
        devicesUnderMaintenance: maintStats.totalDevices,
        overdueMaintenance: maintStats.overdueCount,
        upcomingWeek: maintStats.upcomingThisWeek,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : tr.loadSummaryError;
      toast.error(message);
    } finally {
      setSummaryLoading(false);
    }
  }, [tr.loadSummaryError]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (userData && userData.role !== 'admin' && !accessLoading && !visible) return null;

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="sc-h1" style={{ marginBottom: 8 }}>{tr.title}</h1>
        <p className="sc-helper">{tr.pageSubtitle}</p>
      </div>

      <SummaryHeader summary={summary} loading={summaryLoading} />

      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--hairline)', overflowX: 'auto', flexWrap: 'wrap' }}>
        <TabButton
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
          icon={<ShoppingCart size={16} />}
          label={tr.tabOrders}
        />
        <TabButton
          active={activeTab === 'installation'}
          onClick={() => setActiveTab('installation')}
          icon={<Wrench size={16} />}
          label={tr.tabInstallation}
        />
        <TabButton
          active={activeTab === 'maintenance'}
          onClick={() => setActiveTab('maintenance')}
          icon={<CalendarClock size={16} />}
          label={tr.tabMaintenance}
          badge={summary.overdueMaintenance > 0 ? summary.overdueMaintenance : undefined}
        />
        <TabButton
          active={activeTab === 'activity'}
          onClick={() => setActiveTab('activity')}
          icon={<Activity size={16} />}
          label={tr.tabActivityLog}
        />
      </div>

      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'installation' && <InstallationTab />}
      {activeTab === 'maintenance' && <MaintenanceTab />}
      {activeTab === 'activity' && <ActivityTab />}
    </div>
  );
}

function SummaryHeader({
  summary,
  loading,
}: {
  summary: {
    totalOrders: number;
    revenue: number;
    activeInstallations: number;
    completedInstallations: number;
    devicesUnderMaintenance: number;
    overdueMaintenance: number;
    upcomingWeek: number;
  };
  loading: boolean;
}) {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const { formatCurrency } = useLocaleFormatters();
  const cards = [
    {
      label: tr.summaryTotalOrders,
      value: loading ? '—' : summary.totalOrders.toString(),
      subtitle: loading ? '' : formatCurrency(summary.revenue, 'USD'),
      icon: <ShoppingCart size={18} color="var(--brand)" />,
      isError: false,
    },
    {
      label: tr.summaryActiveInstallations,
      value: loading ? '—' : summary.activeInstallations.toString(),
      subtitle: tr.summaryAcceptedInProgress,
      icon: <Wrench size={18} color="var(--brand)" />,
      isError: false,
    },
    {
      label: tr.summaryCompleted,
      value: loading ? '—' : summary.completedInstallations.toString(),
      subtitle: tr.summaryAllTime,
      icon: <CheckCircle2 size={18} color="var(--brand)" />,
      isError: false,
    },
    {
      label: tr.summaryDevices,
      value: loading ? '—' : summary.devicesUnderMaintenance.toString(),
      subtitle: tr.summaryUnderMaintenance,
      icon: <TrendingUp size={18} color="var(--brand)" />,
      isError: false,
    },
    {
      label: tr.summaryOverdue,
      value: loading ? '—' : summary.overdueMaintenance.toString(),
      subtitle: summary.overdueMaintenance > 0 ? tr.summaryNeedsAttention : tr.summaryAllCaughtUp,
      icon: <AlertTriangle size={18} color={summary.overdueMaintenance > 0 ? '#ef4444' : 'var(--soft)'} />,
      isError: summary.overdueMaintenance > 0,
    },
    {
      label: tr.summaryDueThisWeek,
      value: loading ? '—' : summary.upcomingWeek.toString(),
      subtitle: tr.summaryUpcoming,
      icon: <Clock size={18} color="var(--warn)" />,
      isError: false,
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {cards.map((c) => (
        <div
          key={c.label}
          className="sc-card-static"
          style={c.isError ? { borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' } : undefined}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)' }}>{c.label}</span>
            {c.icon}
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{c.value}</p>
          {c.subtitle && (
            <p className="sc-helper" style={{ fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 20px',
        fontWeight: 600,
        fontSize: 14,
        borderBottom: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
        background: 'transparent',
        border: 'none',
        borderBottomWidth: 2,
        borderBottomStyle: 'solid',
        borderBottomColor: active ? 'var(--brand)' : 'transparent',
        color: active ? 'var(--brand)' : 'var(--soft)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            marginLeft: 4,
            padding: '2px 8px',
            fontSize: 11,
            borderRadius: 'var(--radius-full)',
            background: '#ef4444',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function OrdersTab() {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const load = useCallback(async (reset: boolean) => {
    try {
      if (reset) {
        setLoading(true);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }
      const result = await getOrdersPaginated(
        PAGE_SIZE,
        reset ? null : lastDocRef.current,
        statusFilter
      );
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
      setOrders((prev) => (reset ? result.items : [...prev, ...result.items]));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr.loadOrdersError;
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter, tr.loadOrdersError]);

  useEffect(() => {
    load(true);
  }, [load]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(s) ||
      o.customerInfo?.name?.toLowerCase().includes(s) ||
      o.customerInfo?.email?.toLowerCase().includes(s)
    );
  });

  const handleDelete = async (orderId: string) => {
    if (!confirm(tr.confirmDeleteOrder)) return;
    try {
      setDeletingId(orderId);
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success(tr.orderDeleted);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr.deleteOrderError;
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={tr.searchOrdersPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sc-input"
            style={{ paddingLeft: 40 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--off-paper)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)' }}>
          <Filter size={16} color="var(--soft)" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', padding: '10px 0', cursor: 'pointer' }}
          >
            <option value="all">{tr.statusFilterAll}</option>
            <option value="pending">{tr.statusPending}</option>
            <option value="accepted">{tr.statusAccepted}</option>
            <option value="in_progress">{tr.statusInProgress}</option>
            <option value="completed">{tr.statusCompleted}</option>
            <option value="cancelled">{tr.statusCancelled}</option>
            <option value="refunded">{tr.statusRefunded}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ShoppingCart size={40} />} title={tr.noOrdersFound} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onDelete={handleDelete} deleting={deletingId === order.id} />
          ))}
          {hasMore && (
            <div style={{ textAlign: 'center', paddingTop: 16 }}>
              <button onClick={() => load(false)} disabled={loadingMore} className="sc-cta-ghost">
                {loadingMore ? tr.loadingMore : tr.loadMore}
              </button>
            </div>
          )}
          <p className="sc-helper" style={{ textAlign: 'center', fontSize: 11 }}>
            {tr.showingFormat.replace('{shown}', String(filtered.length)).replace('{total}', String(orders.length))}{hasMore ? tr.moreAvailableSuffix : ''}
          </p>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onDelete, deleting }: { order: Order; onDelete?: (id: string) => void; deleting?: boolean }) {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const { formatCurrency, formatDate } = useLocaleFormatters();
  const isCancelledOrRefunded = order.status === 'cancelled' || order.status === 'refunded';
  const statusStyle = getOrderStatusStyle(order.status);
  return (
    <Link
      href={`/admin/orders/${order.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        className="sc-card-static"
        style={isCancelledOrRefunded ? { borderColor: 'rgba(239,68,68,0.3)' } : undefined}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{order.orderNumber}</span>
              <span style={pillStyle(statusStyle.color, statusStyle.bg)}>
                {getOrderStatusLabel(order.status, 'admin', t).toUpperCase()}
              </span>
              {order.payment?.status && (
                <span style={{ padding: '2px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', background: 'var(--off-paper)', color: 'var(--soft)' }}>
                  {tr.paymentLabel} {order.payment.status}
                </span>
              )}
            </div>

            <p className="sc-helper" style={{ margin: 0 }}>
              {order.productSnapshot?.name?.en || tr.naLabel} — {order.serviceSnapshot?.name?.en || tr.naLabel}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--soft)' }}>
                <User size={14} color="var(--soft)" />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>{formatOptionalString(order.customerInfo?.name)}</p>
                  <p style={{ margin: 0, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customerInfo?.email || ''}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--soft)' }}>
                <CalendarClock size={14} color="var(--soft)" />
                <span>
                  {order.installationDate
                    ? `${formatDate(order.installationDate, 'short')}${order.timeSlot ? ' · ' + order.timeSlot : ''}`
                    : tr.notScheduled}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--soft)' }}>
                <Phone size={14} color="var(--soft)" />
                <span>{formatOptionalString(order.customerInfo?.phone)}</span>
              </div>
            </div>

            {order.cancellation?.reason && (
              <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                {tr.cancelledPrefix} {order.cancellation.reason}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ textAlign: 'right', minWidth: 120 }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand)', margin: 0 }}>
                {order.payment?.amount
                  ? formatCurrency(order.payment.amount, order.payment.currency)
                  : tr.naLabel}
              </p>
              <p className="sc-helper" style={{ fontSize: 11, marginTop: 4 }}>
                {tr.createdPrefix} {order.createdAt ? formatDate(order.createdAt, 'short') : tr.naLabel}
              </p>
            </div>
            {onDelete && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(order.id); }}
                disabled={deleting}
                style={{
                  padding: 8,
                  background: 'var(--off-paper)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--soft)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; e.currentTarget.style.color = 'var(--soft)'; }}
                aria-label={tr.deleteOrderAria}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function InstallationTab() {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const [subTab, setSubTab] = useState<InstallationSubTab>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const load = useCallback(async (reset: boolean) => {
    try {
      if (reset) {
        setLoading(true);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }
      const filter = subTab === 'all' ? 'all' : subTab;
      const result = await getOrdersPaginated(
        PAGE_SIZE,
        reset ? null : lastDocRef.current,
        filter
      );
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);

      const relevant = result.items.filter(
        (o) =>
          o.technicianId &&
          (o.status === 'accepted' ||
            o.status === 'in_progress' ||
            o.status === 'completed')
      );

      setOrders((prev) => (reset ? relevant : [...prev, ...relevant]));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr.loadInstallationsError;
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [subTab, tr.loadInstallationsError]);

  useEffect(() => {
    load(true);
  }, [load]);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.orderNumber?.toLowerCase().includes(s) ||
      o.technicianInfo?.name?.toLowerCase().includes(s) ||
      o.customerInfo?.name?.toLowerCase().includes(s) ||
      o.installationAddress?.city?.toLowerCase().includes(s)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'accepted', 'in_progress', 'completed'] as InstallationSubTab[]).map((tab) => (
          <button key={tab} onClick={() => setSubTab(tab)} style={tabBtnStyle(subTab === tab)}>
            {tab === 'all'
              ? tr.subtabAll
              : tab === 'accepted'
              ? tr.subtabScheduled
              : tab === 'in_progress'
              ? tr.subtabInProgress
              : tr.subtabInstalled}
          </button>
        ))}
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={tr.searchInstallationPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sc-input"
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Wrench size={40} />} title={tr.noInstallations} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((order) => (
            <InstallationCard key={order.id} order={order} />
          ))}
          {hasMore && (
            <div style={{ textAlign: 'center', paddingTop: 16 }}>
              <button onClick={() => load(false)} disabled={loadingMore} className="sc-cta-ghost">
                {loadingMore ? tr.loadingMore : tr.loadMore}
              </button>
            </div>
          )}
          <p className="sc-helper" style={{ textAlign: 'center', fontSize: 11 }}>
            {filtered.length === 1
              ? tr.installationShownOne
              : tr.installationsShownFormat.replace('{count}', String(filtered.length))}
          </p>
        </div>
      )}
    </div>
  );
}

function InstallationCard({ order }: { order: Order }) {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const { formatDate, formatDateTime } = useLocaleFormatters();
  const photoCount = order.installationPhotos?.length || 0;
  const statusLabel = getInstallationStatusLabel(order.status, tr);
  const statusStyle = getOrderStatusStyle(order.status);

  const timestampForStatus = () => {
    if (order.status === 'in_progress' && order.startedAt) {
      return tr.startedFormat.replace('{time}', formatDateTime(order.startedAt));
    }
    if (order.status === 'completed' && order.completedAt) {
      return tr.finishedFormat.replace('{time}', formatDateTime(order.completedAt));
    }
    return order.installationDate
      ? tr.scheduledFormat.replace('{date}', `${formatDate(order.installationDate, 'short')}${order.timeSlot ? ' · ' + order.timeSlot : ''}`)
      : '';
  };

  return (
    <div className="sc-card-static">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
          {order.technicianInfo?.photo ? (
            <img
              src={order.technicianInfo.photo}
              alt={order.technicianInfo.name}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color="var(--brand)" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatOptionalString(order.technicianInfo?.name)}
            </p>
            <p className="sc-helper" style={{ fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.technicianInfo?.phone || ''}
              {order.technicianInfo?.rating ? ` · ${order.technicianInfo.rating.toFixed(1)}★` : ''}
            </p>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Link
              href={`/admin/orders/${order.id}`}
              style={{ color: 'var(--brand)', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
            >
              {order.orderNumber}
            </Link>
            <span style={pillStyle(statusStyle.color, statusStyle.bg)}>{statusLabel}</span>
            {photoCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', background: 'var(--brand-tint)', color: 'var(--brand)' }}>
                <ImageIcon size={12} />
                {photoCount}
              </span>
            )}
          </div>
          <p className="sc-helper" style={{ margin: 0 }}>
            {formatOptionalString(order.customerInfo?.name)} — {order.productSnapshot?.name?.en || tr.naLabel}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--soft)' }}>
            <MapPin size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order.installationAddress?.street}, {order.installationAddress?.city}
              {order.installationAddress?.state ? `, ${order.installationAddress.state}` : ''}
            </span>
          </div>
          <p className="sc-helper" style={{ fontSize: 11, margin: 0 }}>{timestampForStatus()}</p>
        </div>
      </div>
    </div>
  );
}

interface DeviceWithMaintenance {
  device: Device;
  schedules: MaintenanceSchedule[];
  lastMaintenance: Timestamp | null;
  nextMaintenance: Timestamp | null;
  escalationLevel: number;
}

function MaintenanceTab() {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const [items, setItems] = useState<DeviceWithMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MaintenanceFilter>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const devices = await getAllDevices();

      const enriched = await Promise.all(
        devices.map(async (device): Promise<DeviceWithMaintenance> => {
          const schedules = await getSchedulesByDeviceId(device.id);
          const lastMaintenance = maxTs(
            device.lastEzerMaintenanceAt,
            device.lastFilterReplacementAt
          );
          const nextMaintenance = minTs(
            device.nextEzerMaintenanceDue,
            device.nextFilterReplacementDue,
            ...schedules.map((s) => s.nextDueDate)
          );
          const escalationLevel = schedules.reduce(
            (max, s) => Math.max(max, s.escalationLevel || 0),
            0
          );
          return { device, schedules, lastMaintenance, nextMaintenance, escalationLevel };
        })
      );

      enriched.sort((a, b) => {
        const aDays = daysUntil(a.nextMaintenance) ?? Infinity;
        const bDays = daysUntil(b.nextMaintenance) ?? Infinity;
        return aDays - bDays;
      });

      setItems(enriched);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr.loadMaintenanceError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [tr.loadMaintenanceError]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((it) => {
    const days = daysUntil(it.nextMaintenance);
    if (filter === 'overdue' && (days === null || days >= 0)) return false;
    if (filter === 'due_week' && (days === null || days < 0 || days > 7)) return false;
    if (filter === 'ok' && (days === null || days <= 7)) return false;

    if (search) {
      const s = search.toLowerCase();
      return (
        it.device.customerInfo?.name?.toLowerCase().includes(s) ||
        it.device.installationAddress?.city?.toLowerCase().includes(s) ||
        it.device.installationAddress?.street?.toLowerCase().includes(s) ||
        it.device.qrCodeData?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'overdue', 'due_week', 'ok'] as MaintenanceFilter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={tabBtnStyle(filter === f)}>
            {f === 'all'
              ? tr.maintFilterAll
              : f === 'overdue'
              ? tr.maintFilterOverdue
              : f === 'due_week'
              ? tr.maintFilterDueWeek
              : tr.maintFilterOk}
          </button>
        ))}
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={tr.searchMaintenancePlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sc-input"
            style={{ paddingLeft: 40 }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={40} />}
          title={filter === 'overdue' ? tr.emptyAllCaughtUp : tr.emptyNoDevices}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((item) => (
            <MaintenanceCard key={item.device.id} item={item} />
          ))}
          <p className="sc-helper" style={{ textAlign: 'center', fontSize: 11 }}>
            {filtered.length === 1
              ? tr.deviceShownOne
              : tr.devicesShownFormat.replace('{count}', String(filtered.length))}
          </p>
        </div>
      )}
    </div>
  );
}

function MaintenanceCard({ item }: { item: DeviceWithMaintenance }) {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const { formatDate } = useLocaleFormatters();
  const days = daysUntil(item.nextMaintenance);
  const isOverdue = days !== null && days < 0;
  const isDueSoon = days !== null && days >= 0 && days <= 7;

  let statusBadge = (
    <span style={{ padding: '2px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', background: 'var(--brand-tint)', color: 'var(--brand)' }}>
      {tr.maintStatusOk}
    </span>
  );
  if (isOverdue) {
    statusBadge = (
      <span style={{ padding: '2px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 600 }}>
        {tr.maintStatusOverdueFormat.replace('{days}', String(Math.abs(days!)))}
      </span>
    );
  } else if (isDueSoon) {
    statusBadge = (
      <span style={{ padding: '2px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', background: 'var(--warn-tint)', color: 'var(--warn)' }}>
        {tr.maintStatusDueInFormat.replace('{days}', String(days))}
      </span>
    );
  }

  return (
    <div className="sc-card-static" style={isOverdue ? { borderLeft: '4px solid #ef4444' } : undefined}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
              {formatOptionalString(item.device.customerInfo?.name)}
            </span>
            {statusBadge}
            {item.escalationLevel > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11, borderRadius: 'var(--radius-sm)', background: 'var(--warn-tint)', color: 'var(--warn)' }}>
                <AlertTriangle size={12} />
                {tr.escalationLevelFormat.replace('{level}', String(item.escalationLevel))}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--soft)' }}>
            <MapPin size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.device.installationAddress?.street}, {item.device.installationAddress?.city}
              {item.device.installationAddress?.state ? `, ${item.device.installationAddress.state}` : ''}
            </span>
          </div>
          <p className="sc-helper" style={{ fontSize: 11, margin: 0 }}>
            {item.device.productSnapshot?.name?.en || tr.summaryDevices} · {item.device.qrCodeData}
          </p>
        </div>

        <div style={{ minWidth: 160, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p className="sc-helper" style={{ fontSize: 11, margin: 0 }}>{tr.technicianLabel}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={14} color="var(--brand)" />
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.device.technicianId ? item.device.technicianId.slice(0, 8) + '...' : tr.naLabel}
            </p>
          </div>
        </div>

        <div style={{ minWidth: 180, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11 }}>
          <div>
            <p className="sc-helper" style={{ fontSize: 11, margin: 0 }}>{tr.lastLabel}</p>
            <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              {item.lastMaintenance ? formatDate(item.lastMaintenance, 'short') : tr.neverLabel}
            </p>
          </div>
          <div>
            <p className="sc-helper" style={{ fontSize: 11, margin: 0 }}>{tr.nextLabel}</p>
            <p style={{ fontWeight: 600, color: isOverdue ? '#ef4444' : 'var(--ink)', margin: 0 }}>
              {item.nextMaintenance ? formatDate(item.nextMaintenance, 'short') : tr.naLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityTab() {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const { formatCurrency, formatDateTime } = useLocaleFormatters();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const load = useCallback(async (reset: boolean) => {
    try {
      if (reset) {
        setLoading(true);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }
      const result = await getTransactionsPaginated(
        PAGE_SIZE,
        reset ? null : lastDocRef.current,
        typeFilter
      );
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
      setTransactions((prev) => (reset ? result.items : [...prev, ...result.items]));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr.loadTransactionsError;
      toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [typeFilter, tr.loadTransactionsError]);

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm(tr.confirmDeleteTransaction)) return;
    try {
      setDeletingId(txId);
      await deleteTransaction(txId);
      setTransactions(prev => prev.filter(tx => tx.id !== txId));
      toast.success(tr.transactionDeleted);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tr.deleteTransactionError;
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    load(true);
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--off-paper)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)', maxWidth: 480 }}>
        <Filter size={16} color="var(--soft)" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', padding: '10px 0', cursor: 'pointer' }}
        >
          <option value="all">{tr.allTypes}</option>
          <option value="order_created">{tr.orderCreated}</option>
          <option value="payment_received">{tr.paymentReceived}</option>
          <option value="order_accepted">{tr.orderAccepted}</option>
          <option value="order_completed">{tr.orderCompleted}</option>
          <option value="order_cancelled">{tr.orderCancelled}</option>
          <option value="refund_issued">{tr.refundIssued}</option>
          <option value="product_created">{tr.productCreated}</option>
          <option value="service_created">{tr.serviceCreated}</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : transactions.length === 0 ? (
        <EmptyState icon={<Receipt size={40} />} title={tr.noTransactions} />
      ) : (
        <div className="sc-card-static" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--soft)' }}>{tr.type}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--soft)' }}>{tr.orderNumber}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--soft)' }}>{tr.amount}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--soft)' }}>{tr.performedBy}</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--soft)' }}>{tr.timestamp}</th>
                  <th style={{ padding: '12px 16px', width: 48 }}></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr
                    key={tx.id}
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hairline)', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, fontFamily: 'monospace', color: 'var(--soft)' }}>{getTxTypeIcon(tx.type)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: getTxTypeColor(tx.type) }}>
                          {tx.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: 16 }}>
                      {tx.orderNumber ? (
                        <Link href={`/admin/orders/${tx.orderId}`} style={{ color: 'var(--brand)', fontSize: 13, textDecoration: 'none' }}>
                          {tx.orderNumber}
                        </Link>
                      ) : (
                        <span className="sc-helper" style={{ fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 16 }}>
                      {tx.amount ? (
                        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{formatCurrency(tx.amount, tx.currency)}</span>
                      ) : (
                        <span className="sc-helper" style={{ fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: 16 }}>
                      <div>
                        <p style={{ fontSize: 13, color: 'var(--ink)', margin: 0 }}>{tx.performedByRole}</p>
                        <p className="sc-helper" style={{ fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                          {tx.performedBy}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: 16 }}>
                      <span style={{ fontSize: 13, color: 'var(--soft)' }}>{formatDateTime(tx.timestamp)}</span>
                    </td>
                    <td style={{ padding: 16 }}>
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        disabled={deletingId === tx.id}
                        style={{
                          padding: 6,
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--soft)',
                          cursor: 'pointer',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--soft)'; }}
                        aria-label={tr.deleteTransactionAria}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div style={{ padding: 24, textAlign: 'center', borderTop: '1px solid var(--hairline)' }}>
              <button onClick={() => load(false)} disabled={loadingMore} className="sc-cta-ghost">
                {loadingMore ? tr.loadingMore : tr.loadMore}
              </button>
            </div>
          )}
          <div style={{ padding: '16px 24px', textAlign: 'center', fontSize: 13, color: 'var(--soft)', borderTop: '1px solid var(--hairline)' }}>
            {tr.showing} {transactions.length} {tr.transactions}
            {hasMore ? ' (more available)' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '30vh' }}>
      <div className="sc-spinner" />
    </div>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ color: 'var(--soft)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <h3 className="sc-h2" style={{ marginBottom: 4 }}>{title}</h3>
    </div>
  );
}
