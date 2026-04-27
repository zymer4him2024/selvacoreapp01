'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailableJobsPaginated, getTechnicianStats, TechnicianStats, PaginatedResult } from '@/lib/services/technicianService';
import { Order } from '@/types/order';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { MapPin, Calendar, DollarSign, Package, TrendingUp, Briefcase, Star, Award, AlertCircle, XCircle, Clock, QrCode, CloudOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils/formatters';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useTranslation } from '@/hooks/useTranslation';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import toast from 'react-hot-toast';
import JobDetailModal from '@/components/technician/JobDetailModal';
import InstallAppBanner from '@/components/technician/InstallAppBanner';

export default function TechnicianDashboard() {
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
  const td = t.technician.dashboard;
  const { pendingCount, retryAll } = useOfflineQueue();
  const router = useRouter();
  const [jobs, setJobs] = useState<Order[]>([]);
  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [selectedJob, setSelectedJob] = useState<Order | null>(null);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [result, techStats] = await Promise.all([
        getAvailableJobsPaginated(10),
        user ? getTechnicianStats(user.uid) : Promise.resolve(null),
      ]);

      setJobs(result.items);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      setStats(techStats);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : td.loadJobsError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;
    try {
      setLoadingMore(true);
      const result = await getAvailableJobsPaginated(10, lastDoc);
      setJobs(prev => [...prev, ...result.items]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : td.loadMoreError;
      toast.error(message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, td.loadMoreError]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

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
          <p className="text-text-secondary">{td.loading}</p>
        </div>
      </div>
    );
  }

  // Check technician status
  if (userData?.technicianStatus === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="apple-card max-w-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-warning/10 rounded-apple flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-warning" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">{td.pendingTitle}</h2>
            <p className="text-text-secondary text-lg">
              {td.pendingMessage}
            </p>
          </div>
          <div className="p-4 bg-surface-elevated rounded-apple text-left space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              {td.whatHappensNext}
            </h3>
            <ul className="space-y-2 text-sm text-text-secondary ml-7">
              <li>• {td.pendingStep1}</li>
              <li>• {td.pendingStep2}</li>
              <li>• {td.pendingStep3}</li>
            </ul>
          </div>
          <p className="text-sm text-text-tertiary">
            {td.needHelp}
          </p>
        </div>
      </div>
    );
  }

  if (userData?.technicianStatus === 'declined') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="apple-card max-w-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-error/10 rounded-apple flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-error" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">{td.declinedTitle}</h2>
            <p className="text-text-secondary text-lg">
              {td.declinedMessage}
            </p>
          </div>
          {userData.adminNotes && (
            <div className="p-4 bg-surface-elevated rounded-apple text-left">
              <h3 className="font-semibold mb-2">{td.reasonLabel}</h3>
              <p className="text-text-secondary">{userData.adminNotes}</p>
            </div>
          )}
          <p className="text-sm text-text-tertiary">
            {td.questions}
          </p>
        </div>
      </div>
    );
  }

  if (userData?.technicianStatus === 'suspended') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="apple-card max-w-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-warning/10 rounded-apple flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-warning" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">{td.suspendedTitle}</h2>
            <p className="text-text-secondary text-lg">
              {td.suspendedMessage}
            </p>
          </div>
          {userData.adminNotes && (
            <div className="p-4 bg-surface-elevated rounded-apple text-left">
              <h3 className="font-semibold mb-2">{td.reasonLabel}</h3>
              <p className="text-text-secondary">{userData.adminNotes}</p>
            </div>
          )}
          <p className="text-sm text-text-tertiary">
            {td.needAssistance}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <InstallAppBanner />

      {/* Offline Pending Sync Tile */}
      {pendingCount > 0 && (
        <div className="apple-card border-l-4 border-warning">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning/10 rounded-apple flex items-center justify-center">
                <CloudOff className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="font-semibold">{pendingCount} {pendingCount === 1 ? td.jobSingular : td.jobPlural} {td.offlinePendingSync}</p>
                <p className="text-sm text-text-secondary">{td.syncWillSync}</p>
              </div>
            </div>
            <button
              onClick={retryAll}
              className="px-4 py-2 min-h-[44px] bg-warning/10 text-warning font-medium text-sm rounded-apple transition-all"
            >
              {td.syncNow}
            </button>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        {userData?.logoURL && (
          <img
            src={userData.logoURL}
            alt={td.logoAlt}
            className="w-16 h-16 rounded-apple object-contain border border-border bg-white p-1"
          />
        )}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            {td.welcomeFormat.replace('{name}', userData?.displayName?.split(' ')[0] || td.defaultTechName)}
          </h1>
          <p className="text-text-secondary mt-2">
            {jobs.length} {jobs.length === 1 ? td.jobSingular : td.jobPlural} {td.availableForYou}
          </p>
        </div>
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
                <p className="text-sm text-text-secondary">{td.totalJobs}</p>
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
                <p className="text-sm text-text-secondary">{td.completedLabel}</p>
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
                <p className="text-sm text-text-secondary">{td.ratingLabel}</p>
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
                <p className="text-sm text-text-secondary">{td.earningsLabel}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Scan Card */}
      <div
        onClick={() => router.push('/technician/scan')}
        className="apple-card cursor-pointer hover:shadow-apple-lg transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-apple bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
            <QrCode className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{td.quickScanTitle}</h3>
            <p className="text-sm text-text-secondary">{td.quickScanDesc}</p>
          </div>
          <div className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-apple">
            {td.scanCta}
          </div>
        </div>
      </div>

      {/* Available Jobs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{td.availableJobsHeading}</h2>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm bg-surface hover:bg-surface-elevated rounded-apple transition-all"
          >
            {td.refresh}
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="apple-card text-center py-12">
            <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{td.noJobsTitle}</h3>
            <p className="text-text-secondary">
              {td.noJobsDesc}
            </p>
          </div>
        ) : (
          <>
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
                      src={job.productSnapshot.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="24" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'}
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
                        {td.orderHash}{job.orderNumber}
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
                      {td.viewDetailsAccept}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </>
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

