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
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewSubAdminPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const { t } = useTranslation();
  const sn = t.admin.subAdminNew;

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.replace('/admin');
    }
  }, [userData, router]);
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

    if (userData?.role !== 'admin') return;
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

  if (userData && userData.role !== 'admin') return null;

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720 }}>
      <Link
        href="/admin/sub-admins"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--soft)',
          textDecoration: 'none',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--soft)'; }}
      >
        <ArrowLeft className="w-4 h-4" />
        {sn.backToSubAdmins}
      </Link>

      <div>
        <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{sn.pageTitle}</h1>
        <p className="sc-helper" style={{ margin: 0 }}>{sn.pageSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="sc-card-static" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <label className="sc-label">{sn.displayNameLabel}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="sc-input"
            placeholder={sn.displayNamePlaceholder}
            required
          />
        </div>

        <div>
          <label className="sc-label">{sn.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sc-input"
            placeholder={sn.emailPlaceholder}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="sc-label">{sn.passwordLabel}</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sc-input"
            style={{ fontFamily: 'monospace' }}
            placeholder={sn.passwordPlaceholder}
            autoComplete="off"
            required
          />
          <p className="sc-helper" style={{ margin: '8px 0 0', fontSize: 12 }}>{sn.passwordHelp}</p>
        </div>

        <div>
          <label className="sc-label">{sn.phoneLabel}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="sc-input"
            placeholder={sn.phonePlaceholder}
          />
        </div>

        <div>
          <label className="sc-label">{sn.subContractorLabel}</label>
          <select
            value={subContractorId}
            onChange={(e) => setSubContractorId(e.target.value)}
            className="sc-select"
            disabled={loadingContractors}
          >
            <option value="">{sn.subContractorNone}</option>
            {subContractors.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
          <p className="sc-helper" style={{ margin: '8px 0 0', fontSize: 12 }}>{sn.subContractorHelp}</p>
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <Link
            href="/admin/sub-admins"
            className="sc-cta-ghost"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
          >
            {sn.cancel}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="sc-cta"
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <UserPlus className="w-4 h-4" />
            {loading ? sn.submitting : sn.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
