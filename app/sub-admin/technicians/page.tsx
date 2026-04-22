'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSubAdminTechnicians } from '@/lib/services/subAdminService';
import { User } from '@/types';
import { formatDate } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function SubAdminTechniciansPage() {
  const { userData } = useAuth();
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!userData?.subContractorId) {
      setLoading(false);
      return;
    }
    loadTechnicians(userData.subContractorId);
  }, [userData]);

  const loadTechnicians = async (subContractorId: string) => {
    try {
      const data = await getSubAdminTechnicians(subContractorId);
      setTechnicians(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load technicians';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-success/20 text-success',
      pending: 'bg-warning/20 text-warning',
      declined: 'bg-error/20 text-error',
      suspended: 'bg-text-tertiary/20 text-text-tertiary',
    };
    return colors[status || ''] || colors.pending;
  };

  const filteredTechnicians = technicians.filter(
    (tech) => statusFilter === 'all' || tech.technicianStatus === statusFilter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading technicians...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Technicians</h1>
        <p className="text-text-secondary">Manage your team of technicians</p>
      </div>

      <div className="apple-card">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-64 px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
        >
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="declined">Declined</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {filteredTechnicians.length === 0 ? (
        <div className="apple-card text-center py-16">
          <Users className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">No technicians found</h3>
          <p className="text-text-secondary">
            {statusFilter !== 'all'
              ? 'Try a different filter'
              : 'Technicians assigned to your company will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTechnicians.map((tech) => (
            <div key={tech.id} className="apple-card">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {tech.photoURL ? (
                    <img src={tech.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold text-primary">
                      {tech.displayName?.charAt(0) || 'T'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{tech.displayName}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tech.technicianStatus)}`}>
                      {(tech.technicianStatus || 'pending').toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{tech.email}</span>
                    </div>
                    {tech.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{tech.phone}</span>
                      </div>
                    )}
                    {tech.serviceAreas && tech.serviceAreas.length > 0 && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{tech.serviceAreas.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  {tech.applicationDate && (
                    <p className="text-xs text-text-tertiary mt-2">
                      Applied {formatDate(tech.applicationDate, 'short')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-sm text-text-tertiary">
        {filteredTechnicians.length} technician{filteredTechnicians.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
