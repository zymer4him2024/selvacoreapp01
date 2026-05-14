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

type FirebaseTimestamp = { toDate: () => Date };
type DueStatus = 'overdue' | 'soon' | 'ok';

function getDueStatus(dueDate: FirebaseTimestamp): DueStatus {
  const now = Date.now();
  const due = dueDate.toDate().getTime();
  const diff = due - now;
  if (diff < 0) return 'overdue';
  if (diff < 7 * 24 * 60 * 60 * 1000) return 'soon';
  return 'ok';
}

function getDueColor(status: DueStatus): string {
  if (status === 'overdue') return '#ef4444';
  if (status === 'soon') return 'var(--warn)';
  return 'var(--brand)';
}

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
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div className="sc-spinner" />
          <p className="sc-helper">{mt.loading}</p>
        </div>
      </div>
    );
  }

  const statTileStyle: React.CSSProperties = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 20,
  };

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 className="sc-h1" style={{ marginBottom: 8 }}>{mt.title}</h1>
        <p className="sc-helper">{mt.subtitle}</p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <div className="sc-card-static" style={statTileStyle}>
            <Cpu size={28} color="var(--brand)" />
            <p className="sc-helper" style={{ fontSize: 13 }}>{mt.totalDevices}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>{stats.totalDevices}</p>
          </div>
          <div className="sc-card-static" style={statTileStyle}>
            <AlertTriangle size={28} color="#ef4444" />
            <p className="sc-helper" style={{ fontSize: 13 }}>{mt.overdue}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: stats.overdueCount > 0 ? '#ef4444' : 'var(--ink)' }}>
              {stats.overdueCount}
            </p>
          </div>
          <div className="sc-card-static" style={statTileStyle}>
            <CalendarClock size={28} color="var(--warn)" />
            <p className="sc-helper" style={{ fontSize: 13 }}>{mt.dueThisWeek}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warn)' }}>{stats.upcomingThisWeek}</p>
          </div>
          <div className="sc-card-static" style={statTileStyle}>
            <CalendarClock size={28} color="var(--soft)" />
            <p className="sc-helper" style={{ fontSize: 13 }}>{mt.dueThisMonth}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)' }}>{stats.upcomingThisMonth}</p>
          </div>
        </div>
      )}

      <div className="sc-card-static">
        <div style={{ position: 'relative' }}>
          <Search
            size={20}
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--soft)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder={mt.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sc-input"
            style={{ paddingLeft: 44 }}
          />
        </div>
      </div>

      {filteredDevices.length === 0 ? (
        <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <Cpu size={56} color="var(--soft)" style={{ margin: '0 auto 16px' }} />
          <h3 className="sc-h2" style={{ marginBottom: 8 }}>{mt.noDevices}</h3>
          <p className="sc-helper">
            {searchTerm ? mt.tryAdjusting : mt.devicesWillAppear}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredDevices.map((device) => {
            const ezerStatus = getDueStatus(device.nextEzerMaintenanceDue as unknown as FirebaseTimestamp);
            const filterStatus = getDueStatus(device.nextFilterReplacementDue as unknown as FirebaseTimestamp);
            const isActive = device.status === 'active';

            return (
              <button
                key={device.id}
                onClick={() => router.push(`/admin/maintenance/${device.id}`)}
                className="sc-card"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'transparent', border: '1px solid var(--hairline)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                        {device.productSnapshot.name?.en || mt.ezerDevice}
                      </h3>
                      <span
                        style={{
                          padding: '2px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: 11,
                          fontWeight: 600,
                          background: isActive ? 'var(--brand-tint)' : 'var(--off-paper)',
                          color: isActive ? 'var(--brand)' : 'var(--soft)',
                        }}
                      >
                        {isActive ? mt.statusActive : mt.statusInactive}
                      </span>
                    </div>
                    <p className="sc-helper" style={{ marginBottom: 12 }}>
                      {device.customerInfo.name} — {device.installationAddress.city}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                      <div>
                        <p className="sc-helper" style={{ fontSize: 11, marginBottom: 2 }}>{mt.ezerMaintenance}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: getDueColor(ezerStatus), margin: 0 }}>
                          {formatDate(device.nextEzerMaintenanceDue, 'short')}
                          {ezerStatus === 'overdue' && ` ${mt.overdueLabel}`}
                        </p>
                      </div>
                      <div>
                        <p className="sc-helper" style={{ fontSize: 11, marginBottom: 2 }}>{mt.filterReplacement}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: getDueColor(filterStatus), margin: 0 }}>
                          {formatDate(device.nextFilterReplacementDue, 'short')}
                          {filterStatus === 'overdue' && ` ${mt.overdueLabel}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} color="var(--soft)" style={{ flexShrink: 0, marginTop: 4 }} />
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                  <p className="sc-helper" style={{ fontSize: 11, fontFamily: 'monospace', margin: 0 }}>
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
