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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/customer')}
              className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{d.title}</h1>
              <p className="text-text-secondary mt-1">{d.subtitle}</p>
            </div>
          </div>

          {/* Devices List */}
          {devices.length === 0 ? (
            <div className="apple-card text-center py-16">
              <Cpu className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
              <h3 className="text-xl font-semibold mb-2">{d.noDevices}</h3>
              <p className="text-text-secondary">{d.noDevicesDesc}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {devices.map((device) => {
                const ezerSchedule = device.schedules.find((s) => s.type === 'ezer_maintenance');
                const filterSchedules = device.schedules.filter((s) => s.type === 'filter_replacement');

                return (
                  <div key={device.id} className="apple-card">
                    {/* Device Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold">
                          {device.productSnapshot.name?.en || d.defaultDeviceName}
                        </h3>
                        {device.productSnapshot.variation && (
                          <p className="text-sm text-text-secondary">{device.productSnapshot.variation}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        device.status === 'active' ? 'bg-success/20 text-success' :
                        device.status === 'inactive' ? 'bg-warning/20 text-warning' :
                        'bg-text-tertiary/20 text-text-tertiary'
                      }`}>
                        {device.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Device Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                        <span className="text-text-secondary">
                          {device.installationAddress.city}, {device.installationAddress.state}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                        <span className="text-text-secondary">
                          {d.installedOn} {formatDate(device.registeredAt, 'short')}
                        </span>
                      </div>
                    </div>

                    {/* Maintenance Schedules */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3">{d.maintenanceSchedules}</h4>
                      {device.schedules.length === 0 ? (
                        <p className="text-sm text-text-tertiary">{d.noSchedules}</p>
                      ) : (
                        <div className="space-y-3">
                          {device.schedules.map((schedule) => {
                            const dueDate = schedule.nextDueDate.toDate();
                            const status = getMaintenanceStatus(dueDate);
                            const overdueDays = getDaysOverdue(dueDate);

                            return (
                              <div key={schedule.id} className="flex items-center justify-between p-3 bg-surface-elevated rounded-apple">
                                <div className="flex items-center gap-3">
                                  {status === 'overdue' ? (
                                    <AlertTriangle className="w-5 h-5 text-error flex-shrink-0" />
                                  ) : status === 'due-soon' ? (
                                    <Clock className="w-5 h-5 text-warning flex-shrink-0" />
                                  ) : (
                                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                                  )}
                                  <div>
                                    <p className="font-medium text-sm">
                                      {schedule.type === 'ezer_maintenance'
                                        ? d.ezerMaintenance
                                        : `${d.filterReplacement}: ${schedule.filterName}`}
                                    </p>
                                    <p className="text-xs text-text-tertiary">
                                      {status === 'overdue'
                                        ? `${d.overdueBy} ${overdueDays} ${d.days}`
                                        : `${d.dueOn} ${formatDate(dueDate, 'short')}`}
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  status === 'overdue' ? 'bg-error/20 text-error' :
                                  status === 'due-soon' ? 'bg-warning/20 text-warning' :
                                  'bg-success/20 text-success'
                                }`}>
                                  {status === 'overdue' ? d.overdue :
                                   status === 'due-soon' ? d.dueSoon : d.upToDate}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent Visits */}
                    {device.visits.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <button
                          onClick={() => setExpandedVisits((prev) => ({ ...prev, [device.id]: !prev[device.id] }))}
                          className="flex items-center gap-2 text-sm font-semibold mb-3 hover:text-primary transition-colors"
                        >
                          {expandedVisits[device.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {d.recentVisits} ({device.visits.length})
                        </button>
                        {expandedVisits[device.id] && (
                          <div className="space-y-2">
                            {device.visits.slice(0, 5).map((visit) => (
                              <div key={visit.id} className="p-3 bg-surface-elevated rounded-apple">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium">{visit.technicianName}</p>
                                  <p className="text-xs text-text-tertiary">{formatDate(visit.createdAt, 'short')}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {visit.checks.installationOk && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                                      <Wrench className="w-3 h-3" /> {d.checkInstallOk}
                                    </span>
                                  )}
                                  {visit.checks.operationOk && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                                      <CheckCircle className="w-3 h-3" /> {d.checkOperationOk}
                                    </span>
                                  )}
                                  {visit.checks.waterPressureOk && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                                      <Gauge className="w-3 h-3" /> {d.checkPressureOk}
                                    </span>
                                  )}
                                  {visit.checks.sedimentFilterReplaced && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded-full text-xs">
                                      <Droplets className="w-3 h-3" /> {d.checkSediment}
                                    </span>
                                  )}
                                  {visit.checks.carbonFilterReplaced && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded-full text-xs">
                                      <FilterIcon className="w-3 h-3" /> {d.checkCarbon}
                                    </span>
                                  )}
                                </div>
                                {(visit.beforePhotoUrl || visit.afterPhotoUrl) && (
                                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                                    {visit.beforePhotoUrl && (
                                      <a href={visit.beforePhotoUrl} target="_blank" rel="noopener noreferrer">
                                        <img src={visit.beforePhotoUrl} alt={d.beforePhotoAlt} className="w-full h-20 object-cover rounded-apple border border-border" />
                                      </a>
                                    )}
                                    {visit.afterPhotoUrl && (
                                      <a href={visit.afterPhotoUrl} target="_blank" rel="noopener noreferrer">
                                        <img src={visit.afterPhotoUrl} alt={d.afterPhotoAlt} className="w-full h-20 object-cover rounded-apple border border-border" />
                                      </a>
                                    )}
                                  </div>
                                )}
                                {visit.notes && (
                                  <p className="text-xs text-text-secondary mt-2">{visit.notes}</p>
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
        </div>
      </div>
    </div>
  );
}
