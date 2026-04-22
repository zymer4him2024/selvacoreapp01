import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export type NotificationType =
  | 'order_placed'
  | 'order_accepted'
  | 'order_started'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_reassigned'
  | 'new_job_available'
  | 'technician_approved'
  | 'technician_declined'
  | 'technician_suspended'
  | 'maintenance_due_soon'
  | 'maintenance_overdue';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Shared helper — writes a single notification document.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const db = getFirestore();
  await db.collection('notifications').add({
    ...input,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Creates the same notification for multiple users (e.g. fan-out to all eligible technicians).
 */
export async function createNotificationForMany(
  userIds: string[],
  payload: Omit<CreateNotificationInput, 'userId'>
): Promise<void> {
  if (userIds.length === 0) return;
  const db = getFirestore();
  const batch = db.batch();
  userIds.forEach((userId) => {
    const ref = db.collection('notifications').doc();
    batch.set(ref, {
      ...payload,
      userId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
}
