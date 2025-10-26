'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailableJobs, getTechnicianStats, TechnicianStats } from '@/lib/services/technicianService';
import { Order } from '@/types/order';
import { MapPin, Calendar, DollarSign, Package, TrendingUp, Briefcase, Star, Award } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';
import JobDetailModal from '@/components/technician/JobDetailModal';

export default function TechnicianDashboard() {
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Order[]>([]);
  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Order | null>(null);
  const [showJobDetail, setShowJobDetail] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [availableJobs, techStats] = await Promise.all([
        getAvailableJobs(),
        user ? getTechnicianStats(user.uid) : Promise.resolve(null),
      ]);
      
      setJobs(availableJobs);
      setStats(techStats);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleViewJob = (job: Order) => {
    setSelectedJob(job);
    setShowJobDetail(true);
  };

  const handleJobAccepted = () => {
    setShowJobDetail(false);
    setSelectedJob(null);
    loadData(); // Refresh the list
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading available jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome back, {userData?.displayName?.split(' ')[0] || 'Technician'}! 👋
        </h1>
        <p className="text-text-secondary mt-2">
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} available for you
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalJobs}</p>
                <p className="text-sm text-text-secondary">Total Jobs</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success/10 rounded-apple flex items-center justify-center">
                <Award className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedJobs}</p>
                <p className="text-sm text-text-secondary">Completed</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-apple flex items-center justify-center">
                <Star className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                <p className="text-sm text-text-secondary">Rating</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings, 'BRL')}</p>
                <p className="text-sm text-text-secondary">Earnings</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Jobs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Available Jobs</h2>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm bg-surface hover:bg-surface-elevated rounded-apple transition-all"
          >
            Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="apple-card text-center py-12">
            <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No jobs available</h3>
            <p className="text-text-secondary">
              Check back later for new installation requests
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="apple-card hover:shadow-apple-lg transition-all cursor-pointer group"
                onClick={() => handleViewJob(job)}
              >
                {/* Product Image */}
                <div className="aspect-video bg-surface-elevated rounded-apple overflow-hidden mb-4">
                  <img
                    src={job.productSnapshot.image || '/placeholder.png'}
                    alt={job.productSnapshot.name.en}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Job Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1">
                      {job.productSnapshot.name[userData?.preferredLanguage || 'en'] || job.productSnapshot.name.en}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Order #{job.orderNumber}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">
                        {job.installationAddress.city}, {job.installationAddress.state}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(job.installationDate, 'short')} • {job.timeSlot}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-success">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewJob(job);
                    }}
                    className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all hover:scale-[1.02]"
                  >
                    View Details & Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      {showJobDetail && selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => {
            setShowJobDetail(false);
            setSelectedJob(null);
          }}
          onJobAccepted={handleJobAccepted}
        />
      )}
    </div>
  );
}

