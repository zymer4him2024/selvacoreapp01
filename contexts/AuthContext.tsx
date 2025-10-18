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

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } else {
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

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        // New user - create basic profile
        const newUser: User = {
          id: firebaseUser.uid,
          role: 'customer', // Default role, can be changed during registration
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || undefined,
          phone: '',
          preferredLanguage: 'en',
          active: true,
          emailVerified: firebaseUser.emailVerified,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        setUserData(newUser);
      } else {
        // Existing user - update last login
        const existingUser = userDoc.data() as User;
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          { lastLoginAt: Timestamp.now() },
          { merge: true }
        );
        setUserData({ ...existingUser, lastLoginAt: Timestamp.now() });
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUserData = async (data: Partial<User>) => {
    if (!user) throw new Error('No user logged in');

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { ...data, updatedAt: Timestamp.now() },
        { merge: true }
      );

      setUserData((prev) => (prev ? { ...prev, ...data } : null));
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
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

