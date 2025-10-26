'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, Home, User, Settings } from 'lucide-react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import UserProfileDropdown from '@/components/customer/UserProfileDropdown';

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: 'Available Jobs', href: '/technician', icon: Home, current: pathname === '/technician' },
    { name: 'My Jobs', href: '/technician/jobs', icon: Briefcase, current: pathname.startsWith('/technician/jobs') },
    { name: 'Profile', href: '/technician/profile', icon: User, current: pathname === '/technician/profile' },
  ];

  return (
    <ProtectedRoute allowedRoles={['technician']}>
      <div className="min-h-screen bg-background">
        {/* Top Navigation */}
        <nav className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-apple flex items-center justify-center">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold">Selvacore</h1>
                  <p className="text-xs text-text-secondary">Technician Portal</p>
                </div>
              </div>

              {/* Desktop Navigation */}
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

              {/* User Profile */}
              <UserProfileDropdown />
            </div>
          </div>
        </nav>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-xl border-t border-border">
          <div className="grid grid-cols-3 gap-1 p-2">
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

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

