'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, UserCheck, UserX, UserMinus, Search, Filter,
  TrendingUp, Award, DollarSign, Calendar
} from 'lucide-react';
import { 
  getAllTechnicians,
  getTechnicianStatsSummary,
  TechnicianWithStats
} from '@/lib/services/technicianAdminService';
import { TechnicianStatus } from '@/types/user';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

type TabType = 'all' | 'pending' | 'approved' | 'declined' | 'suspended';

export default function TechniciansManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [technicians, setTechnicians] = useState<TechnicianWithStats[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<TechnicianWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to load technicians');
    } finally {
      setLoading(false);
    }
  };

  const filterTechnicians = () => {
    let filtered = [...technicians];

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(tech => tech.technicianStatus === activeTab);
    }

    // Filter by search term
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

  const getStatusColor = (status?: TechnicianStatus) => {
    switch (status) {
      case 'approved': return 'bg-success/10 text-success';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'declined': return 'bg-error/10 text-error';
      case 'suspended': return 'bg-text-tertiary/10 text-text-tertiary';
      default: return 'bg-surface-elevated text-text-secondary';
    }
  };

  const getStatusLabel = (status?: TechnicianStatus) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'declined': return 'Declined';
      case 'suspended': return 'Suspended';
      default: return 'Unknown';
    }
  };

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
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Technician Management</h1>
        <p className="text-text-secondary mt-2">
          Manage technician applications and accounts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="apple-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTechnicians}</p>
              <p className="text-sm text-text-secondary">Total</p>
            </div>
          </div>
        </div>

        <div className="apple-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-warning/10 rounded-apple flex items-center justify-center">
              <UserMinus className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingApplications}</p>
              <p className="text-sm text-text-secondary">Pending</p>
            </div>
          </div>
        </div>

        <div className="apple-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success/10 rounded-apple flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approvedTechnicians}</p>
              <p className="text-sm text-text-secondary">Approved</p>
            </div>
          </div>
        </div>

        <div className="apple-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeTechnicians}</p>
              <p className="text-sm text-text-secondary">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
          />
        </div>
        <button
          onClick={loadData}
          className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { id: 'all', label: 'All', count: technicians.length },
          { id: 'pending', label: 'Pending', count: stats.pendingApplications },
          { id: 'approved', label: 'Approved', count: stats.approvedTechnicians },
          { id: 'declined', label: 'Declined', count: technicians.filter(t => t.technicianStatus === 'declined').length },
          { id: 'suspended', label: 'Suspended', count: technicians.filter(t => t.technicianStatus === 'suspended').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-6 py-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 bg-surface-elevated text-xs rounded-full">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Technicians List */}
      {filteredTechnicians.length === 0 ? (
        <div className="apple-card text-center py-12">
          <Users className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No technicians found</h3>
          <p className="text-text-secondary">
            {searchTerm
              ? 'Try adjusting your search term'
              : 'No technicians match the selected filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTechnicians.map((technician) => (
            <div
              key={technician.id}
              className="apple-card hover:shadow-apple-lg transition-all cursor-pointer"
              onClick={() => router.push(`/admin/technicians/${technician.id}`)}
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Profile Photo */}
                <div className="w-20 h-20 bg-surface-elevated rounded-apple overflow-hidden flex-shrink-0">
                  {technician.photoURL ? (
                    <img
                      src={technician.photoURL}
                      alt={technician.displayName}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <Users className="w-10 h-10 text-primary" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{technician.displayName}</h3>
                      <p className="text-sm text-text-secondary">{technician.email}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-apple text-sm font-semibold ${getStatusColor(technician.technicianStatus)}`}>
                      {getStatusLabel(technician.technicianStatus)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-text-tertiary" />
                      <span className="text-text-secondary">
                        Applied: {technician.applicationDate ? formatDate(technician.applicationDate, 'short') : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-warning" />
                      <span className="text-text-secondary">
                        {technician.completedJobs || 0} jobs • {technician.averageRating?.toFixed(1) || '0.0'}★
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-success" />
                      <span className="text-text-secondary">
                        {formatCurrency(technician.totalEarnings || 0, 'BRL')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-text-secondary">
                        {technician.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {technician.serviceAreas && technician.serviceAreas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {technician.serviceAreas.slice(0, 3).map((area, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-surface-elevated text-xs rounded-apple"
                        >
                          {area}
                        </span>
                      ))}
                      {technician.serviceAreas.length > 3 && (
                        <span className="px-2 py-1 bg-surface-elevated text-xs rounded-apple">
                          +{technician.serviceAreas.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

