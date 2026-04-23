// Secondary Firebase app for admin-created accounts.
// Using a named app instance keeps the admin's auth session untouched
// while we provision auth users for sub-admins/technicians.

import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const SECONDARY_APP_NAME = 'admin-secondary';

export function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  const app = existing ?? initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  return getAuth(app);
}

export async function disposeSecondaryApp() {
  const existing = getApps().find((a) => a.name === SECONDARY_APP_NAME);
  if (!existing) return;
  try {
    await signOut(getAuth(existing));
  } catch {
    // Ignore sign-out errors on disposal
  }
  try {
    await deleteApp(existing);
  } catch {
    // Ignore deletion errors
  }
}
