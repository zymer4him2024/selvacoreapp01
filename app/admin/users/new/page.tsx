'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getSecondaryAuth, disposeSecondaryApp } from '@/lib/firebase/secondary';
import { getActiveSubContractors } from '@/lib/services/subContractorService';
import { SubContractor, User, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewUserPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { userData } = useAuth();
  const u = t.admin.users;
  const isSubAdmin = userData?.role === 'sub-admin';

  const [role, setRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [subContractorId, setSubContractorId] = useState('');
  const [subContractors, setSubContractors] = useState<SubContractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContractors, setLoadingContractors] = useState(true);

  const showSubContractor = role === 'sub-admin' || role === 'technician';

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getActiveSubContractors();
        setSubContractors(data);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : u.loadContractorsError;
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
      toast.error(u.requiredFieldsToast);
      return;
    }
    if (password.length < 6) {
      toast.error(u.passwordTooShortToast);
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
        role,
        email: email.trim(),
        displayName: displayName.trim(),
        phone: phone.trim(),
        preferredLanguage: 'en',
        subContractorId: showSubContractor ? subContractorId || null : null,
        active: true,
        emailVerified: false,
        roleSelected: true,
        ...(role === 'technician' ? { technicianStatus: 'approved' as const } : {}),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'users', newUid), newUser);

      toast.success(u.createdToast);
      router.push('/admin/users');
    } catch (error: unknown) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
      let message = error instanceof Error ? error.message : u.createError;
      if (code === 'auth/email-already-in-use') {
        message = u.emailInUseToast;
      } else if (code === 'auth/invalid-email') {
        message = u.invalidEmailToast;
      } else if (code === 'auth/weak-password') {
        message = u.passwordTooShortToast;
      }
      toast.error(message);
    } finally {
      await disposeSecondaryApp();
      setLoading(false);
    }
  };

  const allRoleOptions: Array<{ value: UserRole; label: string }> = [
    { value: 'admin', label: u.roleAdmin },
    { value: 'sub-admin', label: u.roleSubAdmin },
    { value: 'technician', label: u.roleTechnician },
    { value: 'customer', label: u.roleCustomer },
  ];
  const roleOptions = isSubAdmin
    ? allRoleOptions.filter((opt) => opt.value !== 'admin' && opt.value !== 'sub-admin')
    : allRoleOptions;

  const roleBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    fontWeight: 500,
    border: `1px solid ${active ? 'var(--brand)' : 'var(--hairline)'}`,
    background: active ? 'var(--brand)' : 'var(--off-paper)',
    color: active ? '#fff' : 'var(--soft)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720 }}>
      <Link
        href="/admin/users"
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
        {u.backToUsers}
      </Link>

      <div>
        <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{u.newPageTitle}</h1>
        <p className="sc-helper" style={{ margin: 0 }}>{u.newPageSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="sc-card-static" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <label className="sc-label">{u.roleLabel}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {roleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                style={roleBtnStyle(role === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="sc-label">{u.displayNameLabel}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="sc-input"
            placeholder={u.displayNamePlaceholder}
            required
          />
        </div>

        <div>
          <label className="sc-label">{u.emailLabel}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sc-input"
            placeholder={u.emailPlaceholder}
            autoComplete="off"
            required
          />
        </div>

        <div>
          <label className="sc-label">{u.passwordLabel}</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sc-input"
            style={{ fontFamily: 'monospace' }}
            placeholder={u.passwordPlaceholder}
            autoComplete="off"
            required
          />
          <p className="sc-helper" style={{ margin: '8px 0 0', fontSize: 12 }}>{u.passwordHelp}</p>
        </div>

        <div>
          <label className="sc-label">{u.phoneLabel}</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="sc-input"
            placeholder={u.phonePlaceholder}
          />
        </div>

        {showSubContractor && (
          <div>
            <label className="sc-label">{u.subContractorLabel}</label>
            <select
              value={subContractorId}
              onChange={(e) => setSubContractorId(e.target.value)}
              className="sc-select"
              disabled={loadingContractors}
            >
              <option value="">{u.subContractorNone}</option>
              {subContractors.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
            <p className="sc-helper" style={{ margin: '8px 0 0', fontSize: 12 }}>
              {role === 'sub-admin' ? u.subContractorHelpSubAdmin : u.subContractorHelpTechnician}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
          <Link
            href="/admin/users"
            className="sc-cta-ghost"
            style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
          >
            {u.cancel}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="sc-cta"
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <UserPlus className="w-4 h-4" />
            {loading ? u.submitting : u.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
