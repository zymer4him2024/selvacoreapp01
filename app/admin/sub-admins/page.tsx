'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ShieldCheck, Building2, Mail, Phone } from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getAllSubContractors } from '@/lib/services/subContractorService';
import { SubContractor, User } from '@/types';
import { formatPhone } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function SubAdminsPage() {
  const { t } = useTranslation();
  const { userData } = useAuth();
  const router = useRouter();
  const sa = t.admin.subAdmins;
  const [subAdmins, setSubAdmins] = useState<User[]>([]);
  const [contractorMap, setContractorMap] = useState<Record<string, SubContractor>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.replace('/admin');
    }
  }, [userData, router]);

  const load = async () => {
    try {
      setLoading(true);
      const [usersSnap, contractors] = await Promise.all([
        getDocs(
          query(
            collection(db, 'users'),
            where('role', '==', 'sub-admin'),
            orderBy('createdAt', 'desc')
          )
        ),
        getAllSubContractors(),
      ]);

      const users: User[] = usersSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as User)
      );
      const map: Record<string, SubContractor> = {};
      contractors.forEach((c) => {
        map[c.id] = c;
      });

      setSubAdmins(users);
      setContractorMap(map);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sa.loadError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = async (user: User) => {
    const next = !user.active;
    const confirmMsg = (next ? sa.confirmActivateFormat : sa.confirmDeactivateFormat)
      .replace('{name}', user.displayName);
    if (!confirm(confirmMsg)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        active: next,
        updatedAt: Timestamp.now(),
      });
      toast.success(next ? sa.activatedToast : sa.deactivatedToast);
      load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sa.updateFailed;
      toast.error(message);
    }
  };

  if (userData && userData.role !== 'admin') return null;

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="sc-spinner" />
          <p className="sc-helper" style={{ margin: 0 }}>{sa.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{sa.title}</h1>
          <p className="sc-helper" style={{ margin: 0 }}>{sa.subtitle}</p>
        </div>
        <Link
          href="/admin/sub-admins/new"
          className="sc-cta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <Plus className="w-5 h-5" />
          {sa.newSubAdmin}
        </Link>
      </div>

      {subAdmins.length === 0 ? (
        <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <ShieldCheck className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--soft)' }} />
          <h3 className="sc-h2" style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>{sa.noSubAdminsTitle}</h3>
          <p className="sc-helper" style={{ margin: 0, marginBottom: 24 }}>{sa.noSubAdminsDescription}</p>
          <Link
            href="/admin/sub-admins/new"
            className="sc-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <Plus className="w-5 h-5" />
            {sa.createFirst}
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 24,
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          }}
        >
          {subAdmins.map((user) => {
            const contractor = user.subContractorId ? contractorMap[user.subContractorId] : null;
            return (
              <div key={user.id} className="sc-card-static">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--brand-tint)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck className="w-8 h-8" style={{ color: 'var(--brand)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="sc-h2" style={{ margin: 0, fontSize: 18 }}>{user.displayName}</h3>
                        <p className="sc-helper" style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="sc-helper" style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Phone className="w-3.5 h-3.5" />
                            {formatPhone(user.phone)}
                          </p>
                        )}
                      </div>
                      <span
                        style={{
                          padding: '4px 12px',
                          fontSize: 12,
                          fontWeight: 500,
                          borderRadius: 'var(--radius-full)',
                          background: user.active ? 'var(--brand-tint)' : 'rgba(239,68,68,0.15)',
                          color: user.active ? 'var(--brand)' : '#ef4444',
                          flexShrink: 0,
                        }}
                      >
                        {user.active ? sa.activeBadge : sa.inactiveBadge}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--soft)', marginBottom: 16 }}>
                      <Building2 className="w-4 h-4" />
                      <span>{contractor ? contractor.name : sa.noContractor}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                      <button
                        onClick={() => toggleActive(user)}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 14,
                          fontWeight: 500,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          background: user.active ? 'var(--off-paper)' : 'var(--brand-tint)',
                          color: user.active ? 'var(--ink)' : 'var(--brand)',
                        }}
                        onMouseEnter={(e) => {
                          if (user.active) {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                            e.currentTarget.style.color = '#ef4444';
                          } else {
                            e.currentTarget.style.background = 'var(--brand)';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = user.active ? 'var(--off-paper)' : 'var(--brand-tint)';
                          e.currentTarget.style.color = user.active ? 'var(--ink)' : 'var(--brand)';
                        }}
                      >
                        {user.active ? sa.deactivate : sa.activate}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
