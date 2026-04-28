'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Package, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubAdminStats, SubAdminStats } from '@/lib/services/subAdminService';
import { getSubContractorById } from '@/lib/services/subContractorService';
import { SubContractor } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

export default function SubAdminDashboard() {
  const { userData } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const sd = t.subAdmin.dashboard;
  const [stats, setStats] = useState<SubAdminStats | null>(null);
  const [contractor, setContractor] = useState<SubContractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.subContractorId) {
      setLoading(false);
      return;
    }
    loadData(userData.subContractorId);
  }, [userData]);

  const loadData = async (subContractorId: string) => {
    try {
      const [statsData, contractorData] = await Promise.all([
        getSubAdminStats(subContractorId),
        getSubContractorById(subContractorId),
      ]);
      setStats(statsData);
      setContractor(contractorData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sd.loadError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{sd.loading}</p>
        </div>
      </div>
    );
  }

  if (!userData?.subContractorId) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold mb-2">{sd.noContractorTitle}</h2>
        <p className="text-text-secondary">
          {sd.noContractorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        {userData?.logoURL && (
          <img
            src={userData.logoURL}
            alt={sd.logoAlt}
            className="w-16 h-16 rounded-apple object-contain border border-border bg-white p-1"
          />
        )}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{sd.title}</h1>
          <p className="text-text-secondary">
            {contractor?.name || sd.defaultContractorName} {sd.overviewSuffix}
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/sub-admin/technicians')}
            className="apple-card text-center hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-text-tertiary text-sm">{sd.technicians}</p>
            <p className="text-3xl font-bold mt-1">{stats.totalTechnicians}</p>
            <p className="text-xs text-text-tertiary mt-1">
              {stats.approvedTechnicians} {sd.approvedSuffix}
            </p>
          </button>

          <button
            onClick={() => router.push('/sub-admin/orders')}
            className="apple-card text-center hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Package className="w-8 h-8 mx-auto mb-2 text-secondary" />
            <p className="text-text-tertiary text-sm">{sd.totalOrders}</p>
            <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
            <p className="text-xs text-text-tertiary mt-1">
              {stats.pendingOrders} {sd.pendingSuffix}
            </p>
          </button>

          <div className="apple-card text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-warning" />
            <p className="text-text-tertiary text-sm">{sd.inProgress}</p>
            <p className="text-3xl font-bold mt-1 text-warning">{stats.inProgressOrders}</p>
          </div>

          <div className="apple-card text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
            <p className="text-text-tertiary text-sm">{sd.completed}</p>
            <p className="text-3xl font-bold mt-1 text-success">{stats.completedOrders}</p>
          </div>
        </div>
      )}

      {stats && stats.pendingTechnicians > 0 && (
        <div className="apple-card border-l-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{sd.pendingApplicationsTitle}</h3>
              <p className="text-sm text-text-secondary">
                {stats.pendingTechnicians} {stats.pendingTechnicians === 1 ? sd.pendingApplicationsCountSingular : sd.pendingApplicationsCountPlural}
              </p>
            </div>
            <button
              onClick={() => router.push('/sub-admin/technicians')}
              className="px-4 py-2 bg-warning/20 text-warning font-medium rounded-apple hover:bg-warning/30 transition-all"
            >
              {sd.reviewButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
