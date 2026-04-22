import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { createNotification } from '../notifications/createNotification';

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * Handle technician status changes (approval, decline, suspension)
 * Logs the event and could send notifications in the future.
 */
export const onTechnicianStatusChange = onDocumentUpdated('users/{userId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  // Only process technician role documents
  if (after.role !== 'technician') return;

  const oldStatus = before.technicianStatus;
  const newStatus = after.technicianStatus;

  // Status didn't change
  if (oldStatus === newStatus) return;

  // Log the technician status change as a transaction
  await db.collection('transactions').add({
    type: 'technician_status_change',
    metadata: {
      userId: event.params.userId,
      technicianName: after.displayName || after.email,
      previousStatus: oldStatus || 'none',
      newStatus: newStatus,
      adminNotes: after.adminNotes || '',
    },
    performedBy: 'system',
    performedByRole: 'system',
    timestamp: FieldValue.serverTimestamp(),
  });

  // If approved, update the sub-contractor stats
  if (newStatus === 'approved' && after.subContractorId) {
    const contractorRef = db.doc(`subContractors/${after.subContractorId}`);
    const contractorSnap = await contractorRef.get();
    if (contractorSnap.exists) {
      await contractorRef.update({
        'stats.totalInstallers': FieldValue.increment(1),
      });
    }
  }

  // If suspended/declined from approved, decrement the sub-contractor count
  if (oldStatus === 'approved' && (newStatus === 'suspended' || newStatus === 'declined') && after.subContractorId) {
    const contractorRef = db.doc(`subContractors/${after.subContractorId}`);
    const contractorSnap = await contractorRef.get();
    if (contractorSnap.exists) {
      await contractorRef.update({
        'stats.totalInstallers': FieldValue.increment(-1),
      });
    }
  }

  // Notify the technician about their status change
  const notificationMap: Record<string, { type: 'technician_approved' | 'technician_declined' | 'technician_suspended'; title: string; body: string }> = {
    approved: {
      type: 'technician_approved',
      title: 'Application Approved',
      body: 'Your technician application has been approved. You can now start accepting jobs.',
    },
    declined: {
      type: 'technician_declined',
      title: 'Application Declined',
      body: after.adminNotes
        ? `Your application was declined. Reason: ${after.adminNotes}`
        : 'Your technician application has been declined.',
    },
    suspended: {
      type: 'technician_suspended',
      title: 'Account Suspended',
      body: after.adminNotes
        ? `Your account has been suspended. Reason: ${after.adminNotes}`
        : 'Your technician account has been suspended.',
    },
  };

  const notifData = notificationMap[newStatus];
  if (notifData) {
    await createNotification({
      userId: event.params.userId,
      ...notifData,
      link: '/technician/profile',
      metadata: { previousStatus: oldStatus || 'none', newStatus },
    });
  }
});
