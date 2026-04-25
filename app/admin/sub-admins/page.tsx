'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { useTranslation } from '@/hooks/useTranslation';

export default function SubAdminsPage() {
  const { t } = useTranslation();
  const sa = t.admin.subAdmins;
  const [subAdmins, setSubAdmins] = useState<User[]>([]);
  const [contractorMap, setContractorMap] = useState<Record<string, SubContractor>>({});
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">{sa.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{sa.title}</h1>
          <p className="text-text-secondary">{sa.subtitle}</p>
        </div>
        <Link
          href="/admin/sub-admins/new"
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
        >
          <Plus className="w-5 h-5" />
          {sa.newSubAdmin}
        </Link>
      </div>

      {subAdmins.length === 0 ? (
        <div className="apple-card text-center py-16">
          <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">{sa.noSubAdminsTitle}</h3>
          <p className="text-text-secondary mb-6">{sa.noSubAdminsDescription}</p>
          <Link
            href="/admin/sub-admins/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all"
          >
            <Plus className="w-5 h-5" />
            {sa.createFirst}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subAdmins.map((user) => {
            const contractor = user.subContractorId ? contractorMap[user.subContractorId] : null;
            return (
              <div key={user.id} className="apple-card">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-apple bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold">{user.displayName}</h3>
                        <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-1">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-sm text-text-tertiary flex items-center gap-1.5 mt-1">
                            <Phone className="w-3.5 h-3.5" />
                            {formatPhone(user.phone)}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          user.active
                            ? 'bg-success/20 text-success'
                            : 'bg-error/20 text-error'
                        }`}
                      >
                        {user.active ? sa.activeBadge : sa.inactiveBadge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                      <Building2 className="w-4 h-4" />
                      <span>{contractor ? contractor.name : sa.noContractor}</span>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border">
                      <button
                        onClick={() => toggleActive(user)}
                        className={`flex-1 px-4 py-2 rounded-apple text-sm font-medium transition-all ${
                          user.active
                            ? 'bg-surface-elevated hover:bg-error/20 hover:text-error'
                            : 'bg-success/20 text-success hover:bg-success/30'
                        }`}
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
