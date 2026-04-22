import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { createNotification } from '../notifications/createNotification';
import { reminderEmail, overdueEmail, criticalEmail } from './emailTemplates';
import { autoAssignMaintenance } from './autoAssign';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Escalation levels:
 * 0 — Reminder: 7 days before due
 * 1 — Due: on due date
 * 2 — Overdue: 3+ days past due
 * 3 — Critical: 7+ days past due
 * 4 — Auto-assign: 14+ days past due (handled in Phase 5)
 */
function computeEscalationLevel(daysOverdue: number): number {
  if (daysOverdue >= 14) return 4;
  if (daysOverdue >= 7) return 3;
  if (daysOverdue >= 3) return 2;
  if (daysOverdue >= 0) return 1;
  return 0; // not yet due
}

/**
 * Daily at 09:00 UTC — scan maintenanceSchedules for overdue and upcoming
 * items. Create in-app notifications and apply escalation levels.
 *
 * Escalation levels are progressive: once a schedule reaches a level, it stays
 * at that level until maintenance is completed.
 */
export const sendMaintenanceReminders = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'UTC' },
  async () => {
    const now = Timestamp.now();
    const nowMs = now.toMillis();
    const sevenDaysFromNow = Timestamp.fromDate(new Date(nowMs + 7 * MS_PER_DAY));
    const oneDayAgo = Timestamp.fromDate(new Date(nowMs - MS_PER_DAY));

    // Query all schedules due within the next 7 days OR overdue
    const snap = await db
      .collection('maintenanceSchedules')
      .where('nextDueDate', '<=', sevenDaysFromNow)
      .get();

    if (snap.empty) {
      console.log('No maintenance schedules due — nothing to process.');
      return;
    }

    let notified = 0;
    let escalated = 0;

    for (const scheduleDoc of snap.docs) {
      const schedule = scheduleDoc.data();
      const nextDueMs = schedule.nextDueDate.toMillis();
      const daysOverdue = Math.floor((nowMs - nextDueMs) / MS_PER_DAY);
      const currentLevel = schedule.escalationLevel || 0;
      const newLevel = computeEscalationLevel(daysOverdue);

      // Fetch the parent device
      const deviceSnap = await db.collection('devices').doc(schedule.deviceId).get();
      if (!deviceSnap.exists) continue;
      const device = deviceSnap.data();
      if (!device) continue;

      const productName =
        device.productSnapshot?.name?.en || device.productSnapshot?.name || 'your device';
      const subject =
        schedule.type === 'ezer_maintenance'
          ? 'Ezer maintenance'
          : `Filter replacement (${schedule.filterName || 'filter'})`;

      // Update escalation level if it increased
      const updateData: Record<string, unknown> = {};
      if (newLevel > currentLevel) {
        updateData.escalationLevel = newLevel;
        escalated++;

        // Auto-assign technician at level 4 (14+ days overdue)
        if (newLevel >= 4 && currentLevel < 4) {
          try {
            await autoAssignMaintenance(scheduleDoc.id, schedule.deviceId, device, schedule);
          } catch (err) {
            console.error(`Failed to auto-assign for schedule ${scheduleDoc.id}:`, err);
          }
        }
      }

      // Skip notification if we already sent one in the last 24h
      const lastSent: Timestamp | undefined = schedule.lastReminderSentAt;
      const shouldNotify = !lastSent || lastSent.toMillis() <= oneDayAgo.toMillis();

      if (shouldNotify) {
        // Determine notification content based on escalation level
        let title: string;
        let body: string;
        let type: 'maintenance_due_soon' | 'maintenance_overdue';

        if (newLevel >= 3) {
          type = 'maintenance_overdue';
          title = 'CRITICAL: Maintenance Overdue';
          body = `${subject} for ${productName} is ${daysOverdue} days overdue. Immediate attention required.`;
        } else if (newLevel >= 2) {
          type = 'maintenance_overdue';
          title = 'Maintenance Overdue';
          body = `${subject} for ${productName} is ${daysOverdue} days overdue. Please schedule service.`;
        } else if (newLevel >= 1) {
          type = 'maintenance_overdue';
          title = 'Maintenance Due';
          body = `${subject} for ${productName} is due today. Please schedule service.`;
        } else {
          type = 'maintenance_due_soon';
          title = 'Maintenance Due Soon';
          body = `${subject} for ${productName} is due within 7 days.`;
        }

        // Notify customer
        if (device.customerId) {
          await createNotification({
            userId: device.customerId,
            type,
            title,
            body,
            link: `/customer/devices`,
            metadata: {
              deviceId: schedule.deviceId,
              scheduleId: scheduleDoc.id,
              scheduleType: schedule.type,
              escalationLevel: newLevel,
              nextDueDate: schedule.nextDueDate,
            },
          });
          notified++;
        }

        // Send emails via Firebase Trigger Email extension (writes to 'mail' collection)
        const customerEmail = device.customerInfo?.email;
        const customerName = device.customerInfo?.name || 'Customer';
        const address = `${device.installationAddress?.city || ''}, ${device.installationAddress?.state || ''}`;
        const dueDateStr = schedule.nextDueDate.toDate().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        });

        if (customerEmail) {
          if (newLevel === 0) {
            // 7-day reminder email to customer
            await db.collection('mail').add(reminderEmail(customerEmail, productName, subject, dueDateStr));
          } else if (newLevel >= 2 && newLevel < 3) {
            // Overdue email to customer
            await db.collection('mail').add(overdueEmail(customerEmail, productName, subject, daysOverdue, customerName, address));
          }
        }

        // For critical levels (3+), also notify admins
        if (newLevel >= 3) {
          const adminSnap = await db
            .collection('users')
            .where('role', '==', 'admin')
            .where('active', '==', true)
            .get();

          for (const adminDoc of adminSnap.docs) {
            await createNotification({
              userId: adminDoc.id,
              type: 'maintenance_overdue',
              title: `CRITICAL: ${productName} — ${subject}`,
              body: `Device at ${address} is ${daysOverdue} days overdue. Customer: ${customerName}.`,
              link: `/admin/maintenance/${schedule.deviceId}`,
              metadata: {
                deviceId: schedule.deviceId,
                scheduleId: scheduleDoc.id,
                escalationLevel: newLevel,
              },
            });

            // Critical email to admin
            const adminData = adminDoc.data();
            if (adminData?.email) {
              await db.collection('mail').add(
                criticalEmail(adminData.email, productName, subject, daysOverdue, customerName, address, schedule.deviceId)
              );
            }
          }

          // Also send overdue email to customer for critical level
          if (customerEmail) {
            await db.collection('mail').add(overdueEmail(customerEmail, productName, subject, daysOverdue, customerName, address));
          }
        }

        updateData.lastReminderSentAt = now;
      }

      // Log escalation transaction if level changed
      if (newLevel > currentLevel) {
        await db.collection('transactions').add({
          type: 'maintenance_escalated',
          metadata: {
            deviceId: schedule.deviceId,
            scheduleId: scheduleDoc.id,
            previousLevel: currentLevel,
            newLevel,
            daysOverdue,
          },
          performedBy: 'system',
          performedByRole: 'system',
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // Apply updates
      if (Object.keys(updateData).length > 0) {
        await scheduleDoc.ref.update(updateData);
      }
    }

    console.log(`Processed ${snap.docs.length} schedules. Notified: ${notified}, Escalated: ${escalated}.`);
  }
);
