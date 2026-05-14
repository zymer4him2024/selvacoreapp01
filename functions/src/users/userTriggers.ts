import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

// Deletes the matching Firebase Auth account when a users/{uid} doc is deleted
// from Firestore. Without this, admin's "Delete user" action leaves an orphaned
// Auth identity, which then collides on email when re-creating the user.
export const onUserDocDeleted = onDocumentDeleted('users/{userId}', async (event) => {
  const userId = event.params.userId;
  try {
    await getAuth().deleteUser(userId);
    logger.info(`Deleted Auth account for user ${userId}`);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/user-not-found') {
      logger.info(`No Auth account for user ${userId} — nothing to delete`);
      return;
    }
    logger.error(`Failed to delete Auth account for user ${userId}`, err);
    throw err;
  }
});
