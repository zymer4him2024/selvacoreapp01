'use client';

import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, Star, Award, Briefcase, TrendingUp, ImageIcon, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTechnicianStats, TechnicianStats } from '@/lib/services/technicianService';
import { getReviewsForTechnician } from '@/lib/services/reviewService';
import { Review } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import LogoUpload from '@/components/common/LogoUpload';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

export default function TechnicianProfilePage() {
  const { user, userData, updateUserData } = useAuth();
  const { t } = useTranslation();
  const tp = t.technician.profile;
  const [stats, setStats] = useState<TechnicianStats | null>(null);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoURL, setLogoURL] = useState('');
  const [savingLogo, setSavingLogo] = useState(false);

  useEffect(() => {
    if (userData?.logoURL) setLogoURL(userData.logoURL);
  }, [userData]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [techStats, reviewsResult] = await Promise.all([
        getTechnicianStats(user.uid),
        getReviewsForTechnician(user.uid, 5),
      ]);
      setStats(techStats);
      setRecentReviews(reviewsResult.items);
    } catch (error: unknown) {
      toast.error(tp.loadStatsError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">{tp.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{tp.title}</h1>
        <p className="text-text-secondary mt-2">{tp.subtitle}</p>
      </div>

      {/* Profile Card */}
      <div className="apple-card">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-surface-elevated rounded-apple overflow-hidden">
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.displayName || tp.profileAlt}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <User className="w-16 h-16 text-primary" />
                </div>
              )}
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{userData?.displayName || tp.defaultTechName}</h2>
              <p className="text-text-secondary">{tp.professionalInstaller}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-text-secondary">{tp.email}</p>
                  <p className="font-medium">{userData?.email || tp.notProvided}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-text-secondary">{tp.phone}</p>
                  <p className="font-medium">{userData?.phone || tp.notProvided}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-sm text-text-secondary">{tp.rating}</p>
                  <p className="font-medium">{stats?.averageRating.toFixed(1) || '0.0'} / 5.0</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm text-text-secondary">{tp.completionRate}</p>
                  <p className="font-medium">{stats?.completionRate || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="apple-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">{tp.businessLogo}</h2>
          </div>
          <button
            onClick={async () => {
              try {
                setSavingLogo(true);
                await updateUserData({ logoURL: logoURL || undefined });
                toast.success(tp.logoSaved);
              } catch {
                toast.error(tp.logoSaveError);
              } finally {
                setSavingLogo(false);
              }
            }}
            disabled={savingLogo}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-semibold rounded-apple transition-all"
          >
            <Save className="w-4 h-4" />
            {savingLogo ? tp.saving : tp.save}
          </button>
        </div>
        <LogoUpload
          currentLogoURL={logoURL}
          onLogoUploaded={(url) => setLogoURL(url)}
          onLogoRemoved={() => setLogoURL('')}
          label={tp.yourLogo}
          hint={tp.logoHint}
        />
      </div>

      {/* Statistics */}
      <div>
        <h2 className="text-2xl font-bold mb-6">{tp.performanceStats}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalJobs || 0}</p>
                <p className="text-sm text-text-secondary">{tp.totalJobs}</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success/10 rounded-apple flex items-center justify-center">
                <Award className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.completedJobs || 0}</p>
                <p className="text-sm text-text-secondary">{tp.completed}</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning/10 rounded-apple flex items-center justify-center">
                <Star className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.averageRating.toFixed(1) || '0.0'}</p>
                <p className="text-sm text-text-secondary">{tp.avgRating}</p>
              </div>
            </div>
          </div>

          <div className="apple-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-apple flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalEarnings || 0, 'BRL')}</p>
                <p className="text-sm text-text-secondary">{tp.totalEarnings}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Status */}
      <div className="apple-card">
        <h3 className="text-lg font-semibold mb-4">{tp.currentStatus}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-primary/10 rounded-apple">
            <p className="text-sm text-text-secondary mb-1">{tp.upcomingJobs}</p>
            <p className="text-2xl font-bold text-primary">{stats?.upcomingJobs || 0}</p>
          </div>

          <div className="p-4 bg-warning/10 rounded-apple">
            <p className="text-sm text-text-secondary mb-1">{tp.inProgress}</p>
            <p className="text-2xl font-bold text-warning">{stats?.inProgressJobs || 0}</p>
          </div>

          <div className="p-4 bg-success/10 rounded-apple">
            <p className="text-sm text-text-secondary mb-1">{tp.completionRate}</p>
            <p className="text-2xl font-bold text-success">{stats?.completionRate || 0}%</p>
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      <div>
        <h2 className="text-2xl font-bold mb-6">{tp.recentReviews}</h2>
        {recentReviews.length === 0 ? (
          <div className="apple-card text-center py-8">
            <Star className="w-10 h-10 mx-auto mb-3 text-text-tertiary" />
            <p className="text-text-secondary">{tp.noReviewsYet}</p>
            <p className="text-sm text-text-tertiary mt-1">{tp.reviewsWillAppear}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentReviews.map(review => (
              <div key={review.id} className="apple-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-text-tertiary">
                      {tp.orderLabel} {review.orderId} | {formatDate(review.createdAt, 'short')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= review.rating ? 'text-warning fill-warning' : 'text-text-tertiary'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-text-secondary">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

