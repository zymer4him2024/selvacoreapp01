'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cpu, AlertTriangle, CalendarClock, Search, ChevronRight } from 'lucide-react';
import { getAllDevices } from '@/lib/services/deviceService';
import { getMaintenanceSummaryStats, MaintenanceSummaryStats } from '@/lib/services/maintenanceService';
import { Device } from '@/types/device';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

function getDueStatus(dueDate: FirebaseTimestamp): 'overdue' | 'soon' | 'ok' {
  const now = Date.now();
  const due = dueDate.toDate().getTime();
  const diff = due - now;
  if (diff < 0) return 'overdue';
  if (diff < 7 * 24 * 60 * 60 * 1000) return 'soon';
  return 'ok';
}

function getDueColor(status: 'overdue' | 'soon' | 'ok'): string {
  if (status === 'overdue') return 'text-error';
  if (status === 'soon') return 'text-warning';
  return 'text-success';
}

type FirebaseTimestamp = { toDate: () => Date };

export default function MaintenanceDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const mt = t.admin.maintenance;
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<MaintenanceSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [devicesData, statsData] = await Promise.all([
        getAllDevices(),
        getMaintenanceSummaryStats(),
      ]);
      setDevices(devicesData);
      setStats(statsData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : mt.loadError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices
    .filter((device) => {
      const term = searchTerm.toLowerCase();
      return (
        device.qrCodeData.toLowerCase().includes(term) ||
        device.customerInfo.name.toLowerCase().includes(term) ||
        device.installationAddress.city.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      // Sort overdue devices first (earliest due date = most urgent)
      const aDue = Math.min(
        a.nextEzerMaintenanceDue?.toDate?.()?.getTime?.() || Infinity,
        a.nextFilterReplacementDue?.toDate?.()?.getTime?.() || Infinity
      );
      const bDue = Math.min(
        b.nextEzerMaintenanceDue?.toDate?.()?.getTime?.() || Infinity,
        b.nextFilterReplacementDue?.toDate?.()?.getTime?.() || Infinity
      );
      return aDue - bDue;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{mt.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{mt.title}</h1>
        <p className="text-text-secondary">{mt.subtitle}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="apple-card text-center">
            <Cpu className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-text-tertiary text-sm">{mt.totalDevices}</p>
            <p className="text-3xl font-bold mt-1">{stats.totalDevices}</p>
          </div>
          <div className="apple-card text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-error" />
            <p className="text-text-tertiary text-sm">{mt.overdue}</p>
            <p className={`text-3xl font-bold mt-1 ${stats.overdueCount > 0 ? 'text-error' : ''}`}>
              {stats.overdueCount}
            </p>
          </div>
          <div className="apple-card text-center">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 text-warning" />
            <p className="text-text-tertiary text-sm">{mt.dueThisWeek}</p>
            <p className="text-3xl font-bold mt-1 text-warning">{stats.upcomingThisWeek}</p>
          </div>
          <div className="apple-card text-center">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 text-secondary" />
            <p className="text-text-tertiary text-sm">{mt.dueThisMonth}</p>
            <p className="text-3xl font-bold mt-1">{stats.upcomingThisMonth}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="apple-card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder={mt.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Devices List */}
      {filteredDevices.length === 0 ? (
        <div className="apple-card text-center py-16">
          <Cpu className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">{mt.noDevices}</h3>
          <p className="text-text-secondary">
            {searchTerm
              ? mt.tryAdjusting
              : mt.devicesWillAppear}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDevices.map((device) => {
            const ezerStatus = getDueStatus(device.nextEzerMaintenanceDue as unknown as FirebaseTimestamp);
            const filterStatus = getDueStatus(device.nextFilterReplacementDue as unknown as FirebaseTimestamp);

            return (
              <button
                key={device.id}
                onClick={() => router.push(`/admin/maintenance/${device.id}`)}
                className="apple-card w-full text-left hover:scale-[1.01] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">
                        {device.productSnapshot.name?.en || 'Ezer Device'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        device.status === 'active' ? 'bg-success/20 text-success' : 'bg-text-tertiary/20 text-text-tertiary'
                      }`}>
                        {device.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-3">
                      {device.customerInfo.name} — {device.installationAddress.city}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-text-tertiary text-xs">{mt.ezerMaintenance}</p>
                        <p className={`font-medium ${getDueColor(ezerStatus)}`}>
                          {formatDate(device.nextEzerMaintenanceDue, 'short')}
                          {ezerStatus === 'overdue' && ` ${mt.overdueLabel}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-tertiary text-xs">{mt.filterReplacement}</p>
                        <p className={`font-medium ${getDueColor(filterStatus)}`}>
                          {formatDate(device.nextFilterReplacementDue, 'short')}
                          {filterStatus === 'overdue' && ` ${mt.overdueLabel}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-1" />
                </div>

                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-text-tertiary font-mono truncate">
                    QR: {device.qrCodeData}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
