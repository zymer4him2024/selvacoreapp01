'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getSecondaryAuth, disposeSecondaryApp } from '@/lib/firebase/secondary';
import { getActiveSubContractors } from '@/lib/services/subContractorService';
import { SubContractor, User } from '@/types';
import toast from 'react-hot-toast';

export default function NewSubAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [subContractorId, setSubContractorId] = useState('');
  const [subContractors, setSubContractors] = useState<SubContractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContractors, setLoadingContractors] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActiveSubContractors();
        setSubContractors(data);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to load sub-contractors';
        toast.error(message);
      } finally {
        setLoadingContractors(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password || !displayName.trim()) {
      toast.error('Email, password, and display name are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      const result = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        password
      );
      const newUid = result.user.uid;

      try {
        await updateProfile(result.user, { displayName: displayName.trim() });
      } catch {
        // Non-fatal
      }

      const newUser: User = {
        id: newUid,
        role: 'sub-admin',
        email: email.trim(),
        displayName: displayName.trim(),
        phone: phone.trim(),
        preferredLanguage: 'en',
        subContractorId: subContractorId || null,
        active: true,
        emailVerified: false,
        roleSelected: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'users', newUid), newUser);

      toast.success('Sub-admin created');
      router.push('/admin/sub-admins');
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
      let message = error instanceof Error ? error.message : 'Failed to create sub-admin';
      if (code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists';
      } else if (code === 'auth/invalid-email') {
        message = 'Invalid email address';
      } else if (code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters';
      }
      toast.error(message);
    } finally {
      await disposeSecondaryApp();
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <Link
        href="/admin/sub-admins"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sub-Admins
      </Link>

      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">New Sub-Admin</h1>
        <p className="text-text-secondary">
          Creates a scoped admin account tied to a sub-contractor.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="apple-card space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Display name *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
            placeholder="Jane Doe"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
            placeholder="jane@contractor.com"
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Temporary password *</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all font-mono"
            placeholder="At least 6 characters"
            autoComplete="off"
            required
          />
          <p className="text-xs text-text-tertiary mt-2">
            Share this with the sub-admin. They should change it after first sign-in from Settings.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
            placeholder="+1 555 123 4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sub-Contractor</label>
          <select
            value={subContractorId}
            onChange={(e) => setSubContractorId(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
            disabled={loadingContractors}
          >
            <option value="">— None —</option>
            {subContractors.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-2">
            Sub-admins see only technicians and orders scoped to this contractor.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/sub-admins"
            className="flex-1 px-6 py-3 bg-surface-elevated hover:bg-surface-secondary text-center rounded-apple font-medium transition-all"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold rounded-apple transition-all hover:scale-[1.01] shadow-apple"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating…' : 'Create sub-admin'}
          </button>
        </div>
      </form>
    </div>
  );
}
