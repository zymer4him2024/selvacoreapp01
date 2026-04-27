'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTechnicianJobsPaginated, PaginatedResult } from '@/lib/services/technicianService';
import { Order, OrderStatus } from '@/types/order';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { MapPin, Calendar, DollarSign, Package, Phone, MessageCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useTranslation } from '@/hooks/useTranslation';
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsappHelper';
import toast from 'react-hot-toast';

type TabType = 'upcoming' | 'in_progress' | 'completed';

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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lang = userData?.preferredLanguage || 'en';

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
      const result = await getTechnicianJobsPaginated(user.uid, getStatuses(activeTab), 10);
      setJobs(result.items);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
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
    { id: 'upcoming' as TabType, label: tjd.upcoming, count: 0 },
    { id: 'in_progress' as TabType, label: tjd.inProgress, count: 0 },
    { id: 'completed' as TabType, label: tjd.completed, count: 0 },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{tj.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{tj.title}</h1>
        <p className="text-text-secondary mt-2">
          {tj.subtitle}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 min-h-[44px] font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
            {jobs.length > 0 && activeTab === tab.id && (
              <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {jobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="apple-card text-center py-12">
          <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{emptyTitleByTab[activeTab]}</h3>
          <p className="text-text-secondary">
            {emptyDescByTab[activeTab]}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="apple-card hover:shadow-apple-lg transition-all cursor-pointer"
              onClick={() => handleViewDetails(job.id)}
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Product Image */}
                <div className="w-full md:w-32 h-32 bg-surface-elevated rounded-apple overflow-hidden flex-shrink-0">
                  <img
                    src={job.productSnapshot.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="24" fill="%239ca3af" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E'}
                    alt={job.productSnapshot.name.en}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Job Info */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {job.productSnapshot.name[lang] || job.productSnapshot.name.en}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {tj.orderHash}{job.orderNumber}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <Phone className="w-4 h-4" />
                      <span>{job.customerInfo.name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-success">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatCurrency(job.serviceSnapshot?.price || 0, job.payment.currency)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContactCustomer(job);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success hover:bg-success/80 text-white font-medium rounded-apple transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden md:inline">{tj.contact}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(job.id);
                    }}
                    className="flex-1 md:flex-initial px-4 py-2 min-h-[44px] bg-primary hover:bg-primary-hover text-white font-medium rounded-apple transition-all"
                  >
                    {tj.viewDetails}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

