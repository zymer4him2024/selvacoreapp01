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
import { useFeatureAccess } from '@/hooks/useRolePermissions';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

type DueStatus = 'overdue' | 'soon' | 'ok';

const STATUS_STYLES: Record<DueStatus, { color: string; bg: string; border: string }> = {
  overdue: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: '#ef4444' },
  soon: { color: 'var(--warn)', bg: 'var(--warn-tint)', border: 'var(--warn)' },
  ok: { color: 'var(--brand)', bg: 'var(--brand-tint)', border: 'var(--hairline)' },
};

export default function DeviceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const deviceId = params.id as string;
  const { user } = useAuth();
  const { canEdit } = useFeatureAccess('featureMaintenance');
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormatters();
  const md = t.admin.maintenanceDetail;
  const mt = t.admin.maintenance;
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

  const getDueStatus = (schedule: MaintenanceSchedule): DueStatus => {
    const now = Date.now();
    const due = schedule.nextDueDate.toDate().getTime();
    const diff = due - now;
    if (diff < 0) return 'overdue';
    if (diff < 7 * 24 * 60 * 60 * 1000) return 'soon';
    return 'ok';
  };

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div className="sc-spinner" />
          <p className="sc-helper">{md.loading}</p>
        </div>
      </div>
    );
  }

  if (!device) return null;

  const checkPillStyle = (variant: 'brand' | 'warn'): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: 11,
    fontWeight: 600,
    background: variant === 'brand' ? 'var(--brand-tint)' : 'var(--warn-tint)',
    color: variant === 'brand' ? 'var(--brand)' : 'var(--warn)',
  });

  const isActive = device.status === 'active';

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => router.push('/admin/maintenance')}
          className="sc-cta-ghost"
          style={{ padding: 8, minWidth: 0 }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="sc-h1">{md.title}</h1>
          <p className="sc-helper" style={{ marginTop: 4 }}>
            {device.productSnapshot.name?.en || md.ezerDevice}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="sc-card-static">
          <h3 className="sc-h2" style={{ marginBottom: 16 }}>{md.deviceInfo}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <QrCode size={20} color="var(--brand)" />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{md.qrCode}</p>
                <p style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--ink)', margin: 0 }}>{device.qrCodeData}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Package size={20} color="var(--brand)" />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{md.product}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  {device.productSnapshot.name?.en || md.productNa}
                  {device.productSnapshot.variation && ` — ${device.productSnapshot.variation}`}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Calendar size={20} color="var(--brand)" />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{md.registered}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{formatDate(device.registeredAt, 'long')}</p>
              </div>
            </div>
            <div>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: 600,
                  background: isActive ? 'var(--brand-tint)' : 'var(--off-paper)',
                  color: isActive ? 'var(--brand)' : 'var(--soft)',
                }}
              >
                {isActive ? mt.statusActive : mt.statusInactive}
              </span>
            </div>
          </div>
        </div>

        <div className="sc-card-static">
          <h3 className="sc-h2" style={{ marginBottom: 16 }}>{md.customerLocation}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <User size={20} color="var(--brand)" />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{md.customer}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{device.customerInfo.name}</p>
                <p className="sc-helper" style={{ fontSize: 13, margin: 0 }}>{device.customerInfo.email}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <MapPin size={20} color="var(--brand)" style={{ marginTop: 2 }} />
              <div>
                <p className="sc-helper" style={{ fontSize: 12 }}>{md.address}</p>
                <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  {device.installationAddress.street}<br />
                  {device.installationAddress.city}, {device.installationAddress.state}
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
            <button
              onClick={() => router.push(`/admin/orders/${device.orderId}`)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                color: 'var(--brand)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {md.viewOriginalOrder}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="sc-h2">{md.maintenanceSchedules}</h2>

        {schedules.map((schedule) => {
          const status = getDueStatus(schedule);
          const stat = STATUS_STYLES[status];

          return (
            <div
              key={schedule.id}
              className="sc-card-static"
              style={{ borderLeft: `4px solid ${stat.border}` }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
                    {schedule.type === 'ezer_maintenance' ? md.ezerMaintenance : schedule.filterName || md.filterReplacement}
                  </h3>
                  <p className="sc-helper" style={{ margin: 0 }}>
                    {md.everyDays.replace('{count}', String(schedule.intervalDays))}
                  </p>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 11,
                    fontWeight: 600,
                    background: stat.bg,
                    color: stat.color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {status === 'overdue' ? md.overdueBadge : status === 'soon' ? md.dueSoon : md.ok}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <p className="sc-helper" style={{ fontSize: 12 }}>{md.nextDue}</p>
                  <p style={{ fontWeight: 600, color: status === 'overdue' ? '#ef4444' : 'var(--ink)', margin: 0 }}>
                    {formatDate(schedule.nextDueDate, 'long')}
                  </p>
                </div>
                <div>
                  <p className="sc-helper" style={{ fontSize: 12 }}>{md.lastCompleted}</p>
                  <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                    {schedule.lastCompletedAt ? formatDate(schedule.lastCompletedAt, 'long') : md.never}
                  </p>
                </div>
              </div>

              {schedule.completionHistory.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p className="sc-helper" style={{ marginBottom: 8 }}>
                    {md.history.replace('{count}', String(schedule.completionHistory.length))}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 128, overflowY: 'auto' }}>
                    {schedule.completionHistory.slice().reverse().map((entry, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--soft)' }}>
                        <CheckCircle size={14} color="var(--brand)" style={{ flexShrink: 0 }} />
                        <span>{formatDate(entry.completedAt, 'short')}</span>
                        {entry.notes && <span style={{ color: 'var(--soft)' }}>— {entry.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canEdit && (
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <input
                      type="text"
                      placeholder={md.notesOptional}
                      value={completionNotes[schedule.id] || ''}
                      onChange={(e) => setCompletionNotes((prev) => ({ ...prev, [schedule.id]: e.target.value }))}
                      className="sc-input"
                    />
                  </div>
                  <button
                    onClick={() => handleCompleteMaintenance(schedule.id)}
                    disabled={completing === schedule.id}
                    className="sc-cta"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    {completing === schedule.id ? (
                      <Clock size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    {md.markComplete}
                  </button>
                </div>
              </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="sc-h2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardCheck size={22} />
          {md.visitsHeading}
        </h2>

        {visits.length === 0 ? (
          <div className="sc-empty">
            <p className="sc-helper">{md.noVisits}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visits.map((visit) => (
              <div key={visit.id} className="sc-card-static">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--ink)', margin: 0 }}>{visit.technicianName}</p>
                    <p className="sc-helper" style={{ margin: 0 }}>{formatDate(visit.createdAt, 'long')}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {visit.checks.installationOk && (
                    <span style={checkPillStyle('brand')}>
                      <Wrench size={12} /> {md.checkInstallationOk}
                    </span>
                  )}
                  {visit.checks.operationOk && (
                    <span style={checkPillStyle('brand')}>
                      <CheckCircle size={12} /> {md.checkOperationOk}
                    </span>
                  )}
                  {visit.checks.waterPressureOk && (
                    <span style={checkPillStyle('brand')}>
                      <Gauge size={12} /> {md.checkWaterPressureOk}
                    </span>
                  )}
                  {visit.checks.sedimentFilterReplaced && (
                    <span style={checkPillStyle('warn')}>
                      <Droplets size={12} /> {md.checkSedimentFilterReplaced}
                    </span>
                  )}
                  {visit.checks.carbonFilterReplaced && (
                    <span style={checkPillStyle('warn')}>
                      <FilterIcon size={12} /> {md.checkCarbonFilterReplaced}
                    </span>
                  )}
                </div>
                {(visit.beforePhotoUrl || visit.afterPhotoUrl) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
                    {visit.beforePhotoUrl && (
                      <div>
                        <p className="sc-helper" style={{ fontSize: 11, marginBottom: 4 }}>{md.photoBefore}</p>
                        <a href={visit.beforePhotoUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={visit.beforePhotoUrl}
                            alt={md.photoBefore}
                            style={{ width: '100%', height: 128, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)' }}
                          />
                        </a>
                      </div>
                    )}
                    {visit.afterPhotoUrl && (
                      <div>
                        <p className="sc-helper" style={{ fontSize: 11, marginBottom: 4 }}>{md.photoAfter}</p>
                        <a href={visit.afterPhotoUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={visit.afterPhotoUrl}
                            alt={md.photoAfter}
                            style={{ width: '100%', height: 128, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)' }}
                          />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {visit.notes && (
                  <p className="sc-helper" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 8, margin: 0 }}>{visit.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
