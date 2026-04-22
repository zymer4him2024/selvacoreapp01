'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Package, LogOut, Settings } from 'lucide-react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import NotificationBell from '@/components/common/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';

export default function SubAdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/sub-admin', icon: Home, current: pathname === '/sub-admin' },
    { name: 'Technicians', href: '/sub-admin/technicians', icon: Users, current: pathname.startsWith('/sub-admin/technicians') },
    { name: 'Orders', href: '/sub-admin/orders', icon: Package, current: pathname.startsWith('/sub-admin/orders') },
    { name: 'Settings', href: '/sub-admin/settings', icon: Settings, current: pathname === '/sub-admin/settings' },
  ];

  return (
    <ProtectedRoute allowedRoles={['sub-admin', 'admin']}>
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-apple flex items-center justify-center">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold">Selvacore</h1>
                  <p className="text-xs text-text-secondary">Sub-Admin Portal</p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => router.push(item.href)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-apple font-medium transition-all ${
                        item.current
                          ? 'bg-primary text-white'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <NotificationBell />
                <span className="text-sm text-text-secondary hidden md:block">
                  {userData?.displayName}
                </span>
                <button
                  onClick={() => signOut()}
                  className="p-2 text-text-secondary hover:text-text-primary rounded-apple hover:bg-surface-elevated transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-xl border-t border-border">
          <div className="grid grid-cols-4 gap-1 p-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`flex flex-col items-center gap-1 py-2 px-3 rounded-apple transition-all ${
                    item.current
                      ? 'bg-primary text-white'
                      : 'text-text-secondary'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
