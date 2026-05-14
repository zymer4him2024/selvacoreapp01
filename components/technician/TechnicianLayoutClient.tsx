'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, Home, QrCode, User, Settings } from 'lucide-react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import UserProfileDropdown from '@/components/customer/UserProfileDropdown';
import NotificationBell from '@/components/common/NotificationBell';
import NetworkStatusBar from '@/components/common/NetworkStatusBar';
import { OfflineQueueProvider } from '@/contexts/OfflineQueueContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useRolePermissions } from '@/hooks/useRolePermissions';

export default function TechnicianLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const { visibility } = useRolePermissions();
  const tl = t.technician.layout;

  const allNavigation = [
    { name: tl.navAvailableJobs, href: '/technician', icon: Home, current: pathname === '/technician', feature: 'featureOrders' },
    { name: tl.navMyJobs, href: '/technician/jobs', icon: Briefcase, current: pathname.startsWith('/technician/jobs'), feature: 'featureOrders' },
    { name: tl.navScan, href: '/technician/scan', icon: QrCode, current: pathname === '/technician/scan', feature: 'featureDevices' },
    { name: tl.navProfile, href: '/technician/profile', icon: User, current: pathname === '/technician/profile', feature: null },
    { name: tl.navSettings, href: '/technician/settings', icon: Settings, current: pathname === '/technician/settings', feature: null },
  ];

  const navigation = allNavigation.filter(
    (item) => !item.feature || visibility[item.feature]?.technician !== false,
  );

  return (
    <ProtectedRoute allowedRoles={['technician']}>
      <OfflineQueueProvider>
        <div className="sc" style={{ minHeight: '100vh', background: 'var(--paper)' }}>
          <nav
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 40,
              background: 'var(--paper)',
              backdropFilter: 'blur(20px)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: 'var(--brand)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>S</span>
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Selvacore</h1>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)' }}>{tl.portalSubtitle}</p>
                  </div>
                </div>

                <div className="sc-nav-desktop" style={{ alignItems: 'center', gap: 8 }}>
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        onClick={() => router.push(item.href)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 500,
                          border: 'none',
                          background: item.current ? 'var(--brand)' : 'transparent',
                          color: item.current ? '#fff' : 'var(--ink-soft)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!item.current) {
                            e.currentTarget.style.background = 'var(--off-paper)';
                            e.currentTarget.style.color = 'var(--ink)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!item.current) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--ink-soft)';
                          }
                        }}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <NotificationBell />
                  <UserProfileDropdown />
                </div>
              </div>
            </div>
          </nav>

          <nav
            className="sc-nav-mobile"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 40,
              background: 'var(--paper)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid var(--line)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gap: 4,
                padding: '4px 8px',
                gridTemplateColumns: `repeat(${Math.max(navigation.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      minHeight: 48,
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: item.current ? 'var(--brand)' : 'transparent',
                      color: item.current ? '#fff' : 'var(--ink-soft)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                    }}
                    onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                    onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Icon className="w-6 h-6" />
                    <span style={{ fontSize: 10, fontWeight: 500 }}>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <main
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '32px 16px',
              paddingBottom: 96,
            }}
            className="sc-tech-main"
          >
            {children}
          </main>

          <NetworkStatusBar />
        </div>
      </OfflineQueueProvider>
    </ProtectedRoute>
  );
}
