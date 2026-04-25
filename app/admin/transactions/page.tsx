'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
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
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

type MainTab = 'orders' | 'installation' | 'maintenance' | 'activity';
type InstallationSubTab = 'all' | 'accepted' | 'in_progress' | 'completed';
type MaintenanceFilter = 'all' | 'overdue' | 'due_week' | 'ok';

const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

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

function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-warning/10 text-warning';
    case 'accepted':
      return 'bg-primary/10 text-primary';
    case 'in_progress':
      return 'bg-secondary/10 text-secondary';
    case 'completed':
      return 'bg-success/10 text-success';
    case 'cancelled':
      return 'bg-error/10 text-error';
    case 'refunded':
      return 'bg-error/10 text-error';
    default:
      return 'bg-surface-elevated text-text-secondary';
  }
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
  if (type.includes('payment') || type.includes('completed')) return 'text-success';
  if (type.includes('cancelled') || type.includes('refund')) return 'text-error';
  if (type.includes('accepted') || type.includes('created')) return 'text-primary';
  return 'text-text-secondary';
}

function getTxTypeIcon(type: string): string {
  if (type.includes('payment')) return '💰';
  if (type.includes('order')) return '📦';
  if (type.includes('product')) return '🎁';
  if (type.includes('service')) return '🔧';
  if (type.includes('refund')) return '💸';
  if (type.includes('maintenance')) return '🛠️';
  if (type.includes('device')) return '📱';
  return '📋';
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { t } = useTranslation();
  const tr = t.admin.transactions;
  const [activeTab, setActiveTab] = useState<MainTab>('orders');

  // Summary stats (header)
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{tr.title}</h1>
        <p className="text-text-secondary">
          {tr.pageSubtitle}
        </p>
      </div>

      {/* Summary stats */}
      <SummaryHeader summary={summary} loading={summaryLoading} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        <TabButton
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
          icon={<ShoppingCart className="w-4 h-4" />}
          label={tr.tabOrders}
        />
        <TabButton
          active={activeTab === 'installation'}
          onClick={() => setActiveTab('installation')}
          icon={<Wrench className="w-4 h-4" />}
          label={tr.tabInstallation}
        />
        <TabButton
          active={activeTab === 'maintenance'}
          onClick={() => setActiveTab('maintenance')}
          icon={<CalendarClock className="w-4 h-4" />}
          label={tr.tabMaintenance}
          badge={summary.overdueMaintenance > 0 ? summary.overdueMaintenance : undefined}
        />
        <TabButton
          active={activeTab === 'activity'}
          onClick={() => setActiveTab('activity')}
          icon={<Activity className="w-4 h-4" />}
          label={tr.tabActivityLog}
        />
      </div>

      {/* Tab content */}
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'installation' && <InstallationTab />}
      {activeTab === 'maintenance' && <MaintenanceTab />}
      {activeTab === 'activity' && <ActivityTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Summary header
// ─────────────────────────────────────────────────────────────

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
      icon: <ShoppingCart className="w-5 h-5 text-primary" />,
      tone: 'primary',
    },
    {
      label: tr.summaryActiveInstallations,
      value: loading ? '—' : summary.activeInstallations.toString(),
      subtitle: tr.summaryAcceptedInProgress,
      icon: <Wrench className="w-5 h-5 text-secondary" />,
      tone: 'secondary',
    },
    {
      label: tr.summaryCompleted,
      value: loading ? '—' : summary.completedInstallations.toString(),
      subtitle: tr.summaryAllTime,
      icon: <CheckCircle2 className="w-5 h-5 text-success" />,
      tone: 'success',
    },
    {
      label: tr.summaryDevices,
      value: loading ? '—' : summary.devicesUnderMaintenance.toString(),
      subtitle: tr.summaryUnderMaintenance,
      icon: <TrendingUp className="w-5 h-5 text-primary" />,
      tone: 'primary',
    },
    {
      label: tr.summaryOverdue,
      value: loading ? '—' : summary.overdueMaintenance.toString(),
      subtitle: summary.overdueMaintenance > 0 ? tr.summaryNeedsAttention : tr.summaryAllCaughtUp,
      icon: <AlertTriangle className="w-5 h-5 text-error" />,
      tone: summary.overdueMaintenance > 0 ? 'error' : 'muted',
    },
    {
      label: tr.summaryDueThisWeek,
      value: loading ? '—' : summary.upcomingWeek.toString(),
      subtitle: tr.summaryUpcoming,
      icon: <Clock className="w-5 h-5 text-warning" />,
      tone: 'warning',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`apple-card ${
            c.tone === 'error' ? 'border-error/30 bg-error/5' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-text-secondary">{c.label}</span>
            {c.icon}
          </div>
          <p className="text-2xl font-bold">{c.value}</p>
          {c.subtitle && (
            <p className="text-xs text-text-tertiary mt-1 truncate">{c.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab button
// ─────────────────────────────────────────────────────────────

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
      className={`flex items-center gap-2 px-5 py-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-text-secondary hover:text-text-primary'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-error text-white font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Orders tab
// ─────────────────────────────────────────────────────────────

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
      const message =
        error instanceof Error ? error.message : tr.loadOrdersError;
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
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder={tr.searchOrdersPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded-apple">
          <Filter className="w-4 h-4 text-text-tertiary" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-sm"
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

      {/* List */}
      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="w-12 h-12" />} title={tr.noOrdersFound} />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} onDelete={handleDelete} deleting={deletingId === order.id} />
          ))}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="px-8 py-3 bg-surface-elevated hover:bg-surface-secondary font-medium rounded-apple transition-all disabled:opacity-50"
              >
                {loadingMore ? tr.loadingMore : tr.loadMore}
              </button>
            </div>
          )}
          <p className="text-center text-xs text-text-tertiary">
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
  return (
    <Link
      href={`/admin/orders/${order.id}`}
      className={`apple-card block hover:shadow-apple-lg transition-all ${
        isCancelledOrRefunded ? 'border-error/30' : ''
      }`}
    >
      <div className="flex flex-col md:flex-row gap-4 md:items-start md:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold">{order.orderNumber}</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(
                order.status
              )}`}
            >
              {getOrderStatusLabel(order.status, 'admin', t).toUpperCase()}
            </span>
            {order.payment?.status && (
              <span className="px-2 py-0.5 text-xs rounded bg-surface-elevated text-text-secondary">
                {tr.paymentLabel} {order.payment.status}
              </span>
            )}
          </div>

          <p className="text-sm text-text-secondary">
            {order.productSnapshot?.name?.en || tr.naLabel} —{' '}
            {order.serviceSnapshot?.name?.en || tr.naLabel}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <User className="w-4 h-4 text-text-tertiary" />
              <div className="min-w-0">
                <p className="truncate">{formatOptionalString(order.customerInfo?.name)}</p>
                <p className="text-xs text-text-tertiary truncate">
                  {order.customerInfo?.email || ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <CalendarClock className="w-4 h-4 text-text-tertiary" />
              <span>
                {order.installationDate
                  ? `${formatDate(order.installationDate, 'short')}${
                      order.timeSlot ? ' · ' + order.timeSlot : ''
                    }`
                  : tr.notScheduled}
              </span>
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Phone className="w-4 h-4 text-text-tertiary" />
              <span>{formatOptionalString(order.customerInfo?.phone)}</span>
            </div>
          </div>

          {order.cancellation?.reason && (
            <p className="text-xs text-error mt-1">
              {tr.cancelledPrefix} {order.cancellation.reason}
            </p>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div className="text-right md:min-w-[140px]">
            <p className="text-xl font-bold text-primary">
              {order.payment?.amount
                ? formatCurrency(order.payment.amount, order.payment.currency)
                : tr.naLabel}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {tr.createdPrefix} {order.createdAt ? formatDate(order.createdAt, 'short') : tr.naLabel}
            </p>
          </div>
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(order.id); }}
              disabled={deleting}
              className="p-2 bg-surface-elevated hover:bg-error/20 text-text-secondary hover:text-error rounded-apple transition-all disabled:opacity-50"
              aria-label={tr.deleteOrderAria}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// Installation tab
// ─────────────────────────────────────────────────────────────

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
      // When a specific sub-tab is active, query that status server-side.
      // For 'all', fetch in default order and filter client-side to installation statuses.
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
      const message =
        error instanceof Error ? error.message : tr.loadInstallationsError;
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
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'accepted', 'in_progress', 'completed'] as InstallationSubTab[]).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`px-4 py-2 text-sm rounded-apple font-medium transition-all ${
                subTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'all'
                ? tr.subtabAll
                : tab === 'accepted'
                ? tr.subtabScheduled
                : tab === 'in_progress'
                ? tr.subtabInProgress
                : tr.subtabInstalled}
            </button>
          )
        )}
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder={tr.searchInstallationPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all text-sm"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Wrench className="w-12 h-12" />} title={tr.noInstallations} />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <InstallationCard key={order.id} order={order} />
          ))}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="px-8 py-3 bg-surface-elevated hover:bg-surface-secondary font-medium rounded-apple transition-all disabled:opacity-50"
              >
                {loadingMore ? tr.loadingMore : tr.loadMore}
              </button>
            </div>
          )}
          <p className="text-center text-xs text-text-tertiary">
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
    <div className="apple-card">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Technician */}
        <div className="flex items-center gap-3 md:min-w-[220px]">
          {order.technicianInfo?.photo ? (
            <img
              src={order.technicianInfo.photo}
              alt={order.technicianInfo.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {formatOptionalString(order.technicianInfo?.name)}
            </p>
            <p className="text-xs text-text-tertiary truncate">
              {order.technicianInfo?.phone || ''}
              {order.technicianInfo?.rating
                ? ` · ${order.technicianInfo.rating.toFixed(1)}★`
                : ''}
            </p>
          </div>
        </div>

        {/* Order & site */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/admin/orders/${order.id}`}
              className="text-primary hover:underline font-semibold text-sm"
            >
              {order.orderNumber}
            </Link>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderStatusColor(
                order.status
              )}`}
            >
              {statusLabel}
            </span>
            {photoCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-success/10 text-success">
                <ImageIcon className="w-3 h-3" />
                {photoCount}
              </span>
            )}
          </div>
          <p className="text-sm text-text-secondary">
            {formatOptionalString(order.customerInfo?.name)} —{' '}
            {order.productSnapshot?.name?.en || tr.naLabel}
          </p>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <MapPin className="w-3 h-3" />
            <span className="truncate">
              {order.installationAddress?.street}, {order.installationAddress?.city}
              {order.installationAddress?.state
                ? `, ${order.installationAddress.state}`
                : ''}
            </span>
          </div>
          <p className="text-xs text-text-tertiary">{timestampForStatus()}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Maintenance tab
// ─────────────────────────────────────────────────────────────

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

      // Fetch schedules per device in parallel
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

      // Sort: overdue first (by most overdue), then by next due date ascending
      enriched.sort((a, b) => {
        const aDays = daysUntil(a.nextMaintenance) ?? Infinity;
        const bDays = daysUntil(b.nextMaintenance) ?? Infinity;
        return aDays - bDays;
      });

      setItems(enriched);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : tr.loadMaintenanceError;
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'overdue', 'due_week', 'ok'] as MaintenanceFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-apple font-medium transition-all ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {f === 'all'
              ? tr.maintFilterAll
              : f === 'overdue'
              ? tr.maintFilterOverdue
              : f === 'due_week'
              ? tr.maintFilterDueWeek
              : tr.maintFilterOk}
          </button>
        ))}
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder={tr.searchMaintenancePlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all text-sm"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="w-12 h-12" />}
          title={filter === 'overdue' ? tr.emptyAllCaughtUp : tr.emptyNoDevices}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <MaintenanceCard key={item.device.id} item={item} />
          ))}
          <p className="text-center text-xs text-text-tertiary">
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
    <span className="px-2 py-0.5 text-xs rounded bg-success/10 text-success">{tr.maintStatusOk}</span>
  );
  if (isOverdue) {
    statusBadge = (
      <span className="px-2 py-0.5 text-xs rounded bg-error/10 text-error font-semibold">
        {tr.maintStatusOverdueFormat.replace('{days}', String(Math.abs(days!)))}
      </span>
    );
  } else if (isDueSoon) {
    statusBadge = (
      <span className="px-2 py-0.5 text-xs rounded bg-warning/10 text-warning">
        {tr.maintStatusDueInFormat.replace('{days}', String(days))}
      </span>
    );
  }

  return (
    <div className={`apple-card ${isOverdue ? 'border-l-4 border-l-error' : ''}`}>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Site */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">
              {formatOptionalString(item.device.customerInfo?.name)}
            </span>
            {statusBadge}
            {item.escalationLevel > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-warning/10 text-warning">
                <AlertTriangle className="w-3 h-3" />
                {tr.escalationLevelFormat.replace('{level}', String(item.escalationLevel))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <MapPin className="w-3 h-3" />
            <span className="truncate">
              {item.device.installationAddress?.street}, {item.device.installationAddress?.city}
              {item.device.installationAddress?.state
                ? `, ${item.device.installationAddress.state}`
                : ''}
            </span>
          </div>
          <p className="text-xs text-text-tertiary">
            {item.device.productSnapshot?.name?.en || tr.summaryDevices} ·{' '}
            {item.device.qrCodeData}
          </p>
        </div>

        {/* Technician */}
        <div className="md:min-w-[180px] space-y-1">
          <p className="text-xs text-text-tertiary">{tr.technicianLabel}</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-sm truncate">
              {item.device.technicianId ? item.device.technicianId.slice(0, 8) + '...' : tr.naLabel}
            </p>
          </div>
        </div>

        {/* Last / next */}
        <div className="md:min-w-[200px] grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-text-tertiary">{tr.lastLabel}</p>
            <p className="font-medium">
              {item.lastMaintenance ? formatDate(item.lastMaintenance, 'short') : tr.neverLabel}
            </p>
          </div>
          <div>
            <p className="text-text-tertiary">{tr.nextLabel}</p>
            <p className={`font-medium ${isOverdue ? 'text-error' : ''}`}>
              {item.nextMaintenance ? formatDate(item.nextMaintenance, 'short') : tr.naLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity Log tab (original transaction stream)
// ─────────────────────────────────────────────────────────────

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
      const message =
        error instanceof Error ? error.message : tr.loadTransactionsError;
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
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded-apple max-w-md">
        <Filter className="w-4 h-4 text-text-tertiary" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="flex-1 bg-transparent border-none focus:outline-none text-sm"
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
        <EmptyState icon={<Receipt className="w-12 h-12" />} title={tr.noTransactions} />
      ) : (
        <div className="apple-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    {tr.type}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    {tr.orderNumber}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    {tr.amount}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    {tr.performedBy}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">
                    {tr.timestamp}
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getTxTypeIcon(tx.type)}</span>
                        <span className={`text-sm font-medium ${getTxTypeColor(tx.type)}`}>
                          {tx.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {tx.orderNumber ? (
                        <Link
                          href={`/admin/orders/${tx.orderId}`}
                          className="text-primary hover:underline text-sm"
                        >
                          {tx.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-text-tertiary text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {tx.amount ? (
                        <span className="font-semibold">
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                      ) : (
                        <span className="text-text-tertiary text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm">{tx.performedByRole}</p>
                        <p className="text-xs text-text-tertiary truncate max-w-[150px]">
                          {tx.performedBy}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-text-secondary">
                        {formatDateTime(tx.timestamp)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        disabled={deletingId === tx.id}
                        className="p-1.5 hover:bg-error/20 text-text-tertiary hover:text-error rounded-apple transition-all disabled:opacity-50"
                        aria-label={tr.deleteTransactionAria}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="px-8 py-3 bg-surface-elevated hover:bg-surface-secondary font-medium rounded-apple transition-all disabled:opacity-50"
              >
                {loadingMore ? tr.loadingMore : tr.loadMore}
              </button>
            </div>
          )}
          <div className="mt-6 text-center text-sm text-text-tertiary">
            {tr.showing} {transactions.length} {tr.transactions}
            {hasMore ? ' (more available)' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared small components
// ─────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[30vh]">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="apple-card text-center py-16">
      <div className="text-text-tertiary mx-auto mb-4 w-12 h-12 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-1">{title}</h3>
    </div>
  );
}
