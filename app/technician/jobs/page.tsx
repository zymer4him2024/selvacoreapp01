'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getTechnicianJobs } from '@/lib/services/technicianService';
import { Order, OrderStatus } from '@/types/order';
import { MapPin, Calendar, DollarSign, Package, Phone, MessageCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import { generateWhatsAppLink, openWhatsApp } from '@/lib/utils/whatsappHelper';
import toast from 'react-hot-toast';

type TabType = 'upcoming' | 'in_progress' | 'completed';

export default function MyJobsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [jobs, setJobs] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const lang = userData?.preferredLanguage || 'en';

  useEffect(() => {
    if (user) {
      loadJobs();
    }
  }, [user, activeTab]);

  const loadJobs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let statuses: OrderStatus[];
      if (activeTab === 'upcoming') {
        statuses = ['accepted'];
      } else if (activeTab === 'in_progress') {
        statuses = ['in_progress'];
      } else {
        statuses = ['completed'];
      }

      const technicianJobs = await getTechnicianJobs(user.uid, statuses);
      setJobs(technicianJobs);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

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
    { id: 'upcoming' as TabType, label: 'Upcoming', count: 0 },
    { id: 'in_progress' as TabType, label: 'In Progress', count: 0 },
    { id: 'completed' as TabType, label: 'Completed', count: 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">My Jobs</h1>
        <p className="text-text-secondary mt-2">
          Manage your accepted and ongoing installations
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-semibold border-b-2 transition-all whitespace-nowrap ${
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
          <h3 className="text-xl font-semibold mb-2">No {activeTab.replace('_', ' ')} jobs</h3>
          <p className="text-text-secondary">
            {activeTab === 'upcoming' && 'Accept jobs from the Available Jobs page'}
            {activeTab === 'in_progress' && 'Start your upcoming jobs to see them here'}
            {activeTab === 'completed' && 'Complete jobs to see them in your history'}
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
                    src={job.productSnapshot.image || '/placeholder.png'}
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
                      Order #{job.orderNumber}
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
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-success hover:bg-success/80 text-white font-medium rounded-apple transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden md:inline">Contact</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(job.id);
                    }}
                    className="flex-1 md:flex-initial px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-apple transition-all"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

