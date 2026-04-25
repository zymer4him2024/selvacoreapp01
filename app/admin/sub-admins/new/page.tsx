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
import { useTranslation } from '@/hooks/useTranslation';

export default function NewSubAdminPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const sn = t.admin.subAdminNew;
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
          error instanceof Error ? error.message : sn.loadContractorsError;
        toast.error(message);
      } finally {
        setLoadingContractors(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password || !displayName.trim()) {
      toast.error(sn.requiredFieldsToast);
      return;
    }
    if (password.length < 6) {
      toast.error(sn.passwordTooShortToast);
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

      toast.success(sn.createdToast);
      router.push('/admin/sub-admins');
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
      let message = error instanceof Error ? error.message : sn.createError;
      if (code === 'auth/email-already-in-use') {
        message = sn.emailInUseToast;
      } else if (code === 'auth/invalid-email') {
        message = sn.invalidEmailToast;
      } else if (code === 'auth/weak-password') {
        message = sn.passwordTooShortToast;
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
        {sn.backToSubAdmins}
      </Link>

      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">{sn.pageTitle}</h1>
        <p className="text-text-secondary">{sn.pageSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="apple-card space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">{sn.displayNameLabel}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
            placeholder={sn.displayNamePlaceholder}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{sn.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
            placeholder={sn.emailPlaceholder}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{sn.passwordLabel}</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all font-mono"
            placeholder={sn.passwordPlaceholder}
            autoComplete="off"
            required
          />
          <p className="text-xs text-text-tertiary mt-2">{sn.passwordHelp}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{sn.phoneLabel}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
            placeholder={sn.phonePlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{sn.subContractorLabel}</label>
          <select
            value={subContractorId}
            onChange={(e) => setSubContractorId(e.target.value)}
            className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
            disabled={loadingContractors}
          >
            <option value="">{sn.subContractorNone}</option>
            {subContractors.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-2">{sn.subContractorHelp}</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/sub-admins"
            className="flex-1 px-6 py-3 bg-surface-elevated hover:bg-surface-secondary text-center rounded-apple font-medium transition-all"
          >
            {sn.cancel}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold rounded-apple transition-all hover:scale-[1.01] shadow-apple"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? sn.submitting : sn.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
