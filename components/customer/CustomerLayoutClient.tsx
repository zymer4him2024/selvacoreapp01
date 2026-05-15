'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Package, Droplet, User } from 'lucide-react';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import BottomNav, { BottomNavItem } from '@/components/common/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { subscribeToUserNotifications } from '@/lib/services/notificationService';
import { Notification } from '@/types/notification';

export default function CustomerLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useTranslation();
  const nav = t.customer.bottomNav;
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToUserNotifications(user.uid, (notifications: Notification[]) => {
      setUnread(notifications.filter((n) => !n.read).length);
    });
    return () => unsubscribe();
  }, [user]);

  const items: BottomNavItem[] = [
    { label: nav.home, href: '/customer', icon: Home, active: pathname === '/customer' },
    { label: nav.orders, href: '/customer/orders', icon: Package, active: pathname.startsWith('/customer/orders') },
    { label: nav.devices, href: '/customer/devices', icon: Droplet, active: pathname.startsWith('/customer/devices') },
    { label: nav.profile, href: '/customer/profile', icon: User, active: pathname.startsWith('/customer/profile'), badge: unread },
  ];

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <div className="sc-customer-shell" style={{ paddingBottom: 80 }}>
        {children}
      </div>
      <BottomNav items={items} />
    </ProtectedRoute>
  );
}
