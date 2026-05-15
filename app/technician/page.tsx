'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAvailableJobsPaginated, getTechnicianStats, TechnicianStats } from '@/lib/services/technicianService';
import { Order } from '@/types/order';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { MapPin, Calendar, DollarSign, Package, Briefcase, Star, Award, AlertCircle, XCircle, Clock, QrCode, CloudOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils/formatters';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useTranslation } from '@/hooks/useTranslation';
import { useOfflineQueue } from '@/contexts/OfflineQueueContext';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';
import toast from 'react-hot-toast';
import JobDetailModal from '@/components/technician/JobDetailModal';
import InstallAppBanner from '@/components/technician/InstallAppBanner';
import { JobCardSkeleton, StatCardSkeleton } from '@/components/technician/JobCardSkeleton';
import PullToRefreshIndicator from '@/components/technician/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="24" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

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
  const { pullDistance, progress, refreshing } = usePullToRefresh({
    onRefresh: () => loadData(),
    disabled: loading || loadingMore,
  });

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
    loadData();
  };

  if (loading) {
    return (
      <div className="sc">
        <main className="sc-main">
          <div className="sc-stack-lg" style={{ gap: 32 }}>
            <div className="sc-row" style={{ alignItems: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', background: 'var(--off-paper)', opacity: 0.7 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 36, width: 256, background: 'var(--off-paper)', borderRadius: 4, marginBottom: 8, opacity: 0.7 }} />
                <div style={{ height: 16, width: 160, background: 'var(--off-paper)', borderRadius: 4, opacity: 0.7 }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>

            <div className="sc-card-static" style={{ opacity: 0.7 }}>
              <div className="sc-row" style={{ alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--off-paper)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 20, background: 'var(--off-paper)', borderRadius: 4, width: '33%', marginBottom: 8 }} />
                  <div style={{ height: 16, background: 'var(--off-paper)', borderRadius: 4, width: '50%' }} />
                </div>
                <div style={{ height: 40, width: 80, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)' }} />
              </div>
            </div>

            <div>
              <div style={{ height: 28, width: 192, background: 'var(--off-paper)', borderRadius: 4, marginBottom: 24, opacity: 0.7 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
                <JobCardSkeleton />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const StatusCard = ({
    icon: Icon,
    iconColor,
    iconBg,
    title,
    message,
    notes,
    notesTitle,
    footnote,
    extraSection,
  }: {
    icon: typeof AlertCircle;
    iconColor: string;
    iconBg: string;
    title: string;
    message: string;
    notes?: string;
    notesTitle?: string;
    footnote: string;
    extraSection?: React.ReactNode;
  }) => (
    <div className="sc" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="sc-card-static" style={{ maxWidth: 640, textAlign: 'center' }}>
        <div className="sc-stack-lg" style={{ alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 80,
              height: 80,
              background: iconBg,
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon className="w-10 h-10" style={{ color: iconColor }} />
          </div>
          <div>
            <h2 className="sc-h1" style={{ marginBottom: 8 }}>{title}</h2>
            <p className="sc-lede">{message}</p>
          </div>
          {extraSection}
          {notes && (
            <div style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-md)', textAlign: 'left', width: '100%' }}>
              <h3 style={{ fontWeight: 600, marginBottom: 8 }}>{notesTitle}</h3>
              <p className="sc-helper">{notes}</p>
            </div>
          )}
          <p className="sc-helper">{footnote}</p>
        </div>
      </div>
    </div>
  );

  if (userData?.technicianStatus === 'pending') {
    return (
      <StatusCard
        icon={Clock}
        iconColor="var(--warn)"
        iconBg="var(--warn-tint)"
        title={td.pendingTitle}
        message={td.pendingMessage}
        footnote={td.needHelp}
        extraSection={
          <div style={{ padding: 16, background: 'var(--off-paper)', borderRadius: 'var(--radius-md)', textAlign: 'left', width: '100%' }}>
            <h3 className="sc-row" style={{ fontWeight: 600, alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              {td.whatHappensNext}
            </h3>
            <ul className="sc-stack" style={{ gap: 8, paddingLeft: 28, fontSize: 14, color: 'var(--soft)' }}>
              <li>• {td.pendingStep1}</li>
              <li>• {td.pendingStep2}</li>
              <li>• {td.pendingStep3}</li>
            </ul>
          </div>
        }
      />
    );
  }

  if (userData?.technicianStatus === 'declined') {
    return (
      <StatusCard
        icon={XCircle}
        iconColor="#ef4444"
        iconBg="rgba(239,68,68,0.1)"
        title={td.declinedTitle}
        message={td.declinedMessage}
        notes={userData.adminNotes}
        notesTitle={td.reasonLabel}
        footnote={td.questions}
      />
    );
  }

  if (userData?.technicianStatus === 'suspended') {
    return (
      <StatusCard
        icon={AlertCircle}
        iconColor="var(--warn)"
        iconBg="var(--warn-tint)"
        title={td.suspendedTitle}
        message={td.suspendedMessage}
        notes={userData.adminNotes}
        notesTitle={td.reasonLabel}
        footnote={td.needAssistance}
      />
    );
  }

  return (
    <div className="sc">
      <PullToRefreshIndicator pullDistance={pullDistance} progress={progress} refreshing={refreshing} />
      <main className="sc-main">
        <div className="sc-stack-lg" style={{ gap: 32 }}>
          <InstallAppBanner />

          {pendingCount > 0 && (
            <div
              className="sc-card-static"
              style={{ borderLeft: '4px solid var(--warn)', background: 'var(--warn-tint)' }}
            >
              <div className="sc-row-between" style={{ alignItems: 'center' }}>
                <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CloudOff className="w-5 h-5" style={{ color: 'var(--warn)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0 }}>
                      {pendingCount} {pendingCount === 1 ? td.jobSingular : td.jobPlural} {td.offlinePendingSync}
                    </p>
                    <p className="sc-helper" style={{ margin: 0 }}>{td.syncWillSync}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={retryAll}
                  className="sc-cta"
                  style={{
                    padding: '10px 16px',
                    background: 'var(--warn)',
                    color: 'var(--paper)',
                    fontSize: 14,
                  }}
                >
                  {td.syncNow}
                </button>
              </div>
            </div>
          )}

          <div className="sc-row" style={{ alignItems: 'center', gap: 16 }}>
            {userData?.logoURL && (
              <img
                src={userData.logoURL}
                alt={td.logoAlt}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'contain',
                  border: '1px solid var(--hairline)',
                  background: '#fff',
                  padding: 4,
                }}
              />
            )}
            <div>
              <h1 className="sc-h1">
                {td.welcomeFormat.replace('{name}', userData?.displayName?.split(' ')[0] || td.defaultTechName)}
              </h1>
              <p className="sc-lede" style={{ marginTop: 8 }}>
                {jobs.length} {jobs.length === 1 ? td.jobSingular : td.jobPlural} {td.availableForYou}
              </p>
            </div>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {[
                { icon: Briefcase, iconColor: 'var(--brand)', iconBg: 'var(--brand-tint)', value: stats.totalJobs, label: td.totalJobs },
                { icon: Award, iconColor: 'var(--brand)', iconBg: 'var(--brand-tint)', value: stats.completedJobs, label: td.completedLabel },
                { icon: Star, iconColor: 'var(--warn)', iconBg: 'var(--warn-tint)', value: (stats.averageRating ?? 0).toFixed(1), label: td.ratingLabel },
                { icon: DollarSign, iconColor: 'var(--brand)', iconBg: 'var(--brand-tint)', value: formatCurrency(stats.totalEarnings, DEFAULT_CURRENCY), label: td.earningsLabel },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="sc-card-static">
                    <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          background: s.iconBg,
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon className="w-6 h-6" style={{ color: s.iconColor }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{s.value}</p>
                        <p className="sc-helper" style={{ margin: 0 }}>{s.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div
            role="button"
            tabIndex={0}
            onClick={() => router.push('/technician/scan')}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push('/technician/scan'); }}
            className="sc-card-static"
            style={{ cursor: 'pointer' }}
          >
            <div className="sc-row" style={{ alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-tint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <QrCode className="w-7 h-7" style={{ color: 'var(--brand)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 700, fontSize: 17, margin: 0 }}>{td.quickScanTitle}</h3>
                <p className="sc-helper" style={{ margin: '4px 0 0' }}>{td.quickScanDesc}</p>
              </div>
              <div
                style={{
                  padding: '8px 16px',
                  background: 'var(--brand)',
                  color: 'var(--paper)',
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {td.scanCta}
              </div>
            </div>
          </div>

          <div>
            <div className="sc-row-between" style={{ alignItems: 'center', marginBottom: 24 }}>
              <h2 className="sc-h2" style={{ margin: 0 }}>{td.availableJobsHeading}</h2>
              <button
                type="button"
                onClick={loadData}
                className="sc-cta-ghost"
                style={{ padding: '8px 16px', fontSize: 14 }}
              >
                {td.refresh}
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="sc-card-static" style={{ textAlign: 'center', padding: '48px 16px' }}>
                <Package className="w-16 h-16" style={{ color: 'var(--soft)', margin: '0 auto 16px' }} />
                <h3 className="sc-h2" style={{ marginBottom: 8 }}>{td.noJobsTitle}</h3>
                <p className="sc-helper">{td.noJobsDesc}</p>
                <button
                  type="button"
                  onClick={loadData}
                  className="sc-cta"
                  style={{ marginTop: 24, padding: '12px 24px' }}
                >
                  {td.refresh}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleViewJob(job)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleViewJob(job); }}
                      className="sc-card-static"
                      style={{ cursor: 'pointer' }}
                    >
                      <div
                        style={{
                          aspectRatio: '16 / 9',
                          background: 'var(--off-paper)',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          marginBottom: 16,
                        }}
                      >
                        <img
                          src={job.productSnapshot.image || PLACEHOLDER_IMG}
                          alt={job.productSnapshot.name.en}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>

                      <div className="sc-stack" style={{ gap: 12 }}>
                        <div>
                          <h3 style={{ fontWeight: 600, fontSize: 17, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.productSnapshot.name[userData?.preferredLanguage || 'en'] || job.productSnapshot.name.en}
                          </h3>
                          <p className="sc-helper" style={{ margin: '4px 0 0' }}>
                            {td.orderHash}{job.orderNumber}
                          </p>
                        </div>

                        <div className="sc-stack" style={{ gap: 8 }}>
                          <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--soft)' }}>
                            <MapPin className="w-4 h-4" />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {job.installationAddress.city}, {job.installationAddress.state}
                            </span>
                          </div>

                          <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--soft)' }}>
                            <Calendar className="w-4 h-4" />
                            <span>
                              {formatDate(job.installationDate, 'short')} • {job.timeSlot}
                            </span>
                          </div>

                          <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--brand)' }}>
                            <DollarSign className="w-4 h-4" />
                            <span>{formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewJob(job);
                          }}
                          className="sc-cta"
                          style={{ width: '100%', padding: '12px 16px' }}
                        >
                          {td.viewDetailsAccept}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div ref={sentinelRef} style={{ height: 1 }} />
                {loadingMore && (
                  <div className="sc-row" style={{ justifyContent: 'center', padding: '24px 0' }}>
                    <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

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
