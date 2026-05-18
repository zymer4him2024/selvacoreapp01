'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTechnicianJobsPaginated, getTechnicianJobCounts, TechnicianJobCounts } from '@/lib/services/technicianService';
import { JobCardSkeleton } from '@/components/technician/JobCardSkeleton';
import JobStatusBadge from '@/components/technician/JobStatusBadge';
import PullToRefreshIndicator from '@/components/technician/PullToRefreshIndicator';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Order, OrderStatus } from '@/types/order';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { MapPin, Calendar, DollarSign, Package, Phone, MessageCircle, Search, X } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useTranslation } from '@/hooks/useTranslation';
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsappHelper';
import toast from 'react-hot-toast';

type TabType = 'upcoming' | 'in_progress' | 'completed';

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="24" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

export default function MyJobsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
  const tj = t.technician.jobsList;
  const tjd = t.technician.jobDetail;
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [jobs, setJobs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [counts, setCounts] = useState<TechnicianJobCounts>({ upcoming: 0, inProgress: 0, completed: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lang = userData?.preferredLanguage || 'en';
  const { pullDistance, progress, refreshing } = usePullToRefresh({
    onRefresh: () => loadJobs(),
    disabled: loading || loadingMore,
  });

  const visibleJobs = activeTab === 'completed' && searchQuery.trim()
    ? jobs.filter(job => {
        const q = searchQuery.trim().toLowerCase();
        return (
          job.orderNumber.toLowerCase().includes(q) ||
          job.customerInfo.name.toLowerCase().includes(q) ||
          job.installationAddress.city.toLowerCase().includes(q) ||
          job.installationAddress.state.toLowerCase().includes(q)
        );
      })
    : jobs;

  const getStatuses = (tab: TabType): OrderStatus[] => {
    if (tab === 'upcoming') return ['accepted'];
    if (tab === 'in_progress') return ['in_progress'];
    return ['completed'];
  };

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user, activeTab]);

  const loadJobs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [result, jobCounts] = await Promise.all([
        getTechnicianJobsPaginated(user.uid, getStatuses(activeTab), 10),
        getTechnicianJobCounts(user.uid),
      ]);
      setJobs(result.items);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
      setCounts(jobCounts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tj.loadJobsError;
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc || !user) return;
    try {
      setLoadingMore(true);
      const result = await getTechnicianJobsPaginated(user.uid, getStatuses(activeTab), 10, lastDoc);
      setJobs(prev => [...prev, ...result.items]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tj.loadMoreError;
      toast.error(message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, user, activeTab, tj.loadMoreError]);

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

  const handleContactCustomer = (job: Order) => {
    const whatsappLink = generateWhatsAppLink(
      {
        name: job.customerInfo.name,
        phone: job.customerInfo.whatsapp || job.customerInfo.phone,
      },
      {
        orderNumber: job.orderNumber,
        productName: job.productSnapshot.name[lang] || job.productSnapshot.name.en,
        installationDate: formatDate(job.installationDate, 'short'),
        address: `${job.installationAddress.city}, ${job.installationAddress.state}`,
      },
      lang
    );

    openWhatsApp(whatsappLink);
  };

  const handleViewDetails = (jobId: string) => {
    router.push(`/technician/jobs/${jobId}`);
  };

  const tabs = [
    { id: 'upcoming' as TabType, label: tjd.upcoming, count: counts.upcoming },
    { id: 'in_progress' as TabType, label: tjd.inProgress, count: counts.inProgress },
    { id: 'completed' as TabType, label: tjd.completed, count: counts.completed },
  ];

  const emptyTitleByTab: Record<TabType, string> = {
    upcoming: tj.emptyUpcomingTitle,
    in_progress: tj.emptyInProgressTitle,
    completed: tj.emptyCompletedTitle,
  };

  const emptyDescByTab: Record<TabType, string> = {
    upcoming: tj.emptyUpcoming,
    in_progress: tj.emptyInProgress,
    completed: tj.emptyCompleted,
  };

  return (
    <div className="sc">
      <PullToRefreshIndicator pullDistance={pullDistance} progress={progress} refreshing={refreshing} />
      <main className="sc-main">
        <div className="sc-stack-lg" style={{ gap: 32 }}>
          <div>
            <div className="sc-eyebrow">{tj.title}</div>
            <h1 className="sc-h1">{tj.title}</h1>
            <p className="sc-lede">{tj.subtitle}</p>
          </div>

          <div
            className="sc-row"
            style={{
              gap: 8,
              borderBottom: '1px solid var(--hairline)',
              overflowX: 'auto',
              flexWrap: 'nowrap',
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    padding: '12px 16px',
                    minHeight: 44,
                    fontWeight: 600,
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
                    background: 'transparent',
                    color: active ? 'var(--brand)' : 'var(--soft)',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      style={{
                        flexShrink: 0,
                        padding: '2px 8px',
                        fontSize: 12,
                        borderRadius: 9999,
                        background: active ? 'var(--brand-tint)' : 'var(--off-paper)',
                        color: active ? 'var(--brand)' : 'var(--soft)',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {activeTab === 'completed' && jobs.length > 0 && (
            <div style={{ position: 'relative' }}>
              <Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--soft)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tj.searchPlaceholder}
                className="sc-input"
                style={{ paddingLeft: 36, paddingRight: 36, minHeight: 44 }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={tj.clearSearch}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: 4,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--soft)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="sc-stack" style={{ gap: 16 }}>
              <JobCardSkeleton variant="list" />
              <JobCardSkeleton variant="list" />
              <JobCardSkeleton variant="list" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="sc-card-static" style={{ textAlign: 'center', padding: '48px 16px' }}>
              <Package className="w-16 h-16" style={{ color: 'var(--soft)', margin: '0 auto 16px' }} />
              <h3 className="sc-h2" style={{ marginBottom: 8 }}>{emptyTitleByTab[activeTab]}</h3>
              <p className="sc-helper">{emptyDescByTab[activeTab]}</p>
              {activeTab === 'upcoming' && (
                <button
                  type="button"
                  onClick={() => router.push('/technician')}
                  className="sc-cta"
                  style={{ marginTop: 24, padding: '12px 24px' }}
                >
                  {tj.browseAvailable}
                </button>
              )}
              {activeTab === 'in_progress' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className="sc-cta"
                  style={{ marginTop: 24, padding: '12px 24px' }}
                >
                  {tj.viewUpcoming}
                </button>
              )}
            </div>
          ) : visibleJobs.length === 0 ? (
            <div className="sc-card-static" style={{ textAlign: 'center', padding: '48px 16px' }}>
              <Search className="w-16 h-16" style={{ color: 'var(--soft)', margin: '0 auto 16px' }} />
              <h3 className="sc-h2" style={{ marginBottom: 8 }}>{tj.searchNoResults}</h3>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="sc-cta"
                style={{ marginTop: 16, padding: '12px 24px' }}
              >
                {tj.clearSearch}
              </button>
            </div>
          ) : (
            <div className="sc-stack" style={{ gap: 16 }}>
              {visibleJobs.map((job) => (
                <div
                  key={job.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleViewDetails(job.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleViewDetails(job.id); }}
                  className="sc-card-static"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="sc-row" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div
                      className="hidden md:block"
                      style={{ width: 128, height: 128, background: 'var(--off-paper)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0 }}
                    >
                      <img
                        src={job.productSnapshot.image || PLACEHOLDER_IMG}
                        alt={job.productSnapshot.name.en}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>

                    <div className="sc-stack" style={{ flex: 1, gap: 12, minWidth: 0 }}>
                      <div className="sc-row-between" style={{ alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <h3 style={{ fontWeight: 600, fontSize: 17, margin: 0 }}>
                            {job.productSnapshot.name[lang] || job.productSnapshot.name.en}
                          </h3>
                          <p className="sc-helper" style={{ margin: '4px 0 0' }}>
                            {tj.orderHash}{job.orderNumber}
                          </p>
                        </div>
                        <JobStatusBadge status={job.status} size="sm" />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                        <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--soft)' }}>
                          <MapPin className="w-4 h-4" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {job.installationAddress.city}, {job.installationAddress.state}
                          </span>
                        </div>

                        <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--soft)' }}>
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(job.installationDate, 'short')} • {job.timeSlot}</span>
                        </div>

                        <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--soft)' }}>
                          <Phone className="w-4 h-4" />
                          <span>{job.customerInfo.name}</span>
                        </div>

                        <div className="sc-row" style={{ alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--brand)' }}>
                          <DollarSign className="w-4 h-4" />
                          <span>{formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="sc-row" style={{ gap: 8, flexShrink: 0, flexDirection: 'column' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactCustomer(job);
                        }}
                        aria-label={tj.contact}
                        className="sc-cta"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          padding: '8px 16px',
                          minHeight: 44,
                        }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden md:inline">{tj.contact}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(job.id);
                        }}
                        className="sc-cta-ghost"
                        style={{ padding: '8px 16px', minHeight: 44 }}
                      >
                        {tj.viewDetails}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div ref={sentinelRef} style={{ height: 1 }} />
              {loadingMore && (
                <div className="sc-row" style={{ justifyContent: 'center', padding: '24px 0' }}>
                  <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
