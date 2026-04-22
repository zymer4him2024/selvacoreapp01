'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Set session cookie for middleware auth checks
        const token = await firebaseUser.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;

        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserData({ id: userDoc.id, ...userDoc.data() } as User);
        }
      } else {
        // Clear session cookie
        document.cookie = '__session=; path=/; max-age=0';
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        const newUser: User = {
          id: firebaseUser.uid,
          role: 'customer',
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || undefined,
          phone: '',
          preferredLanguage: 'en',
          active: true,
          emailVerified: firebaseUser.emailVerified,
          roleSelected: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        setUserData(newUser);
      } else {
        const existingUser = { id: userDoc.id, ...userDoc.data() } as User;
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          { lastLoginAt: Timestamp.now() },
          { merge: true }
        );
        setUserData({ ...existingUser, lastLoginAt: Timestamp.now() });
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code !== 'auth/popup-closed-by-user' && firebaseError.code !== 'auth/cancelled-popup-request') {
        throw error;
      }
    }
  };

  const signOut = async () => {
    document.cookie = '__session=; path=/; max-age=0';
    await firebaseSignOut(auth);
    setUser(null);
    setUserData(null);
  };

  const updateUserData = async (data: Partial<User>) => {
    if (!user) throw new Error('No user logged in');

    await setDoc(
      doc(db, 'users', user.uid),
      { ...data, updatedAt: Timestamp.now() },
      { merge: true }
    );

    setUserData((prev) => (prev ? { ...prev, ...data } : null));
  };

  const value = {
    user,
    userData,
    loading,
    signInWithGoogle,
    signOut,
    updateUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

