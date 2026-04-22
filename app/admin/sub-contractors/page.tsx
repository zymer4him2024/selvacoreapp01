'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Building2, Users, Package as PackageIcon } from 'lucide-react';
import { SubContractor } from '@/types';
import { getAllSubContractors, deleteSubContractor } from '@/lib/services/subContractorService';
import { formatCurrency, formatPhone } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';
import { useTranslation } from '@/hooks/useTranslation';

export default function SubContractorsPage() {
  const { t } = useTranslation();
  const sc = t.admin.subContractors;
  const [subContractors, setSubContractors] = useState<SubContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSubContractors();
  }, []);

  const loadSubContractors = async () => {
    try {
      setLoading(true);
      const data = await getAllSubContractors();
      setSubContractors(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load sub-contractors';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(sc.confirmDelete.replace('{name}', name))) return;

    try {
      await deleteSubContractor(id);
      toast.success('Sub-contractor deleted successfully');
      loadSubContractors();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete sub-contractor';
      toast.error(message);
    }
  };

  const filteredSubContractors = subContractors.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.address.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{sc.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{sc.title}</h1>
          <p className="text-text-secondary">{sc.subtitle}</p>
        </div>
        <Link
          href="/admin/sub-contractors/new"
          className="flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
        >
          <Plus className="w-5 h-5" />
          {sc.addSubContractor}
        </Link>
      </div>

      {/* Search */}
      <div className="apple-card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder={sc.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all"
          />
        </div>
      </div>

      {/* Sub-Contractors Grid */}
      {filteredSubContractors.length === 0 ? (
        <div className="apple-card text-center py-16">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">{sc.noSubContractors}</h3>
          <p className="text-text-secondary mb-6">
            {searchTerm ? sc.tryDifferent : sc.getStarted}
          </p>
          {!searchTerm && (
            <Link
              href="/admin/sub-contractors/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-apple transition-all"
            >
              <Plus className="w-5 h-5" />
              {sc.addFirst}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSubContractors.map((item) => (
            <div
              key={item.id}
              className="apple-card hover:scale-[1.01] transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-apple bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-success" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{item.name}</h3>
                      <p className="text-sm text-text-secondary">{item.email}</p>
                      <p className="text-sm text-text-tertiary mt-1">{formatPhone(item.phone)}</p>
                    </div>
                    {!item.active && (
                      <span className="px-3 py-1 bg-error/20 text-error text-xs font-medium rounded-full">
                        {sc.inactive}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Users className="w-4 h-4" />
                      <span>{item.stats.totalInstallers} {sc.installers}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <PackageIcon className="w-4 h-4" />
                      <span>{item.stats.totalOrders} {sc.ordersLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-text-tertiary">{sc.revenue}</p>
                      <p className="text-lg font-bold text-success">
                        {formatCurrency(item.stats.revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">{sc.commission}</p>
                      <p className="text-lg font-bold">{item.commission}%</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/admin/sub-contractors/${item.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple text-sm font-medium transition-all"
                    >
                      <Edit className="w-4 h-4" />
                      {t.common.edit}
                    </Link>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-error/20 hover:text-error rounded-apple text-sm font-medium transition-all"
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

