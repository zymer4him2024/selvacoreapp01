'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Wrench, Clock } from 'lucide-react';
import { Service } from '@/types';
import { getAllServices, deleteService } from '@/lib/services/serviceService';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureAccess } from '@/hooks/useRolePermissions';
import toast from 'react-hot-toast';

export default function ServicesPage() {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
  const { userData } = useAuth();
  const isSubAdmin = userData?.role === 'sub-admin';
  const { canEdit } = useFeatureAccess('featureServices');
  const canManage = !isSubAdmin || canEdit;
  const sv = t.admin.services;
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getAllServices();
      setServices(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sv.loadError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(sv.confirmDeleteFormat.replace('{name}', name))) return;

    try {
      await deleteService(id);
      toast.success(sv.deletedSuccess);
      loadServices();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : sv.deleteError;
      toast.error(message);
    }
  };

  const filteredServices = services.filter((service) =>
    service.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="sc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="sc-spinner" />
          <p className="sc-helper" style={{ margin: 0 }}>{sv.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{sv.title}</h1>
          <p className="sc-helper" style={{ margin: 0 }}>{canManage ? sv.subtitle : sv.subtitleSubAdmin}</p>
        </div>
        {canManage && (
          <Link
            href="/admin/services/new"
            className="sc-cta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <Plus className="w-5 h-5" />
            {sv.addService}
          </Link>
        )}
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
            placeholder={sv.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sc-input"
            style={{ paddingLeft: 44 }}
          />
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <div className="sc-card-static" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <Wrench className="w-16 h-16" style={{ margin: '0 auto 16px', color: 'var(--soft)' }} />
          <h3 className="sc-h2" style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>{sv.noServices}</h3>
          <p className="sc-helper" style={{ margin: 0, marginBottom: 24 }}>
            {searchTerm ? sv.tryDifferent : (canManage ? sv.getStarted : '')}
          </p>
          {!searchTerm && canManage && (
            <Link
              href="/admin/services/new"
              className="sc-cta"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              <Plus className="w-5 h-5" />
              {sv.addFirst}
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredServices.map((service) => (
            <div key={service.id} className="sc-card-static">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
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
                      <Wrench className="w-8 h-8" style={{ color: 'var(--brand)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <h3 className="sc-h2" style={{ margin: 0, marginBottom: 4, fontSize: 18 }}>{service.name.en}</h3>
                          <p className="sc-helper" style={{ margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {service.description.en}
                          </p>
                        </div>
                        {!service.active && (
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
                            {sv.inactive}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--brand)' }}>
                          {formatCurrency(service.price, service.currency)}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--soft)' }}>
                          <Clock className="w-4 h-4" />
                          <span style={{ fontSize: 14 }}>{service.duration}h</span>
                        </div>
                        <span
                          style={{
                            padding: '4px 12px',
                            background: 'var(--off-paper)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 14,
                            color: 'var(--ink)',
                          }}
                        >
                          {service.category}
                        </span>
                      </div>

                      {service.includes && service.includes.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <p className="sc-helper" style={{ margin: 0, marginBottom: 8, fontSize: 12 }}>{sv.includes}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {service.includes.slice(0, 3).map((item, index) => (
                              <span
                                key={index}
                                style={{
                                  padding: '4px 8px',
                                  background: 'var(--off-paper)',
                                  fontSize: 12,
                                  borderRadius: 'var(--radius-sm)',
                                  color: 'var(--ink)',
                                }}
                              >
                                {item}
                              </span>
                            ))}
                            {service.includes.length > 3 && (
                              <span style={{ padding: '4px 8px', fontSize: 12, color: 'var(--soft)' }}>
                                +{service.includes.length - 3} {sv.more}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
                    <Link
                      href={`/admin/services/${service.id}`}
                      style={{
                        padding: 8,
                        background: 'var(--off-paper)',
                        borderRadius: 'var(--radius-md)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink)',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(service.id, service.name.en)}
                      style={{
                        padding: 8,
                        background: 'var(--off-paper)',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--ink)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredServices.length > 0 && (
        <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--soft)' }}>
          {sv.showing} {filteredServices.length} {sv.of} {services.length} {sv.services}
        </div>
      )}
    </div>
  );
}
