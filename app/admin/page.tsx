'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Package, Wrench, Building2, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { getAdminStats, getRecentOrders, RecentOrder, AdminStats } from '@/lib/services/adminStatsService';
import { formatOptionalNumber, getOrderStatusLabel } from '@/lib/utils/formatters';
import { DEFAULT_CURRENCY } from '@/lib/utils/constants';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocaleFormatters } from '@/hooks/useLocaleFormatters';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import toast from 'react-hot-toast';
import Link from 'next/link';

type StatusColor = { color: string; bg: string };

const STATUS_COLOR_MAP: Record<string, StatusColor> = {
  pending: { color: 'var(--warn)', bg: 'var(--warn-tint)' },
  accepted: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  in_progress: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  completed: { color: 'var(--brand)', bg: 'var(--brand-tint)' },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const getStatusStyle = (status: string): StatusColor =>
  STATUS_COLOR_MAP[status] ?? STATUS_COLOR_MAP.pending;

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormatters();
  const { visibility } = useRolePermissions();
  const isSubAdmin = userData?.role === 'sub-admin';
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setDataLoading(true);
      const [dashboardStats, orders] = await Promise.all([
        getAdminStats(),
        getRecentOrders(5)
      ]);

      setStats(dashboardStats);
      setRecentOrders(orders);
    } catch {
      toast.error(t.admin.dashboard.failedToLoad);
    } finally {
      setDataLoading(false);
    }
  };

  const d = t.admin.dashboard;
  const l = t.admin.login;

  const verifyAdminRole = async (uid: string, isNew: boolean) => {
    const userDoc = await getDoc(doc(db, 'users', uid));

    if (!userDoc.exists()) {
      if (!isNew) {
        toast.error(l.accessDenied);
        await auth.signOut();
        return;
      }
      const newAdminUser = {
        id: uid,
        role: 'admin',
        email: auth.currentUser?.email || '',
        displayName: auth.currentUser?.displayName || '',
        photoURL: auth.currentUser?.photoURL || undefined,
        phone: '',
        preferredLanguage: 'en',
        active: true,
        emailVerified: auth.currentUser?.emailVerified ?? false,
        roleSelected: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'users', uid), newAdminUser);
      toast.success(l.accountCreated);
      return;
    }

    const userDataFromDb = userDoc.data();
    if (userDataFromDb.role !== 'admin' && userDataFromDb.role !== 'sub-admin') {
      toast.error(l.accessDenied);
      await auth.signOut();
    } else {
      toast.success(l.welcomeAdmin);
    }
  };

  if (!authLoading && !user) {
    return (
      <AdminLoginView
        t={l}
        loading={loading}
        onSignIn={async () => {
          try {
            setLoading(true);
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await verifyAdminRole(result.user.uid, true);
          } catch (error: unknown) {
            const isFirebaseError = error instanceof Error && 'code' in error;
            const code = isFirebaseError ? (error as { code: string }).code : '';
            if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
              const message = error instanceof Error ? error.message : l.failedToSignIn;
              toast.error(message);
            }
          } finally {
            setLoading(false);
          }
        }}
        onEmailSignIn={async (email, password) => {
          try {
            setLoading(true);
            const result = await signInWithEmailAndPassword(auth, email, password);
            await verifyAdminRole(result.user.uid, false);
          } catch (error: unknown) {
            const code =
              error && typeof error === 'object' && 'code' in error
                ? String((error as { code?: unknown }).code ?? '')
                : '';
            let message = error instanceof Error ? error.message : l.failedToSignIn;
            if (
              code === 'auth/invalid-credential' ||
              code === 'auth/wrong-password' ||
              code === 'auth/user-not-found'
            ) {
              message = l.incorrectCredentials;
            } else if (code === 'auth/invalid-email') {
              message = l.invalidEmail;
            } else if (code === 'auth/too-many-requests') {
              message = l.tooManyAttempts;
            }
            toast.error(message);
          } finally {
            setLoading(false);
          }
        }}
      />
    );
  }

  if (!authLoading && user && userData && userData.role !== 'admin' && userData.role !== 'sub-admin') {
    router.push('/');
    return null;
  }

  if (!user || !userData || authLoading || dataLoading || !stats) {
    return (
      <div
        className="sc"
        style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
        aria-busy="true"
        aria-label={d.loadingDashboard}
      >
        <div>
          <div style={{ height: 40, width: 256, background: 'var(--off-paper)', borderRadius: 'var(--radius-md)', marginBottom: 8, animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ height: 20, width: 320, background: 'var(--off-paper)', borderRadius: 'var(--radius-md)', animation: 'pulse 2s ease-in-out infinite' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sc-card-static">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 16, width: 96, background: 'var(--off-paper)', borderRadius: 'var(--radius-md)', animation: 'pulse 2s ease-in-out infinite' }} />
                  <div style={{ height: 32, width: 80, background: 'var(--off-paper)', borderRadius: 'var(--radius-md)', animation: 'pulse 2s ease-in-out infinite' }} />
                  <div style={{ height: 12, width: 112, background: 'var(--off-paper)', borderRadius: 'var(--radius-md)', animation: 'pulse 2s ease-in-out infinite' }} />
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--off-paper)', animation: 'pulse 2s ease-in-out infinite' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statsData = [
    { name: d.totalProducts, value: formatOptionalNumber(stats.totalProducts), icon: Package, change: stats.revenueChange, trend: 'up' },
    { name: d.totalServices, value: formatOptionalNumber(stats.totalServices), icon: Wrench, change: stats.revenueChange, trend: 'up' },
    { name: d.technicians, value: formatOptionalNumber(stats.totalTechnicians), icon: Users, change: stats.revenueChange, trend: 'up' },
    { name: d.totalOrders, value: formatOptionalNumber(stats.totalOrders), icon: ShoppingCart, change: stats.orderChange, trend: 'up' },
    { name: d.revenueMTD, value: formatCurrency(stats.revenueMTD, DEFAULT_CURRENCY), icon: TrendingUp, change: stats.revenueChange, trend: 'up' },
    { name: d.totalCustomers, value: formatOptionalNumber(stats.totalCustomers), icon: Building2, change: stats.orderChange, trend: 'up' },
  ];

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {userData?.logoURL && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={userData.logoURL}
            alt={d.logoAlt}
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
          <h1 className="sc-h1" style={{ margin: 0, marginBottom: 8 }}>{d.title}</h1>
          <p className="sc-helper" style={{ margin: 0 }}>{isSubAdmin ? d.subtitleSubAdmin : d.subtitle}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="sc-card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--soft)', margin: 0, marginBottom: 4 }}>
                    {stat.name}
                  </p>
                  <p style={{ fontSize: 32, fontWeight: 700, margin: 0, marginBottom: 8, color: 'var(--ink)' }}>{stat.value}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: stat.trend === 'up' ? 'var(--brand)' : '#ef4444' }}>
                      {stat.change}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--soft)' }}>{t.common.vsLastMonth}</span>
                  </div>
                </div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-tint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon className="w-6 h-6" style={{ color: 'var(--brand)' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sc-card-static">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>{d.recentOrders}</h2>
            <p className="sc-helper" style={{ margin: '4px 0 0' }}>{d.latestOrders}</p>
          </div>
          <Link
            href="/admin/orders"
            className="sc-cta-ghost"
            style={{ fontSize: 14, padding: '8px 16px', textDecoration: 'none' }}
          >
            {t.common.viewAll}
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recentOrders.map((order) => {
            const statusStyle = getStatusStyle(order.status);
            return (
              <div
                key={order.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--off-paper)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--off-paper)'; }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 500, margin: 0, color: 'var(--ink)' }}>{order.customer}</p>
                  <p style={{ fontSize: 14, color: 'var(--soft)', margin: '4px 0 0' }}>{order.product}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 12,
                      fontWeight: 500,
                      color: statusStyle.color,
                      background: statusStyle.bg,
                    }}
                  >
                    {getOrderStatusLabel(order.status, 'admin', t)}
                  </span>
                  <span style={{ fontSize: 14, color: 'var(--soft)' }}>{order.id}</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{order.amount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {(() => {
          const showProducts = !isSubAdmin || visibility.featureProducts?.subAdmin !== 'hidden';
          const showServices = !isSubAdmin || visibility.featureServices?.subAdmin !== 'hidden';
          const showSubContractors = !isSubAdmin;
          const showAnalytics = !isSubAdmin;
          return (
            <>
              {showProducts && (
                <QuickActionCard
                  href="/admin/products/new"
                  icon={Package}
                  title={d.addProduct}
                  description={d.createNewProduct}
                />
              )}
              {showServices && (
                <QuickActionCard
                  href="/admin/services/new"
                  icon={Wrench}
                  title={d.addService}
                  description={d.createNewService}
                />
              )}
              {showSubContractors && (
                <QuickActionCard
                  href="/admin/sub-contractors"
                  icon={Building2}
                  title={d.manageSubContractors}
                  description={d.viewAllContractors}
                />
              )}
              {showAnalytics && (
                <QuickActionCard
                  href="/admin/analytics"
                  icon={TrendingUp}
                  title={d.viewAnalytics}
                  description={d.businessInsights}
                />
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Package;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="sc-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: 32,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <Icon className="w-10 h-10" style={{ color: 'var(--brand)', marginBottom: 12 }} />
      <h3 style={{ fontWeight: 600, margin: 0, marginBottom: 4, color: 'var(--ink)' }}>{title}</h3>
      <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>{description}</p>
    </Link>
  );
}

function AdminLoginView({
  onSignIn,
  onEmailSignIn,
  loading,
  t,
}: {
  onSignIn: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  loading: boolean;
  t: typeof import('@/lib/translations/en').en.admin.login;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error(t.enterEmailPassword);
      return;
    }
    onEmailSignIn(email.trim(), password);
  };

  return (
    <div
      className="sc"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--paper)',
        padding: 16,
      }}
    >
      <div style={{ width: '100%', maxWidth: 448, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>👑</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 className="sc-h1" style={{ margin: 0, color: 'var(--brand)' }}>{t.adminPortal}</h1>
            <p style={{ fontSize: 18, color: 'var(--soft)', margin: 0 }}>{t.administratorsOnly}</p>
          </div>
        </div>

        <div className="sc-card-static" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 className="sc-h2" style={{ margin: 0, fontSize: 24 }}>{t.signIn}</h2>
            <p style={{ fontSize: 14, color: 'var(--soft)', margin: 0 }}>{t.useAuthorized}</p>
          </div>

          <button
            onClick={onSignIn}
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '16px 24px',
              background: '#fff',
              color: '#1f2937',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#f3f4f6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading ? t.verifying : t.continueWithGoogle}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
            <span style={{ fontSize: 12, color: 'var(--soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t.orSignInWithEmail}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
          </div>

          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="email"
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="sc-input"
            />
            <input
              type="password"
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="sc-input"
            />
            <button type="submit" disabled={loading} className="sc-cta" style={{ width: '100%' }}>
              {loading ? t.verifying : t.signInButton}
            </button>
          </form>

          <div
            style={{
              padding: 16,
              background: 'var(--warn-tint)',
              border: '1px solid var(--warn)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p style={{ fontSize: 14, color: 'var(--warn)', textAlign: 'center', margin: 0 }}>
              {t.warningRestricted}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              fontSize: 14,
              color: 'var(--soft)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--soft)'; }}
          >
            {t.backToMainSite}
          </button>
        </div>
      </div>
    </div>
  );
}
