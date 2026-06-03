'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Wrench,
  ShoppingCart,
  Receipt,
  BarChart3,
  Settings,
  Users,
  CalendarClock,
  CalendarDays,
  Boxes,
  Star,
  LogOut,
  Menu,
  X,
  UserCircle2
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { isDualModeUser } from '@/lib/auth/dualMode';
import NotificationBell from '@/components/common/NotificationBell';
import toast from 'react-hot-toast';

import { LucideIcon } from 'lucide-react';

interface NavItem {
  key: string;
  href: string;
  icon: LucideIcon;
  // If set, sub-admin sees this item only when visibility[featureKey].subAdmin === true.
  // If `adminOnly` is true, sub-admin never sees it.
  featureKey?: string;
  adminOnly?: boolean;
}

const navigationItems: NavItem[] = [
  { key: 'dashboard',    href: '/admin',              icon: LayoutDashboard },
  { key: 'products',     href: '/admin/products',     icon: Package,        featureKey: 'featureProducts' },
  { key: 'services',     href: '/admin/services',     icon: Wrench,         featureKey: 'featureServices' },
  { key: 'users',        href: '/admin/users',        icon: Users,          featureKey: 'featureUsers' },
  { key: 'technicians',  href: '/admin/technicians',  icon: Users,          featureKey: 'featureUsers' },
  { key: 'orders',       href: '/admin/orders',       icon: ShoppingCart,   featureKey: 'featureOrders' },
  { key: 'schedule',     href: '/admin/schedule',     icon: CalendarDays,   featureKey: 'featureOrders' },
  { key: 'inventory',    href: '/admin/inventory',    icon: Boxes,          adminOnly: true },
  { key: 'maintenance',  href: '/admin/maintenance',  icon: CalendarClock,  featureKey: 'featureMaintenance' },
  { key: 'reviews',      href: '/admin/reviews',      icon: Star,           featureKey: 'featureReviews' },
  { key: 'transactions', href: '/admin/transactions', icon: Receipt,        adminOnly: true },
  { key: 'analytics',    href: '/admin/analytics',    icon: BarChart3,      adminOnly: true },
  { key: 'settings',     href: '/admin/settings',     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, userData, signOut } = useAuth();
  const { t } = useTranslation();
  const { visibility } = useRolePermissions();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const s = t.admin.sidebar;
  const isSubAdmin = userData?.role === 'sub-admin';
  const showCustomerMode = isDualModeUser(userData, user?.email);

  const visibleItems = navigationItems.filter((item) => {
    if (!isSubAdmin) return true;
    if (item.adminOnly) return false;
    if (item.featureKey) return visibility[item.featureKey]?.subAdmin !== false;
    return true;
  });

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
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label={isMobileMenuOpen ? s.closeMenu : s.openMenu}
        aria-expanded={isMobileMenuOpen}
        className="lg:hidden"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 50,
          padding: 8,
          borderRadius: 'var(--radius-md)',
          background: 'var(--paper)',
          border: '1px solid var(--hairline)',
          color: 'var(--ink)',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 30,
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: 256,
          background: 'var(--paper)',
          borderRight: '1px solid var(--hairline)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 40,
          transition: 'transform 0.3s ease',
        }}
      >
        <div style={{ padding: 24, borderBottom: '1px solid var(--hairline)' }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 20,
              fontWeight: 700,
            }}>
              S
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                  Selvacore
                </h1>
                {isSubAdmin && (
                  <span style={{
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--brand-tint)',
                    color: 'var(--brand)',
                  }}>
                    {s.subAdminBadge}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--soft)', margin: 0, marginTop: 2 }}>
                {isSubAdmin ? s.subAdminPanel : s.adminPanel}
              </p>
            </div>
          </Link>
        </div>

        <nav style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            const label = s[item.key as keyof typeof s] || item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: 14,
                  background: isActive ? 'var(--brand-tint)' : 'transparent',
                  color: isActive ? 'var(--brand)' : 'var(--soft)',
                  borderLeft: isActive ? '3px solid var(--brand)' : '3px solid transparent',
                  paddingLeft: isActive ? 13 : 16,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--soft)';
                  }
                }}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid var(--hairline)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--off-paper)',
            marginBottom: 8,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-full)',
              background: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}>
              {userData?.displayName?.charAt(0) || s.userFallback.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userData?.displayName || s.userFallback}
              </p>
              <p style={{ fontSize: 11, color: 'var(--soft)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {userData?.email}
              </p>
            </div>
            <NotificationBell />
          </div>

          {showCustomerMode && (
            <Link
              href="/customer"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--soft)',
                background: 'transparent',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 14,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--ink)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--soft)';
              }}
            >
              <UserCircle2 size={20} />
              <span>Customer mode</span>
            </Link>
          )}

          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--soft)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 14,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover-bg)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--soft)';
            }}
          >
            <LogOut size={20} />
            <span>{s.signOut}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
