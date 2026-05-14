'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  Building2,
  Users as UsersIcon,
  Edit,
  Trash2,
  Package as PackageIcon,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  getAllSubContractors,
  deleteSubContractor,
} from '@/lib/services/subContractorService';
import { SubContractor, User, UserRole } from '@/types';
import { formatPhone } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'all' | 'sub-admins' | 'sub-contractors';
type RoleFilter = 'all' | UserRole;

export default function UsersPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
  const { user: authUser, userData } = useAuth();
  const isSubAdmin = userData?.role === 'sub-admin';
  const u = t.admin.users;
  const sa = t.admin.subAdmins;
  const sc = t.admin.subContractors;

  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: Tab =
    tabParam === 'sub-admins' || tabParam === 'sub-contractors' ? tabParam : 'all';
  const [tab, setTab] = useState<Tab>(initialTab);

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');

  const [subAdmins, setSubAdmins] = useState<User[]>([]);
  const [subAdminsLoading, setSubAdminsLoading] = useState(true);
  const [contractorMap, setContractorMap] = useState<Record<string, SubContractor>>({});

  const [subContractors, setSubContractors] = useState<SubContractor[]>([]);
  const [subContractorsLoading, setSubContractorsLoading] = useState(true);
  const [scSearch, setScSearch] = useState('');

  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        setUsersLoading(true);
        const snap = await getDocs(
          query(collection(db, 'users'), orderBy('createdAt', 'desc'))
        );
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : u.loadError;
        toast.error(message);
      } finally {
        setUsersLoading(false);
      }
    };
    loadAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSubAdmins = async () => {
    try {
      setSubAdminsLoading(true);
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
      const list: User[] = usersSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as User)
      );
      const map: Record<string, SubContractor> = {};
      contractors.forEach((c) => {
        map[c.id] = c;
      });
      setSubAdmins(list);
      setContractorMap(map);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sa.loadError;
      toast.error(message);
    } finally {
      setSubAdminsLoading(false);
    }
  };

  const loadSubContractors = async () => {
    try {
      setSubContractorsLoading(true);
      const data = await getAllSubContractors();
      setSubContractors(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sc.loadError;
      toast.error(message);
    } finally {
      setSubContractorsLoading(false);
    }
  };

  useEffect(() => {
    loadSubAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSubContractors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTab = (next: Tab) => {
    setTab(next);
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    if (next === 'all') {
      sp.delete('tab');
    } else {
      sp.set('tab', next);
    }
    const qs = sp.toString();
    router.replace(qs ? `/admin/users?${qs}` : '/admin/users');
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((row) => {
      if (filter !== 'all' && row.role !== filter) return false;
      if (!term) return true;
      return (
        row.displayName?.toLowerCase().includes(term) ||
        row.email?.toLowerCase().includes(term)
      );
    });
  }, [users, filter, search]);

  const filteredContractors = useMemo(() => {
    const term = scSearch.trim().toLowerCase();
    if (!term) return subContractors;
    return subContractors.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.address.city.toLowerCase().includes(term)
    );
  }, [subContractors, scSearch]);

  const roleLabel = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return u.roleAdmin;
      case 'sub-admin':
        return u.roleSubAdmin;
      case 'technician':
        return u.roleTechnician;
      case 'customer':
        return u.roleCustomer;
    }
  };

  const filterButtons: Array<{ key: RoleFilter; label: string }> = [
    { key: 'all', label: u.filterAll },
    { key: 'admin', label: u.filterAdmin },
    { key: 'sub-admin', label: u.filterSubAdmin },
    { key: 'technician', label: u.filterTechnician },
    { key: 'customer', label: u.filterCustomer },
  ];

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'all', label: u.tabAllUsers },
    { key: 'sub-admins', label: u.tabSubAdmins },
    { key: 'sub-contractors', label: u.tabSubContractors },
  ];

  const toggleSubAdminActive = async (user: User) => {
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
      loadSubAdmins();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sa.updateFailed;
      toast.error(message);
    }
  };

  const handleDeleteUser = async (row: User) => {
    if (authUser && row.id === authUser.uid) {
      toast.error(u.deleteSelfBlocked);
      return;
    }
    const name = row.displayName || row.email || row.id;
    const msg = u.confirmDeleteFormat.replace('{name}', name);
    if (!confirm(msg)) return;
    if (!confirm(u.confirmDeleteAgain)) return;
    try {
      await deleteDoc(doc(db, 'users', row.id));
      toast.success(u.deletedToast);
      setUsers((prev) => prev.filter((item) => item.id !== row.id));
      if (row.role === 'sub-admin') loadSubAdmins();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : u.deleteError;
      toast.error(message);
    }
  };

  const handleDeleteContractor = async (id: string, name: string) => {
    if (!confirm(sc.confirmDelete.replace('{name}', name))) return;
    try {
      await deleteSubContractor(id);
      toast.success(sc.deletedSuccess);
      loadSubContractors();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sc.deleteError;
      toast.error(message);
    }
  };

  const renderHeaderAction = () => {
    if (tab === 'sub-contractors') {
      return (
        <Link
          href="/admin/sub-contractors/new"
          className="sc-cta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <Plus className="w-4 h-4" />
          {sc.addSubContractor}
        </Link>
      );
    }
    return (
      <Link
        href="/admin/users/new"
        className="sc-cta"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
      >
        <Plus className="w-4 h-4" />
        {u.createButton}
      </Link>
    );
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    borderBottom: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
    color: active ? 'var(--brand)' : 'var(--soft)',
    marginBottom: -1,
    cursor: 'pointer',
    transition: 'color 0.15s ease',
  });

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px',
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
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{u.pageTitle}</h1>
          <p className="sc-helper" style={{ margin: 0 }}>{isSubAdmin ? u.pageSubtitleSubAdmin : u.pageSubtitle}</p>
        </div>
        {!isSubAdmin && renderHeaderAction()}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid var(--hairline)' }}>
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => switchTab(tb.key)}
            style={tabBtnStyle(tab === tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="sc-card-static" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search
                className="w-4 h-4"
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--soft)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={u.searchPlaceholder}
                className="sc-input"
                style={{ paddingLeft: 36, fontSize: 14 }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {filterButtons.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setFilter(btn.key)}
                  style={filterBtnStyle(filter === btn.key)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {usersLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 56,
                    background: 'var(--off-paper)',
                    borderRadius: 'var(--radius-md)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p className="sc-helper" style={{ margin: 0 }}>{u.noUsers}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--soft)', borderBottom: '1px solid var(--hairline)' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>{u.colName}</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>{u.colEmail}</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>{u.colRole}</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>{u.colStatus}</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500 }}>{u.colCreated}</th>
                    <th style={{ padding: '8px 12px', fontWeight: 500, textAlign: 'right' }}>{u.colActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid var(--hairline)', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px', fontWeight: 500, color: 'var(--ink)' }}>
                        {row.displayName || '—'}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--soft)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Mail className="w-3.5 h-3.5" style={{ color: 'var(--soft)' }} />
                          {row.email}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 12,
                            fontWeight: 500,
                            background: 'var(--brand-tint)',
                            color: 'var(--brand)',
                          }}
                        >
                          {roleLabel(row.role)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 12,
                            fontWeight: 500,
                            background: row.active ? 'var(--brand-tint)' : 'rgba(239,68,68,0.15)',
                            color: row.active ? 'var(--brand)' : '#ef4444',
                          }}
                        >
                          {row.active ? u.statusActive : u.statusInactive}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--soft)' }}>
                        {row.createdAt?.toDate().toLocaleDateString() ?? '—'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {!isSubAdmin && (
                          <button
                            onClick={() => handleDeleteUser(row)}
                            disabled={authUser?.uid === row.id}
                            title={
                              authUser?.uid === row.id
                                ? u.deleteSelfBlocked
                                : u.deleteAction
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 8,
                              borderRadius: 'var(--radius-md)',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--soft)',
                              cursor: authUser?.uid === row.id ? 'not-allowed' : 'pointer',
                              opacity: authUser?.uid === row.id ? 0.3 : 1,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (authUser?.uid !== row.id) {
                                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                                e.currentTarget.style.color = '#ef4444';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'var(--soft)';
                            }}
                            aria-label={u.deleteAction}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'sub-admins' && (
        <div>
          {subAdminsLoading ? (
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 176,
                    background: 'var(--off-paper)',
                    borderRadius: 'var(--radius-md)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : subAdmins.length === 0 ? (
            <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <ShieldCheck className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--soft)' }} />
              <h3 className="sc-h2" style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>{sa.noSubAdminsTitle}</h3>
              <p className="sc-helper" style={{ margin: 0, marginBottom: 24 }}>{sa.noSubAdminsDescription}</p>
              {!isSubAdmin && (
                <Link
                  href="/admin/users/new"
                  className="sc-cta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                >
                  <Plus className="w-5 h-5" />
                  {sa.createFirst}
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
              {subAdmins.map((user) => {
                const contractor = user.subContractorId
                  ? contractorMap[user.subContractorId]
                  : null;
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
                            <h3 className="sc-h2" style={{ margin: 0, fontSize: 18 }}>
                              {user.displayName}
                            </h3>
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
                          <span>
                            {contractor ? contractor.name : sa.noContractor}
                          </span>
                        </div>

                        {!isSubAdmin && (
                          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                            <button
                              onClick={() => toggleSubAdminActive(user)}
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
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'sub-contractors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="sc-card-static">
            <div style={{ position: 'relative' }}>
              <Search
                className="w-5 h-5"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--soft)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder={sc.searchPlaceholder}
                value={scSearch}
                onChange={(e) => setScSearch(e.target.value)}
                className="sc-input"
                style={{ paddingLeft: 44 }}
              />
            </div>
          </div>

          {subContractorsLoading ? (
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: 224,
                    background: 'var(--off-paper)',
                    borderRadius: 'var(--radius-md)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : filteredContractors.length === 0 ? (
            <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <Building2 className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--soft)' }} />
              <h3 className="sc-h2" style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>{sc.noSubContractors}</h3>
              <p className="sc-helper" style={{ margin: 0, marginBottom: 24 }}>
                {scSearch ? sc.tryDifferent : sc.getStarted}
              </p>
              {!scSearch && !isSubAdmin && (
                <Link
                  href="/admin/sub-contractors/new"
                  className="sc-cta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                >
                  <Plus className="w-5 h-5" />
                  {sc.addFirst}
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
              {filteredContractors.map((item) => (
                <div key={item.id} className="sc-card-static">
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
                      <Building2 className="w-8 h-8" style={{ color: 'var(--brand)' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                        <div style={{ minWidth: 0 }}>
                          <h3 className="sc-h2" style={{ margin: 0, marginBottom: 4, fontSize: 18 }}>{item.name}</h3>
                          <p className="sc-helper" style={{ margin: 0 }}>{item.email}</p>
                          <p className="sc-helper" style={{ margin: '4px 0 0' }}>
                            {formatPhone(item.phone)}
                          </p>
                        </div>
                        {!item.active && (
                          <span
                            style={{
                              padding: '4px 12px',
                              background: 'rgba(239,68,68,0.15)',
                              color: '#ef4444',
                              fontSize: 12,
                              fontWeight: 500,
                              borderRadius: 'var(--radius-full)',
                              flexShrink: 0,
                            }}
                          >
                            {sc.inactive}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, fontSize: 14, color: 'var(--soft)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <UsersIcon className="w-4 h-4" />
                          <span>
                            {item.stats.totalInstallers} {sc.installers}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <PackageIcon className="w-4 h-4" />
                          <span>
                            {item.stats.totalOrders} {sc.ordersLabel}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
                        <div>
                          <p className="sc-helper" style={{ margin: 0, fontSize: 12 }}>{sc.revenue}</p>
                          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--brand)' }}>
                            {formatCurrency(item.stats.revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="sc-helper" style={{ margin: 0, fontSize: 12 }}>{sc.commission}</p>
                          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{item.commission}%</p>
                        </div>
                      </div>

                      {!isSubAdmin && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                          <Link
                            href={`/admin/sub-contractors/${item.id}`}
                            style={{
                              flex: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              padding: '8px 16px',
                              background: 'var(--off-paper)',
                              color: 'var(--ink)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 14,
                              fontWeight: 500,
                              textDecoration: 'none',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <Edit className="w-4 h-4" />
                            {t.common.edit}
                          </Link>
                          <button
                            onClick={() => handleDeleteContractor(item.id, item.name)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              padding: '8px 16px',
                              background: 'var(--off-paper)',
                              color: 'var(--ink)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 14,
                              fontWeight: 500,
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                              e.currentTarget.style.color = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--off-paper)';
                              e.currentTarget.style.color = 'var(--ink)';
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
