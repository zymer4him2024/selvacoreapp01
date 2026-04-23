import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { MaintenanceSchedule, MaintenanceVisit, MaintenanceVisitChecks, Device } from '@/types/device';
import { logTransaction } from './transactionService';

export interface MaintenanceWithDevice extends MaintenanceSchedule {
  device: Device;
}

export interface MaintenanceSummaryStats {
  totalDevices: number;
  overdueCount: number;
  upcomingThisWeek: number;
  upcomingThisMonth: number;
}

export async function getSchedulesByDeviceId(deviceId: string): Promise<MaintenanceSchedule[]> {
  const q = query(
    collection(db, 'maintenanceSchedules'),
    where('deviceId', '==', deviceId),
    orderBy('type', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceSchedule));
}

export async function getUpcomingMaintenance(daysAhead: number): Promise<MaintenanceWithDevice[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const q = query(
    collection(db, 'maintenanceSchedules'),
    where('nextDueDate', '<=', Timestamp.fromDate(futureDate)),
    orderBy('nextDueDate', 'asc')
  );
  const snapshot = await getDocs(q);
  const schedules = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceSchedule));

  return joinWithDevices(schedules);
}

export async function getOverdueMaintenance(): Promise<MaintenanceWithDevice[]> {
  const now = Timestamp.now();

  const q = query(
    collection(db, 'maintenanceSchedules'),
    where('nextDueDate', '<', now),
    orderBy('nextDueDate', 'asc')
  );
  const snapshot = await getDocs(q);
  const schedules = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceSchedule));

  return joinWithDevices(schedules);
}

