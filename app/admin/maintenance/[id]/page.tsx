'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, QrCode, MapPin, User, Calendar, CheckCircle, Clock, Package,
  Wrench, Gauge, Droplets, Filter as FilterIcon, ClipboardCheck
} from 'lucide-react';
import { getDeviceById } from '@/lib/services/deviceService';
import { getSchedulesByDeviceId, completeMaintenance, getVisitsByDeviceId } from '@/lib/services/maintenanceService';
import { Device, MaintenanceSchedule, MaintenanceVisit } from '@/types/device';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const md = t.admin.maintenanceDetail;
  const [device, setDevice] = useState<Device | null>(null);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [visits, setVisits] = useState<MaintenanceVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [deviceId]);

  const loadData = async () => {
    try {
      const [deviceData, schedulesData, visitsData] = await Promise.all([
        getDeviceById(deviceId),
        getSchedulesByDeviceId(deviceId),
        getVisitsByDeviceId(deviceId),
      ]);

      if (!deviceData) {
        toast.error(md.deviceNotFound);
        router.push('/admin/maintenance');
        return;
      }

      setDevice(deviceData);
      setSchedules(schedulesData);
      setVisits(visitsData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : md.loadDeviceError;
      toast.error(message);
      router.push('/admin/maintenance');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMaintenance = async (scheduleId: string) => {
    if (!user) return;

    try {
      setCompleting(scheduleId);
      await completeMaintenance(scheduleId, user.uid, completionNotes[scheduleId] || '');
      toast.success(md.completedToast);
      setCompletionNotes((prev) => ({ ...prev, [scheduleId]: '' }));
      loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : md.completeError;
      toast.error(message);
    } finally {
      setCompleting(null);
    }
  };

  const getDueStatus = (schedule: MaintenanceSchedule): 'overdue' | 'soon' | 'ok' => {
    const now = Date.now();
    const due = schedule.nextDueDate.toDate().getTime();
    const diff = due - now;
    if (diff < 0) return 'overdue';
    if (diff < 7 * 24 * 60 * 60 * 1000) return 'soon';
    return 'ok';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{md.loading}</p>
        </div>
      </div>
    );
  }

  if (!device) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/maintenance')}
          className="p-2 hover:bg-surface-elevated rounded-apple transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{md.title}</h1>
          <p className="text-text-secondary mt-1">
            {device.productSnapshot.name?.en || md.ezerDevice}
          </p>
        </div>
      </div>

      {/* Device Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">{md.deviceInfo}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <QrCode className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">{md.qrCode}</p>
                <p className="font-mono text-sm">{device.qrCodeData}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">{md.product}</p>
                <p className="font-medium">
                  {device.productSnapshot.name?.en || md.productNa}
                  {device.productSnapshot.variation && ` — ${device.productSnapshot.variation}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">{md.registered}</p>
                <p className="font-medium">{formatDate(device.registeredAt, 'long')}</p>
              </div>
            </div>
            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                device.status === 'active' ? 'bg-success/20 text-success' : 'bg-text-tertiary/20 text-text-tertiary'
              }`}>
                {device.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="apple-card">
          <h3 className="text-lg font-semibold mb-4">{md.customerLocation}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-text-secondary">{md.customer}</p>
                <p className="font-medium">{device.customerInfo.name}</p>
                <p className="text-sm text-text-secondary">{device.customerInfo.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-text-secondary">{md.address}</p>
                <p className="font-medium">
                  {device.installationAddress.street}<br />
                  {device.installationAddress.city}, {device.installationAddress.state}
                </p>
              </div>
            </div>
          </div>

          {/* Link to original order */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => router.push(`/admin/orders/${device.orderId}`)}
              className="text-sm text-primary hover:underline"
            >
              {md.viewOriginalOrder}
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance Schedules */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{md.maintenanceSchedules}</h2>

        {schedules.map((schedule) => {
          const status = getDueStatus(schedule);
          const statusColor = status === 'overdue' ? 'border-error' : status === 'soon' ? 'border-warning' : 'border-border';

          return (
            <div key={schedule.id} className={`apple-card border-l-4 ${statusColor}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {schedule.type === 'ezer_maintenance' ? md.ezerMaintenance : schedule.filterName || md.filterReplacement}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {md.everyDays.replace('{count}', String(schedule.intervalDays))}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status === 'overdue' ? 'bg-error/20 text-error' :
                  status === 'soon' ? 'bg-warning/20 text-warning' :
                  'bg-success/20 text-success'
                }`}>
                  {status === 'overdue' ? md.overdueBadge : status === 'soon' ? md.dueSoon : md.ok}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-text-tertiary">{md.nextDue}</p>
                  <p className={`font-medium ${status === 'overdue' ? 'text-error' : ''}`}>
                    {formatDate(schedule.nextDueDate, 'long')}
                  </p>
                </div>
                <div>
                  <p className="text-text-tertiary">{md.lastCompleted}</p>
                  <p className="font-medium">
                    {schedule.lastCompletedAt ? formatDate(schedule.lastCompletedAt, 'long') : md.never}
                  </p>
                </div>
              </div>

              {/* Completion History */}
              {schedule.completionHistory.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-text-tertiary mb-2">{md.history.replace('{count}', String(schedule.completionHistory.length))}</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {schedule.completionHistory.slice().reverse().map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                        <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                        <span>{formatDate(entry.completedAt, 'short')}</span>
                        {entry.notes && <span className="text-text-tertiary">— {entry.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mark Complete Action */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={md.notesOptional}
                      value={completionNotes[schedule.id] || ''}
                      onChange={(e) => setCompletionNotes((prev) => ({ ...prev, [schedule.id]: e.target.value }))}
                      className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all text-sm"
                    />
                  </div>
                  <button
                    onClick={() => handleCompleteMaintenance(schedule.id)}
                    disabled={completing === schedule.id}
                    className="flex items-center gap-2 px-4 py-2 bg-success text-white font-medium rounded-apple hover:bg-success/90 disabled:opacity-50 transition-all text-sm"
                  >
                    {completing === schedule.id ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {md.markComplete}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Maintenance Visit History */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6" />
          {md.visitsHeading}
        </h2>

        {visits.length === 0 ? (
          <div className="apple-card text-center py-8">
            <p className="text-text-secondary">{md.noVisits}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit) => (
              <div key={visit.id} className="apple-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{visit.technicianName}</p>
                    <p className="text-sm text-text-secondary">{formatDate(visit.createdAt, 'long')}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {visit.checks.installationOk && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      <Wrench className="w-3 h-3" /> {md.checkInstallationOk}
                    </span>
                  )}
                  {visit.checks.operationOk && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      <CheckCircle className="w-3 h-3" /> {md.checkOperationOk}
                    </span>
                  )}
                  {visit.checks.waterPressureOk && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      <Gauge className="w-3 h-3" /> {md.checkWaterPressureOk}
                    </span>
                  )}
                  {visit.checks.sedimentFilterReplaced && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-warning/10 text-warning rounded-full text-xs font-medium">
                      <Droplets className="w-3 h-3" /> {md.checkSedimentFilterReplaced}
                    </span>
                  )}
                  {visit.checks.carbonFilterReplaced && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-warning/10 text-warning rounded-full text-xs font-medium">
                      <FilterIcon className="w-3 h-3" /> {md.checkCarbonFilterReplaced}
                    </span>
                  )}
                </div>
                {(visit.beforePhotoUrl || visit.afterPhotoUrl) && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {visit.beforePhotoUrl && (
                      <div>
                        <p className="text-xs text-text-tertiary mb-1">{md.photoBefore}</p>
                        <a href={visit.beforePhotoUrl} target="_blank" rel="noopener noreferrer">
                          <img src={visit.beforePhotoUrl} alt={md.photoBefore} className="w-full h-32 object-cover rounded-apple border border-border" />
                        </a>
                      </div>
                    )}
                    {visit.afterPhotoUrl && (
                      <div>
                        <p className="text-xs text-text-tertiary mb-1">{md.photoAfter}</p>
                        <a href={visit.afterPhotoUrl} target="_blank" rel="noopener noreferrer">
                          <img src={visit.afterPhotoUrl} alt={md.photoAfter} className="w-full h-32 object-cover rounded-apple border border-border" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {visit.notes && (
                  <p className="text-sm text-text-secondary border-t border-border pt-2">{visit.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
