'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, Building2, Users, Package as PackageIcon } from 'lucide-react';
import { SubContractor } from '@/types';
import { getAllSubContractors, deleteSubContractor } from '@/lib/services/subContractorService';
import { formatPhone } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';

export default function SubContractorsPage() {
  const { t } = useTranslation();
  const { userData } = useAuth();
  const router = useRouter();
  const { formatCurrency } = useLocaleFormatters();
  const sc = t.admin.subContractors;
  const [subContractors, setSubContractors] = useState<SubContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.replace('/admin');
    }
  }, [userData, router]);

  useEffect(() => {
    loadSubContractors();
  }, []);

  const loadSubContractors = async () => {
    try {
      setLoading(true);
      const data = await getAllSubContractors();
      setSubContractors(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sc.loadError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
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

  const filteredSubContractors = subContractors.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.address.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (userData && userData.role !== 'admin') return null;

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="sc-spinner" />
          <p className="sc-helper" style={{ margin: 0 }}>{sc.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{sc.title}</h1>
          <p className="sc-helper" style={{ margin: 0 }}>{sc.subtitle}</p>
        </div>
        <Link
          href="/admin/sub-contractors/new"
          className="sc-cta"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
        >
          <Plus className="w-5 h-5" />
          {sc.addSubContractor}
        </Link>
      </div>

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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sc-input"
            style={{ paddingLeft: 44 }}
          />
        </div>
      </div>

      {filteredSubContractors.length === 0 ? (
        <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <Building2 className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--soft)' }} />
          <h3 className="sc-h2" style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>{sc.noSubContractors}</h3>
          <p className="sc-helper" style={{ margin: 0, marginBottom: 24 }}>
            {searchTerm ? sc.tryDifferent : sc.getStarted}
          </p>
          {!searchTerm && (
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
        <div
          style={{
            display: 'grid',
            gap: 24,
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          }}
        >
          {filteredSubContractors.map((item) => (
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
                      <p className="sc-helper" style={{ margin: '4px 0 0' }}>{formatPhone(item.phone)}</p>
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
                      <Users className="w-4 h-4" />
                      <span>{item.stats.totalInstallers} {sc.installers}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PackageIcon className="w-4 h-4" />
                      <span>{item.stats.totalOrders} {sc.ordersLabel}</span>
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
                      onClick={() => handleDelete(item.id, item.name)}
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