export async function completeMaintenance(
  scheduleId: string,
  completedBy: string,
  notes?: string
): Promise<void> {
  const scheduleRef = doc(db, 'maintenanceSchedules', scheduleId);
  const scheduleSnap = await getDoc(scheduleRef);
  if (!scheduleSnap.exists()) throw new Error('Schedule not found');

  const schedule = { id: scheduleSnap.id, ...scheduleSnap.data() } as MaintenanceSchedule;
  const now = Timestamp.now();

  // Calculate next due date
  const nextDueMs = now.toDate().getTime() + schedule.intervalDays * 24 * 60 * 60 * 1000;
  const nextDueDate = Timestamp.fromDate(new Date(nextDueMs));

  const newCompletion = {
    completedAt: now,
    completedBy,
    notes: notes || '',
  };

  const batch = writeBatch(db);

  // Update schedule (also reset escalation level)
  batch.update(scheduleRef, {
    lastCompletedAt: now,
    nextDueDate,
    completionHistory: [...schedule.completionHistory, newCompletion],
    escalationLevel: 0,
  });

  // Update denormalized fields on device
  const deviceRef = doc(db, 'devices', schedule.deviceId);
  if (schedule.type === 'ezer_maintenance') {
    batch.update(deviceRef, {
      lastEzerMaintenanceAt: now,
      nextEzerMaintenanceDue: nextDueDate,
    });
  } else {
    // For filter replacement, find the earliest next due across all filter schedules
    const allFilterSchedules = await getFilterSchedulesForDevice(schedule.deviceId, scheduleId);
    const earliestNextDue = allFilterSchedules.reduce((earliest, s) => {
      const sDue = s.nextDueDate.toDate().getTime();
      return sDue < earliest ? sDue : earliest;
    }, nextDueMs);

    batch.update(deviceRef, {
      lastFilterReplacementAt: now,
      nextFilterReplacementDue: Timestamp.fromDate(new Date(earliestNextDue)),
    });
  }

  await batch.commit();

  // Log transaction
  await logTransaction({
    type: 'maintenance_completed',
    metadata: {
      scheduleId,
      deviceId: schedule.deviceId,
      maintenanceType: schedule.type,
      filterName: schedule.filterName || null,
      notes: notes || '',
    },
    performedBy: completedBy,
    performedByRole: 'admin',
  });

  // Send completion email to customer via Firebase Trigger Email extension
  const deviceSnap = await getDoc(doc(db, 'devices', schedule.deviceId));
  if (deviceSnap.exists()) {
    const device = deviceSnap.data() as Device;
    const customerEmail = device.customerInfo?.email;
    if (customerEmail) {
      const productName = device.productSnapshot?.name?.en || 'your device';
      const maintenanceType = schedule.type === 'ezer_maintenance'
        ? 'Ezer maintenance'
        : `Filter replacement (${schedule.filterName || 'filter'})`;

      // Look up technician name
      let techName = 'a technician';
      const userSnap = await getDoc(doc(db, 'users', completedBy));
      if (userSnap.exists()) {
        techName = userSnap.data()?.displayName || techName;
      }

      await addDoc(collection(db, 'mail'), {
        to: customerEmail,
        message: {
          subject: `Maintenance Completed — ${productName} — Selvacore`,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h2 style="color: #34C759;">Maintenance Completed</h2><p><strong>${maintenanceType}</strong> for your <strong>${productName}</strong> has been completed by <strong>${techName}</strong>.</p><p>Your device maintenance timer has been reset. You will be notified when the next service is due.</p><p style="color: #86868B; font-size: 14px; margin-top: 24px;">— Selvacore Team</p></div>`,
        },
      });
    }
  }
}

export async function getMaintenanceSummaryStats(): Promise<MaintenanceSummaryStats> {
  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [devicesSnap, overdueSnap, weekSnap, monthSnap] = await Promise.all([
    getDocs(collection(db, 'devices')),
    getDocs(query(
      collection(db, 'maintenanceSchedules'),
      where('nextDueDate', '<', Timestamp.fromDate(now))
    )),
    getDocs(query(
      collection(db, 'maintenanceSchedules'),
      where('nextDueDate', '>=', Timestamp.fromDate(now)),
      where('nextDueDate', '<=', Timestamp.fromDate(oneWeek))
    )),
    getDocs(query(
      collection(db, 'maintenanceSchedules'),
      where('nextDueDate', '>=', Timestamp.fromDate(now)),
      where('nextDueDate', '<=', Timestamp.fromDate(oneMonth))
    )),
  ]);

  return {
    totalDevices: devicesSnap.size,
    overdueCount: overdueSnap.size,
    upcomingThisWeek: weekSnap.size,
    upcomingThisMonth: monthSnap.size,
  };
}

// Helper: join schedules with their device data
async function joinWithDevices(schedules: MaintenanceSchedule[]): Promise<MaintenanceWithDevice[]> {
  const deviceIds = [...new Set(schedules.map((s) => s.deviceId))];
  const deviceMap = new Map<string, Device>();

  for (const deviceId of deviceIds) {
    const deviceSnap = await getDoc(doc(db, 'devices', deviceId));
    if (deviceSnap.exists()) {
      deviceMap.set(deviceId, { id: deviceSnap.id, ...deviceSnap.data() } as Device);
    }
  }

  return schedules
    .filter((s) => deviceMap.has(s.deviceId))
    .map((s) => ({ ...s, device: deviceMap.get(s.deviceId)! }));
}

// Helper: get all filter schedules for a device, excluding one being updated
async function getFilterSchedulesForDevice(
  deviceId: string,
  excludeScheduleId: string
): Promise<MaintenanceSchedule[]> {
  const q = query(
    collection(db, 'maintenanceSchedules'),
    where('deviceId', '==', deviceId),
    where('type', '==', 'filter_replacement')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .filter((d) => d.id !== excludeScheduleId)
    .map((d) => ({ id: d.id, ...d.data() } as MaintenanceSchedule));
}

// ── Maintenance Visit Functions ──

export async function createMaintenanceVisit(
  deviceId: string,
  technicianId: string,
  technicianName: string,
  checks: MaintenanceVisitChecks,
  notes: string,
  beforePhotoUrl?: string,
  afterPhotoUrl?: string
): Promise<string> {
  const visitPayload: Record<string, unknown> = {
    deviceId,
    technicianId,
    technicianName,
    checks,
    notes,
    createdAt: Timestamp.now(),
  };
  if (beforePhotoUrl) visitPayload.beforePhotoUrl = beforePhotoUrl;
  if (afterPhotoUrl) visitPayload.afterPhotoUrl = afterPhotoUrl;

  const visitRef = await addDoc(collection(db, 'maintenanceVisits'), visitPayload);

  await logTransaction({
    type: 'maintenance_visit',
    metadata: { visitId: visitRef.id, deviceId, checks, notes },
    performedBy: technicianId,
    performedByRole: 'technician',
  });

  return visitRef.id;
}

/**
 * Completes a visit and resets the appropriate schedules in a single logical unit.
 * Auto-reset rules:
 *   ezer_maintenance → reset if installationOk && operationOk && waterPressureOk
 *   filter_replacement with filterName matching /sediment/i → reset if sedimentFilterReplaced
 *   filter_replacement with filterName matching /carbon/i   → reset if carbonFilterReplaced
 */
export async function completeVisitAndResetSchedules(
  device: Device,
  technicianId: string,
  technicianName: string,
  checks: MaintenanceVisitChecks,
  notes: string,
  beforePhotoUrl?: string,
  afterPhotoUrl?: string
): Promise<string> {
  const visitId = await createMaintenanceVisit(
    device.id,
    technicianId,
    technicianName,
    checks,
    notes,
    beforePhotoUrl,
    afterPhotoUrl
  );

  const schedules = await getSchedulesByDeviceId(device.id);
  const ezerPassed = checks.installationOk && checks.operationOk && checks.waterPressureOk;
  const visitRef = `visit:${visitId}${notes ? ` — ${notes}` : ''}`;

  for (const schedule of schedules) {
    if (schedule.type === 'ezer_maintenance' && ezerPassed) {
      await completeMaintenance(schedule.id, technicianId, visitRef);
      continue;
    }
    if (schedule.type === 'filter_replacement' && schedule.filterName) {
      if (checks.sedimentFilterReplaced && /sediment/i.test(schedule.filterName)) {
        await completeMaintenance(schedule.id, technicianId, visitRef);
        continue;
      }
      if (checks.carbonFilterReplaced && /carbon/i.test(schedule.filterName)) {
        await completeMaintenance(schedule.id, technicianId, visitRef);
      }
    }
  }

  return visitId;
}

export async function getVisitsByDeviceId(deviceId: string): Promise<MaintenanceVisit[]> {
  const q = query(
    collection(db, 'maintenanceVisits'),
    where('deviceId', '==', deviceId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MaintenanceVisit));
}

export async function updateVisitNotes(visitId: string, notes: string): Promise<void> {
  await updateDoc(doc(db, 'maintenanceVisits', visitId), { notes });
}
