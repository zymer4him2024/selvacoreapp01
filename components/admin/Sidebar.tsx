'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Wrench,
  Building2,
  ShieldCheck,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  Users,
  CalendarClock,
  CalendarDays,
  Boxes,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import NotificationBell from '@/components/common/NotificationBell';
import toast from 'react-hot-toast';

import { LucideIcon } from 'lucide-react';

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
}

const navigationItems: NavItem[] = [
  { key: 'dashboard', href: '/admin', icon: LayoutDashboard },
  { key: 'products', href: '/admin/products', icon: Package },
  { key: 'services', href: '/admin/services', icon: Wrench },
  { key: 'technicians', href: '/admin/technicians', icon: Users },
  { key: 'subContractors', href: '/admin/sub-contractors', icon: Building2 },
  { key: 'subAdmins', href: '/admin/sub-admins', icon: ShieldCheck },
  { key: 'orders', href: '/admin/orders', icon: ShoppingCart },
  { key: 'schedule', href: '/admin/schedule', icon: CalendarDays },
  { key: 'inventory', href: '/admin/inventory', icon: Boxes },
  { key: 'maintenance', href: '/admin/maintenance', icon: CalendarClock },
  { key: 'transactions', href: '/admin/transactions', icon: Receipt },
  { key: 'analytics', href: '/admin/analytics', icon: BarChart3 },
  { key: 'settings', href: '/admin/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userData, signOut } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const s = t.admin.sidebar;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success(s.signedOut);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to sign out';
      toast.error(message);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-apple bg-surface border border-border hover:bg-surface-elevated transition-all"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-surface border-r border-border
          flex flex-col z-40 transition-transform duration-300
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-apple bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-xl font-bold">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Selvacore
              </h1>
              <p className="text-xs text-text-tertiary">{s.adminPanel}</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const label = s[item.key as keyof typeof s] || item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-apple transition-all
                  ${
                    isActive
                      ? 'bg-primary text-white shadow-apple'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3 rounded-apple bg-surface-elevated mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-sm font-semibold">
                {userData?.displayName?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {userData?.displayName || 'Admin'}
              </p>
              <p className="text-xs text-text-tertiary truncate">
                {userData?.email}
              </p>
            </div>
            <NotificationBell />
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-apple text-text-secondary hover:text-error hover:bg-surface-elevated transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">{s.signOut}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

