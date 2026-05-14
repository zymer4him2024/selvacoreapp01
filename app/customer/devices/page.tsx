'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Cpu, MapPin, Calendar, CheckCircle, AlertTriangle, Clock, Wrench, Gauge, Droplets, Filter as FilterIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { getDevicesByCustomerId } from '@/lib/services/deviceService';
import { getSchedulesByDeviceId, getVisitsByDeviceId } from '@/lib/services/maintenanceService';
import { Device, MaintenanceSchedule, MaintenanceVisit } from '@/types/device';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import toast from 'react-hot-toast';

interface DeviceWithSchedules extends Device {
  schedules: MaintenanceSchedule[];
  visits: MaintenanceVisit[];
}

function getMaintenanceStatus(nextDueDate: Date): 'overdue' | 'due-soon' | 'ok' {
  const now = new Date();
  const diff = nextDueDate.getTime() - now.getTime();
  const daysUntilDue = diff / (1000 * 60 * 60 * 24);
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 14) return 'due-soon';
  return 'ok';
}

function getDaysOverdue(nextDueDate: Date): number {
  const now = new Date();
  const diff = now.getTime() - nextDueDate.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function CustomerDevicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const d = t.customer.devices;
  const [devices, setDevices] = useState<DeviceWithSchedules[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVisits, setExpandedVisits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) loadDevices();
  }, [user]);

  const loadDevices = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const deviceList = await getDevicesByCustomerId(user.uid);
      const devicesWithSchedules = await Promise.all(
        deviceList.map(async (device) => {
          const [schedules, visits] = await Promise.all([
            getSchedulesByDeviceId(device.id),
            getVisitsByDeviceId(device.id),
          ]);
          return { ...device, schedules, visits };
        })
      );
      setDevices(devicesWithSchedules);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : d.loadDevicesError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sc">
        <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
      </div>
    );
  }

  const statusColor = (s: 'overdue' | 'due-soon' | 'ok'): { color: string; bg: string } => {
    if (s === 'overdue') return { color: 'var(--warn)', bg: 'var(--warn-tint)' };
    if (s === 'due-soon') return { color: 'var(--warn)', bg: 'var(--warn-tint)' };
    return { color: 'var(--brand)', bg: 'var(--brand-tint)' };
  };

  return (
    <div className="sc">
      <main className="sc-main" style={{ maxWidth: 880 }}>
        <div className="sc-row" style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => router.push('/customer')}
            className="sc-cta-ghost"
            style={{ padding: 8, width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="sc-eyebrow">{t.customer.myDevices}</div>
            <h1 className="sc-h1">{d.title}</h1>
            <p className="sc-lede">{d.subtitle}</p>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="sc-empty">
            <Cpu className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--soft)' }} />
            <h3 className="sc-h2" style={{ marginBottom: 8 }}>{d.noDevices}</h3>
            <p className="sc-lede">{d.noDevicesDesc}</p>
          </div>
        ) : (
          <div className="sc-stack-lg">
            {devices.map((device) => {
              const statusBadge = statusColor(
                device.status === 'active' ? 'ok' : device.status === 'inactive' ? 'due-soon' : 'overdue',
              );
              return (
                <div key={device.id} className="sc-card-static">
                  <div className="sc-row-between" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="sc-h2" style={{ margin: 0 }}>
                        {device.productSnapshot.name?.en || d.defaultDeviceName}
                      </h3>
                      {device.productSnapshot.variation && (
                        <p className="sc-helper" style={{ margin: '4px 0 0' }}>{device.productSnapshot.variation}</p>
                      )}
                    </div>
                    <span
                      className="sc-badge-inline"
                      style={{ color: statusBadge.color, background: statusBadge.bg }}
                    >
                      {device.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 24 }}>
                    <div className="sc-row" style={{ gap: 8 }}>
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>{device.installationAddress.city}, {device.installationAddress.state}</span>
                    </div>
                    <div className="sc-row" style={{ gap: 8 }}>
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{d.installedOn} {formatDate(device.registeredAt, 'short')}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="sc-eyebrow" style={{ marginBottom: 12 }}>{d.maintenanceSchedules}</h4>
                    {device.schedules.length === 0 ? (
                      <p className="sc-helper">{d.noSchedules}</p>
                    ) : (
                      <div className="sc-stack" style={{ gap: 8 }}>
                        {device.schedules.map((schedule) => {
                          const dueDate = schedule.nextDueDate.toDate();
                          const status = getMaintenanceStatus(dueDate);
                          const overdueDays = getDaysOverdue(dueDate);
                          const badge = statusColor(status);

                          return (
                            <div key={schedule.id} className="sc-row-between" style={{ padding: 12, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                              <div className="sc-row" style={{ gap: 12 }}>
                                {status === 'overdue' ? (
                                  <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--warn)' }} />
                                ) : status === 'due-soon' ? (
                                  <Clock className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--warn)' }} />
                                ) : (
                                  <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--brand)' }} />
                                )}
                                <div>
                                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                                    {schedule.type === 'ezer_maintenance'
                                      ? d.ezerMaintenance
                                      : `${d.filterReplacement}: ${schedule.filterName}`}
                                  </p>
                                  <p style={{ fontSize: 12, color: 'var(--soft)', margin: '2px 0 0' }}>
                                    {status === 'overdue'
                                      ? `${d.overdueBy} ${overdueDays} ${d.days}`
                                      : `${d.dueOn} ${formatDate(dueDate, 'short')}`}
                                  </p>
                                </div>
                              </div>
                              <span className="sc-badge-inline" style={{ color: badge.color, background: badge.bg }}>
                                {status === 'overdue' ? d.overdue : status === 'due-soon' ? d.dueSoon : d.upToDate}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {device.visits.length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedVisits((prev) => ({ ...prev, [device.id]: !prev[device.id] }))}
                        className="sc-row"
                        style={{
                          gap: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          color: 'var(--ink)',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          marginBottom: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {expandedVisits[device.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {d.recentVisits} ({device.visits.length})
                      </button>
                      {expandedVisits[device.id] && (
                        <div className="sc-stack" style={{ gap: 8 }}>
                          {device.visits.slice(0, 5).map((visit) => (
                            <div key={visit.id} style={{ padding: 12, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }}>
                              <div className="sc-row-between" style={{ marginBottom: 8 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{visit.technicianName}</p>
                                <p style={{ fontSize: 12, color: 'var(--soft)', margin: 0 }}>{formatDate(visit.createdAt, 'short')}</p>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {visit.checks.installationOk && (
                                  <span className="sc-badge-inline" style={{ color: 'var(--brand)', background: 'var(--brand-tint)' }}>
                                    <Wrench className="w-3 h-3" /> {d.checkInstallOk}
                                  </span>
                                )}
                                {visit.checks.operationOk && (
                                  <span className="sc-badge-inline" style={{ color: 'var(--brand)', background: 'var(--brand-tint)' }}>
                                    <CheckCircle className="w-3 h-3" /> {d.checkOperationOk}
                                  </span>
                                )}
                                {visit.checks.waterPressureOk && (
                                  <span className="sc-badge-inline" style={{ color: 'var(--brand)', background: 'var(--brand-tint)' }}>
                                    <Gauge className="w-3 h-3" /> {d.checkPressureOk}
                                  </span>
                                )}
                                {visit.checks.sedimentFilterReplaced && (
                                  <span className="sc-badge-inline">
                                    <Droplets className="w-3 h-3" /> {d.checkSediment}
                                  </span>
                                )}
                                {visit.checks.carbonFilterReplaced && (
                                  <span className="sc-badge-inline">
                                    <FilterIcon className="w-3 h-3" /> {d.checkCarbon}
                                  </span>
                                )}
                              </div>
                              {(visit.beforePhotoUrl || visit.afterPhotoUrl) && (
                                <div className="grid grid-cols-2 gap-1.5" style={{ marginTop: 8 }}>
                                  {visit.beforePhotoUrl && (
                                    <a href={visit.beforePhotoUrl} target="_blank" rel="noopener noreferrer">
                                      <img src={visit.beforePhotoUrl} alt={d.beforePhotoAlt} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)' }} />
                                    </a>
                                  )}
                                  {visit.afterPhotoUrl && (
                                    <a href={visit.afterPhotoUrl} target="_blank" rel="noopener noreferrer">
                                      <img src={visit.afterPhotoUrl} alt={d.afterPhotoAlt} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)' }} />
                                    </a>
                                  )}
                                </div>
                              )}
                              {visit.notes && (
                                <p style={{ fontSize: 12, color: 'var(--soft)', marginTop: 8 }}>{visit.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
