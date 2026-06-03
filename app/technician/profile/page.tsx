'use client';

import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, Star, Award, Briefcase, TrendingUp, ImageIcon, Save, Pencil, X, MapPin, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTechnicianStats, TechnicianStats } from '@/lib/services/technicianService';
import { getReviewsForTechnician } from '@/lib/services/reviewService';
import { Review } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import LogoUpload from '@/components/common/LogoUpload';
import { useTranslation } from '@/hooks/useTranslation';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';
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
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    phone: '',
    whatsapp: '',
    bio: '',
    serviceAreas: '',
  });

  useEffect(() => {
    if (userData?.logoURL) setLogoURL(userData.logoURL);
  }, [userData]);

  useEffect(() => {
    if (!userData) return;
    setForm({
      displayName: userData.displayName || '',
      phone: userData.phone || '',
      whatsapp: userData.whatsapp || '',
      bio: userData.bio || '',
      serviceAreas: (userData.serviceAreas || []).join(', '),
    });
  }, [userData]);

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const serviceAreas = form.serviceAreas
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      await updateUserData({
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim() || undefined,
        bio: form.bio.trim() || undefined,
        serviceAreas: serviceAreas.length > 0 ? serviceAreas : undefined,
      });
      toast.success(tp.profileUpdated);
      setEditingProfile(false);
    } catch {
      toast.error(tp.profileUpdateError);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    if (userData) {
      setForm({
        displayName: userData.displayName || '',
        phone: userData.phone || '',
        whatsapp: userData.whatsapp || '',
        bio: userData.bio || '',
        serviceAreas: (userData.serviceAreas || []).join(', '),
      });
    }
    setEditingProfile(false);
  };

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
    } catch {
      toast.error(tp.loadStatsError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="sc" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="sc-stack" style={{ alignItems: 'center', gap: 16 }}>
          <div className="sc-spinner-wrap"><div className="sc-spinner" /></div>
          <p className="sc-helper">{tp.loading}</p>
        </div>
      </div>
    );
  }

  const StatTile = ({
    icon: Icon,
    iconColor,
    iconBg,
    value,
    label,
  }: {
    icon: typeof Briefcase;
    iconColor: string;
    iconBg: string;
    value: string | number;
    label: string;
  }) => (
    <div className="sc-card-static">
      <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 48,
            height: 48,
            background: iconBg,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon className="w-6 h-6" style={{ color: iconColor }} />
        </div>
        <div>
          <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{value}</p>
          <p className="sc-helper" style={{ margin: 0 }}>{label}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="sc">
      <main className="sc-main">
        <div className="sc-stack-lg" style={{ gap: 32 }}>
          <div>
            <div className="sc-eyebrow">{tp.title}</div>
            <h1 className="sc-h1">{tp.title}</h1>
            <p className="sc-lede">{tp.subtitle}</p>
          </div>

          <div className="sc-card-static">
            <div className="sc-row" style={{ flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0 }}>
                <div
                  style={{
                    width: 128,
                    height: 128,
                    background: 'var(--off-paper)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  {userData?.photoURL ? (
                    <img
                      src={userData.photoURL}
                      alt={userData.displayName || tp.profileAlt}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--brand-tint)',
                      }}
                    >
                      <User className="w-16 h-16" style={{ color: 'var(--brand)' }} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="sc-row-between" style={{ alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div>
                    <h2 className="sc-h2" style={{ margin: 0 }}>{userData?.displayName || tp.defaultTechName}</h2>
                    <p className="sc-helper" style={{ margin: '4px 0 0' }}>{tp.professionalInstaller}</p>
                  </div>
                  {!editingProfile ? (
                    <button
                      type="button"
                      onClick={() => setEditingProfile(true)}
                      className="sc-cta-ghost"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="hidden sm:inline">{tp.editProfile}</span>
                    </button>
                  ) : (
                    <div className="sc-row" style={{ gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={savingProfile}
                        className="sc-cta-ghost"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', opacity: savingProfile ? 0.5 : 1 }}
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">{tp.cancel}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="sc-cta"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', opacity: savingProfile ? 0.5 : 1 }}
                      >
                        <Save className="w-4 h-4" />
                        <span className="hidden sm:inline">{savingProfile ? tp.saving : tp.saveProfile}</span>
                      </button>
                    </div>
                  )}
                </div>

                {editingProfile ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
                    <div>
                      <label className="sc-label">{tp.displayName}</label>
                      <input
                        type="text"
                        value={form.displayName}
                        onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                        className="sc-input"
                      />
                    </div>

                    <div>
                      <label className="sc-label">{tp.email}</label>
                      <input
                        type="email"
                        value={userData?.email || ''}
                        disabled
                        className="sc-input"
                        style={{ color: 'var(--soft)', cursor: 'not-allowed', background: 'var(--off-paper)' }}
                      />
                    </div>

                    <div>
                      <label className="sc-label">{tp.phone}</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="sc-input"
                      />
                    </div>

                    <div>
                      <label className="sc-label">{tp.whatsapp}</label>
                      <input
                        type="tel"
                        value={form.whatsapp}
                        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                        className="sc-input"
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="sc-label">{tp.bio}</label>
                      <textarea
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        placeholder={tp.bioPlaceholder}
                        rows={3}
                        className="sc-textarea"
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="sc-label">{tp.serviceAreas}</label>
                      <input
                        type="text"
                        value={form.serviceAreas}
                        onChange={(e) => setForm({ ...form, serviceAreas: e.target.value })}
                        className="sc-input"
                      />
                      <p className="sc-helper">{tp.serviceAreasHint}</p>
                    </div>
                  </div>
                ) : (
                  <div className="sc-stack" style={{ gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
                      <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                        <Mail className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                        <div>
                          <p className="sc-helper" style={{ margin: 0 }}>{tp.email}</p>
                          <p style={{ fontWeight: 600, margin: 0 }}>{userData?.email || tp.notProvided}</p>
                        </div>
                      </div>

                      <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                        <Phone className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                        <div>
                          <p className="sc-helper" style={{ margin: 0 }}>{tp.phone}</p>
                          <p style={{ fontWeight: 600, margin: 0 }}>{userData?.phone || tp.notProvided}</p>
                        </div>
                      </div>

                      <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                        <MessageCircle className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                        <div>
                          <p className="sc-helper" style={{ margin: 0 }}>{tp.whatsapp}</p>
                          <p style={{ fontWeight: 600, margin: 0 }}>{userData?.whatsapp || tp.notProvided}</p>
                        </div>
                      </div>

                      <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                        <Star className="w-5 h-5" style={{ color: 'var(--warn)' }} />
                        <div>
                          <p className="sc-helper" style={{ margin: 0 }}>{tp.rating}</p>
                          <p style={{ fontWeight: 600, margin: 0 }}>{stats?.averageRating.toFixed(1) || '0.0'} / 5.0</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ paddingTop: 8, borderTop: '1px solid var(--hairline)' }}>
                      <p className="sc-helper" style={{ marginBottom: 4 }}>{tp.bio}</p>
                      <p style={{ whiteSpace: 'pre-line', margin: 0 }}>
                        {userData?.bio || <span style={{ color: 'var(--soft)', fontStyle: 'italic' }}>{tp.bioEmpty}</span>}
                      </p>
                    </div>

                    <div>
                      <div className="sc-row" style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <MapPin className="w-4 h-4" style={{ color: 'var(--soft)' }} />
                        <p className="sc-helper" style={{ margin: 0 }}>{tp.serviceAreas}</p>
                      </div>
                      {userData?.serviceAreas && userData.serviceAreas.length > 0 ? (
                        <div className="sc-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                          {userData.serviceAreas.map((area) => (
                            <span
                              key={area}
                              style={{
                                padding: '4px 12px',
                                background: 'var(--brand-tint)',
                                color: 'var(--brand)',
                                fontSize: 13,
                                fontWeight: 600,
                                borderRadius: 9999,
                              }}
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: 'var(--soft)', fontStyle: 'italic', fontSize: 13, margin: 0 }}>{tp.serviceAreasEmpty}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sc-card-static">
            <div className="sc-row-between" style={{ alignItems: 'center', marginBottom: 24 }}>
              <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
                <ImageIcon className="w-6 h-6" style={{ color: 'var(--brand)' }} />
                <h2 className="sc-h2" style={{ margin: 0 }}>{tp.businessLogo}</h2>
              </div>
              <button
                type="button"
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
                className="sc-cta"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', opacity: savingLogo ? 0.5 : 1 }}
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

          <div>
            <h2 className="sc-h2" style={{ marginBottom: 24 }}>{tp.performanceStats}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
              <StatTile
                icon={Briefcase}
                iconColor="var(--brand)"
                iconBg="var(--brand-tint)"
                value={stats?.totalJobs || 0}
                label={tp.totalJobs}
              />
              <StatTile
                icon={Award}
                iconColor="var(--brand)"
                iconBg="var(--brand-tint)"
                value={stats?.completedJobs || 0}
                label={tp.completed}
              />
              <StatTile
                icon={Star}
                iconColor="var(--warn)"
                iconBg="var(--warn-tint)"
                value={stats?.averageRating.toFixed(1) || '0.0'}
                label={tp.avgRating}
              />
              <StatTile
                icon={TrendingUp}
                iconColor="var(--brand)"
                iconBg="var(--brand-tint)"
                value={formatCurrency(stats?.totalEarnings || 0, DEFAULT_CURRENCY)}
                label={tp.totalEarnings}
              />
            </div>
          </div>

          <div className="sc-card-static">
            <h3 className="sc-h2" style={{ marginBottom: 16 }}>{tp.currentStatus}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 12 }}>
              <div style={{ padding: 16, background: 'var(--brand-tint)', borderRadius: 'var(--radius-md)' }}>
                <p className="sc-helper" style={{ margin: '0 0 4px' }}>{tp.upcomingJobs}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)', margin: 0 }}>{stats?.upcomingJobs || 0}</p>
              </div>
              <div style={{ padding: 16, background: 'var(--warn-tint)', borderRadius: 'var(--radius-md)' }}>
                <p className="sc-helper" style={{ margin: '0 0 4px' }}>{tp.inProgress}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--warn)', margin: 0 }}>{stats?.inProgressJobs || 0}</p>
              </div>
              <div style={{ padding: 16, background: 'var(--brand-tint)', borderRadius: 'var(--radius-md)' }}>
                <p className="sc-helper" style={{ margin: '0 0 4px' }}>{tp.completionRate}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand)', margin: 0 }}>{stats?.completionRate || 0}%</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="sc-h2" style={{ marginBottom: 24 }}>{tp.recentReviews}</h2>
            {recentReviews.length === 0 ? (
              <div className="sc-card-static" style={{ textAlign: 'center', padding: '32px 16px' }}>
                <Star className="w-10 h-10" style={{ color: 'var(--soft)', margin: '0 auto 12px' }} />
                <p className="sc-helper">{tp.noReviewsYet}</p>
                <p className="sc-helper" style={{ marginTop: 4 }}>{tp.reviewsWillAppear}</p>
              </div>
            ) : (
              <div className="sc-stack" style={{ gap: 16 }}>
                {recentReviews.map(review => (
                  <div key={review.id} className="sc-card-static">
                    <div className="sc-row-between" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p className="sc-helper" style={{ fontSize: 12, margin: 0 }}>
                          {tp.orderLabel} {review.orderId} | {formatDate(review.createdAt, 'short')}
                        </p>
                      </div>
                      <div className="sc-row" style={{ alignItems: 'center', gap: 2 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className="w-4 h-4"
                            style={{
                              color: star <= review.rating ? 'var(--warn)' : 'var(--soft)',
                              fill: star <= review.rating ? 'var(--warn)' : 'none',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="sc-helper" style={{ color: 'var(--ink)' }}>{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
