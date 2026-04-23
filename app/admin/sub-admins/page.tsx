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

export default function SubAdminsPage() {
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
      const message = error instanceof Error ? error.message : 'Failed to load sub-admins';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (user: User) => {
    const next = !user.active;
    const verb = next ? 'activate' : 'deactivate';
    if (!confirm(`${verb[0].toUpperCase() + verb.slice(1)} ${user.displayName}?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        active: next,
        updatedAt: Timestamp.now(),
      });
      toast.success(`Sub-admin ${next ? 'activated' : 'deactivated'}`);
      load();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">Loading sub-admins…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Sub-Admins</h1>
          <p className="text-text-secondary">
            Scoped admin accounts. Each sub-admin sees only their sub-contractor's data.
          </p>
        </div>
        <Link
          href="/admin/sub-admins/new"
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
        >
          <Plus className="w-5 h-5" />
          New Sub-Admin
        </Link>
      </div>

      {subAdmins.length === 0 ? (
        <div className="apple-card text-center py-16">
          <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">No sub-admins yet</h3>
          <p className="text-text-secondary mb-6">
            Create one to let a contractor manage their own technicians and orders.
          </p>
          <Link
            href="/admin/sub-admins/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-apple transition-all"
          >
            <Plus className="w-5 h-5" />
            Create first sub-admin
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {subAdmins.map((sa) => {
            const contractor = sa.subContractorId ? contractorMap[sa.subContractorId] : null;
            return (
              <div key={sa.id} className="apple-card">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-apple bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold">{sa.displayName}</h3>
                        <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-1">
                          <Mail className="w-3.5 h-3.5" />
                          {sa.email}
                        </p>
                        {sa.phone && (
                          <p className="text-sm text-text-tertiary flex items-center gap-1.5 mt-1">
                            <Phone className="w-3.5 h-3.5" />
                            {formatPhone(sa.phone)}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          sa.active
                            ? 'bg-success/20 text-success'
                            : 'bg-error/20 text-error'
                        }`}
                      >
                        {sa.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                      <Building2 className="w-4 h-4" />
                      <span>{contractor ? contractor.name : 'No contractor assigned'}</span>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border">
                      <button
                        onClick={() => toggleActive(sa)}
                        className={`flex-1 px-4 py-2 rounded-apple text-sm font-medium transition-all ${
                          sa.active
                            ? 'bg-surface-elevated hover:bg-error/20 hover:text-error'
                            : 'bg-success/20 text-success hover:bg-success/30'
                        }`}
                      >
                        {sa.active ? 'Deactivate' : 'Activate'}
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
