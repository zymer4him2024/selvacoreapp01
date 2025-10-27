'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { Package, Wrench, Building2, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { getAdminStats, getRecentOrders, RecentOrder, AdminStats } from '@/lib/services/adminStatsService';
import { formatCurrency, formatOptionalNumber } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
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
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setDataLoading(false);
    }
  };

  // If not logged in, show login page
  if (!authLoading && !user) {
    return <AdminLoginView onSignIn={async () => {
      try {
        setLoading(true);
        console.log('🔐 Admin login attempt...');
        
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        console.log('✅ Popup sign-in successful:', result.user.email);
        
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        
        if (!userDoc.exists()) {
          console.log('📝 Creating admin account...');
          const newAdminUser = {
            id: result.user.uid,
            role: 'admin',
            email: result.user.email || '',
            displayName: result.user.displayName || '',
            photoURL: result.user.photoURL || undefined,
            phone: '',
            preferredLanguage: 'en',
            active: true,
            emailVerified: result.user.emailVerified,
            roleSelected: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            lastLoginAt: Timestamp.now(),
          };
          
          await setDoc(doc(db, 'users', result.user.uid), newAdminUser);
          toast.success('Admin account created! Welcome!');
          return;
        }
        
        const userDataFromDb = userDoc.data();
        
        if (userDataFromDb.role !== 'admin') {
          toast.error(`Access denied. Admin access only.`);
          await auth.signOut();
          setLoading(false);
        } else {
          toast.success('Welcome, Admin!');
        }
      } catch (error: any) {
        console.error('❌ Admin sign-in error:', error);
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          toast.error(error.message || 'Failed to sign in');
        }
        setLoading(false);
      }
    }} loading={loading} />;
  }

  // If logged in but not admin, deny access
  if (!authLoading && user && userData && userData.role !== 'admin') {
    router.push('/');
    return null;
  }

  // Show dashboard for admins
  if (!user || !userData || authLoading || dataLoading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Real data from Firestore
  const statsData = [
    { name: 'Total Products', value: formatOptionalNumber(stats.totalProducts), icon: Package, change: stats.revenueChange, trend: 'up' },
    { name: 'Total Services', value: formatOptionalNumber(stats.totalServices), icon: Wrench, change: stats.revenueChange, trend: 'up' },
    { name: 'Technicians', value: formatOptionalNumber(stats.totalTechnicians), icon: Users, change: stats.revenueChange, trend: 'up' },
    { name: 'Total Orders', value: formatOptionalNumber(stats.totalOrders), icon: ShoppingCart, change: stats.orderChange, trend: 'up' },
    { name: 'Revenue (MTD)', value: formatCurrency(stats.revenueMTD, 'BRL'), icon: TrendingUp, change: stats.revenueChange, trend: 'up' },
    { name: 'Total Customers', value: formatOptionalNumber(stats.totalCustomers), icon: Building2, change: stats.orderChange, trend: 'up' },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-warning bg-warning/10',
      accepted: 'text-primary bg-primary/10',
      in_progress: 'text-secondary bg-secondary/10',
      completed: 'text-success bg-success/10',
      cancelled: 'text-error bg-error/10',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-text-secondary">
          Welcome back! Here's what's happening with your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="apple-card group hover:scale-[1.02] transition-transform cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-text-tertiary text-sm font-medium mb-1">
                    {stat.name}
                  </p>
                  <p className="text-3xl font-bold mb-2">{stat.value}</p>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-success' : 'text-error'}`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-text-tertiary">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-apple bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="apple-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Recent Orders</h2>
            <p className="text-text-secondary text-sm mt-1">
              Latest orders from customers
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="px-4 py-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple text-sm font-medium transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 rounded-apple bg-surface hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <div className="flex-1">
                <p className="font-medium">{order.customer}</p>
                <p className="text-sm text-text-secondary">{order.product}</p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status.replace('_', ' ')}
                </span>
                <span className="text-sm text-text-tertiary">{order.id}</span>
                <span className="font-semibold">{order.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href="/admin/products/new"
          className="apple-card hover:scale-[1.02] transition-transform text-center py-8"
        >
          <Package className="w-10 h-10 mx-auto mb-3 text-primary" />
          <h3 className="font-semibold mb-1">Add Product</h3>
          <p className="text-sm text-text-tertiary">Create new product</p>
        </a>

        <a
          href="/admin/services/new"
          className="apple-card hover:scale-[1.02] transition-transform text-center py-8"
        >
          <Wrench className="w-10 h-10 mx-auto mb-3 text-secondary" />
          <h3 className="font-semibold mb-1">Add Service</h3>
          <p className="text-sm text-text-tertiary">Create new service</p>
        </a>

        <a
          href="/admin/sub-contractors"
          className="apple-card hover:scale-[1.02] transition-transform text-center py-8"
        >
          <Building2 className="w-10 h-10 mx-auto mb-3 text-success" />
          <h3 className="font-semibold mb-1">Manage Sub-Contractors</h3>
          <p className="text-sm text-text-tertiary">View all contractors</p>
        </a>

        <a
          href="/admin/analytics"
          className="apple-card hover:scale-[1.02] transition-transform text-center py-8"
        >
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-warning" />
          <h3 className="font-semibold mb-1">View Analytics</h3>
          <p className="text-sm text-text-tertiary">Business insights</p>
        </a>
      </div>
    </div>
  );
}

// Admin Login View Component
function AdminLoginView({ onSignIn, loading }: { onSignIn: () => Promise<void>; loading: boolean }) {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">👑</div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Admin Portal
            </h1>
            <p className="text-lg text-text-secondary">
              Administrators Only
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="apple-card space-y-6 animate-slide-up">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Sign In</h2>
            <p className="text-text-secondary text-sm">
              Use your authorized admin Google account
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={onSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium rounded-apple transition-all hover:scale-[1.02] shadow-apple"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Verifying...' : 'Continue with Google'}
          </button>

          {/* Warning */}
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-apple">
            <p className="text-sm text-warning text-center">
              ⚠️ Authorized administrators only. Access is restricted.
            </p>
          </div>
        </div>

        {/* Back to Main Site */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            ← Back to Main Site
          </button>
        </div>
      </div>
    </div>
  );
}

