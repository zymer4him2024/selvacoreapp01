'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, UserCheck, UserMinus, Search,
  TrendingUp, Award, DollarSign, Calendar
} from 'lucide-react';
import {
  getAllTechnicians,
  getTechnicianStatsSummary,
  TechnicianWithStats
} from '@/lib/services/technicianAdminService';
import { TechnicianStatus } from '@/types/user';
import {
  formatOptionalNumber,
  formatOptionalString
} from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';
import toast from 'react-hot-toast';

type TabType = 'all' | 'pending' | 'approved' | 'declined' | 'suspended';

const STATUS_STYLES: Record<NonNullable<TechnicianStatus>, { color: string; bg: string }> = {
  approved: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  pending: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  declined: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  suspended: { color: 'var(--soft)', bg: 'var(--off-paper)' },
};

const statTileStyle: React.CSSProperties = {
  padding: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '12px 24px',
  fontWeight: 600,
  fontSize: 14,
  background: 'transparent',
  border: 'none',
  borderBottom: `2px solid ${active ? 'var(--brand)' : 'transparent'}`,
  color: active ? 'var(--brand)' : 'var(--soft)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'all 0.15s ease',
});

export default function TechniciansManagementPage() {
  const { t } = useTranslation();
  const { formatOptionalCurrency, formatOptionalDate } = useLocaleFormatters();
  const { userData } = useAuth();
  const isSubAdmin = userData?.role === 'sub-admin';
  const tc = t.admin.technicians;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [technicians, setTechnicians] = useState<TechnicianWithStats[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<TechnicianWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalTechnicians: 0,
    pendingApplications: 0,
    approvedTechnicians: 0,
    activeTechnicians: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterTechnicians();
  }, [activeTab, technicians, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [techList, statsSummary] = await Promise.all([
        getAllTechnicians(),
        getTechnicianStatsSummary(),
      ]);

      setTechnicians(techList);
      setStats(statsSummary);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tc.loadTechniciansError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filterTechnicians = () => {
    let filtered = [...technicians];

    if (activeTab !== 'all') {
      filtered = filtered.filter(tech => tech.technicianStatus === activeTab);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(tech =>
        tech.displayName?.toLowerCase().includes(lowerSearch) ||
        tech.email?.toLowerCase().includes(lowerSearch) ||
        tech.phone?.includes(searchTerm)
      );
    }

    setFilteredTechnicians(filtered);
  };

  const getStatusStyle = (status?: TechnicianStatus) => {
    if (status && status in STATUS_STYLES) {
      return STATUS_STYLES[status as NonNullable<TechnicianStatus>];
    }
    return { color: 'var(--soft)', bg: 'var(--off-paper)' };
  };

  const tabCounts = useMemo(() => ({
    declined: technicians.filter((t) => t.technicianStatus === 'declined').length,
    suspended: technicians.filter((t) => t.technicianStatus === 'suspended').length,
  }), [technicians]);

  const getStatusLabel = (status?: TechnicianStatus) => {
    switch (status) {
      case 'approved': return tc.approved;
      case 'pending': return tc.pending;
      case 'declined': return tc.declined;
      case 'suspended': return tc.suspended;
    }
    // 'draft' is set at role-selection but isn't part of the typed status union:
    // the technician picked the role but never submitted an application.
    if ((status as string | undefined) === 'draft') return tc.incomplete;
    return tc.unknown;
  };

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div className="sc-spinner" />
          <p className="sc-helper">{tc.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 className="sc-h1" style={{ margin: 0 }}>{tc.title}</h1>
        <p className="sc-helper" style={{ marginTop: 8 }}>
          {isSubAdmin ? tc.subtitleSubAdmin : tc.subtitle}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="sc-card-static" style={statTileStyle}>
          <div style={{ width: 48, height: 48, background: 'var(--brand-tint)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={24} color="var(--brand)" />
          </div>
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{stats.totalTechnicians}</p>
            <p className="sc-helper" style={{ margin: 0 }}>{tc.total}</p>
          </div>
        </div>

        <div className="sc-card-static" style={statTileStyle}>
          <div style={{ width: 48, height: 48, background: 'var(--warn-tint)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserMinus size={24} color="var(--warn)" />
          </div>
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{stats.pendingApplications}</p>
            <p className="sc-helper" style={{ margin: 0 }}>{tc.pending}</p>
          </div>
        </div>

        <div className="sc-card-static" style={statTileStyle}>
          <div style={{ width: 48, height: 48, background: 'var(--brand-tint)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCheck size={24} color="var(--brand)" />
          </div>
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{stats.approvedTechnicians}</p>
            <p className="sc-helper" style={{ margin: 0 }}>{tc.approved}</p>
          </div>
        </div>

        <div className="sc-card-static" style={statTileStyle}>
          <div style={{ width: 48, height: 48, background: 'var(--brand-tint)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={24} color="var(--brand)" />
          </div>
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{stats.activeTechnicians}</p>
            <p className="sc-helper" style={{ margin: 0 }}>{tc.active}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={20} color="var(--soft)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={tc.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sc-input"
            style={{ paddingLeft: 44 }}
          />
        </div>
        <button onClick={loadData} className="sc-cta">{t.common.refresh}</button>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--hairline)', overflowX: 'auto' }}>
        {[
          { id: 'all', label: tc.all, count: technicians.length },
          { id: 'pending', label: tc.pending, count: stats.pendingApplications },
          { id: 'approved', label: tc.approved, count: stats.approvedTechnicians },
          { id: 'declined', label: tc.declined, count: tabCounts.declined },
          { id: 'suspended', label: tc.suspended, count: tabCounts.suspended },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            style={tabBtnStyle(activeTab === tab.id)}
          >
            {tab.label}
            <span style={{
              padding: '2px 8px',
              background: 'var(--off-paper)',
              fontSize: 11,
              borderRadius: 'var(--radius-full)',
              color: 'var(--soft)',
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {filteredTechnicians.length === 0 ? (
        <div className="sc-card-static" style={{ textAlign: 'center', padding: 48 }}>
          <Users size={64} color="var(--soft)" style={{ margin: '0 auto 16px' }} />
          <h3 className="sc-h2" style={{ marginBottom: 8 }}>{tc.noTechnicians}</h3>
          <p className="sc-helper" style={{ margin: 0 }}>
            {searchTerm ? tc.tryAdjusting : tc.noMatch}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredTechnicians.map((technician) => {
            const statusStyle = getStatusStyle(technician.technicianStatus);
            return (
              <div
                key={technician.id}
                className="sc-card"
                onClick={() => router.push(`/admin/technicians/${technician.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{
                    width: 80, height: 80,
                    background: 'var(--off-paper)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    {technician.photoURL && !imageErrors.has(technician.id) ? (
                      <img
                        src={technician.photoURL}
                        alt={technician.displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                        onError={() =>
                          setImageErrors((prev) => new Set(prev).add(technician.id))
                        }
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-tint)' }}>
                        <Users size={40} color="var(--brand)" />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--ink)' }}>{formatOptionalString(technician.displayName)}</h3>
                        <p className="sc-helper" style={{ margin: 0 }}>{formatOptionalString(technician.email)}</p>
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: statusStyle.color,
                        background: statusStyle.bg,
                        whiteSpace: 'nowrap',
                      }}>
                        {getStatusLabel(technician.technicianStatus)}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <Calendar size={16} color="var(--soft)" />
                        <span style={{ color: 'var(--soft)' }}>
                          {tc.applied} {formatOptionalDate(technician.applicationDate, 'short')}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <Award size={16} color="var(--warn)" />
                        <span style={{ color: 'var(--soft)' }}>
                          {formatOptionalNumber(technician.completedJobs)} {tc.jobs} • {technician.averageRating ? `${technician.averageRating.toFixed(1)}★` : tc.naLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <DollarSign size={16} color="var(--brand)" />
                        <span style={{ color: 'var(--soft)' }}>
                          {formatOptionalCurrency(technician.totalEarnings, DEFAULT_CURRENCY)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <TrendingUp size={16} color="var(--brand)" />
                        <span style={{ color: 'var(--soft)' }}>
                          {technician.active ? tc.activeLabel : tc.inactiveLabel}
                        </span>
                      </div>
                    </div>

                    {technician.serviceAreas && technician.serviceAreas.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {technician.serviceAreas.slice(0, 3).map((area, index) => (
                          <span
                            key={index}
                            style={{
                              padding: '4px 8px',
                              background: 'var(--off-paper)',
                              fontSize: 12,
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--soft)',
                            }}
                          >
                            {area}
                          </span>
                        ))}
                        {technician.serviceAreas.length > 3 && (
                          <span style={{
                            padding: '4px 8px',
                            background: 'var(--off-paper)',
                            fontSize: 12,
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--soft)',
                          }}>
                            +{technician.serviceAreas.length - 3} {tc.moreSuffix}
                          </span>
                        )}
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
  );
}
