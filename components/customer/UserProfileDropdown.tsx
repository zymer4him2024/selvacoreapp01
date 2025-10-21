'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, LogOut, ShoppingCart, Globe, ChevronDown } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { useTranslation } from '@/hooks/useTranslation';
import toast from 'react-hot-toast';

export default function UserProfileDropdown() {
  const { user, userData } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to log out');
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    {
      icon: User,
      label: t.customer.profile || 'Profile',
      action: () => router.push('/customer/profile'),
    },
    {
      icon: ShoppingCart,
      label: t.customer.myOrders,
      action: () => router.push('/customer/orders'),
    },
    {
      icon: Globe,
      label: t.customer.language || 'Language',
      action: () => router.push('/customer/settings'),
    },
    {
      icon: Settings,
      label: t.customer.settings || 'Settings',
      action: () => router.push('/customer/settings'),
    },
  ];

  // Get user initials for avatar
  const getInitials = () => {
    if (!userData?.displayName) return 'U';
    const names = userData.displayName.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 hover:bg-surface-elevated rounded-apple transition-all"
      >
        {/* Avatar */}
        <div className="relative">
          {userData?.photoURL ? (
            <img
              src={userData.photoURL}
              alt={userData.displayName || 'User'}
              className="w-10 h-10 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
              {getInitials()}
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-background"></div>
        </div>

        {/* User Name (hidden on mobile) */}
        <span className="hidden md:block text-sm font-medium text-text-primary max-w-[150px] truncate">
          {userData?.displayName?.split(' ')[0] || 'User'}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-text-tertiary transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-apple shadow-apple overflow-hidden animate-slide-up z-50">
          {/* User Info Header */}
          <div className="p-4 border-b border-border bg-surface-elevated">
            <div className="flex items-center gap-3">
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.displayName || 'User'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                  {getInitials()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary truncate">
                  {userData?.displayName || 'User'}
                </p>
                <p className="text-sm text-text-tertiary truncate">
                  {userData?.email || user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-text-tertiary" />
                  <span className="text-sm text-text-primary">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Logout */}
          <div className="border-t border-border">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-error/10 transition-colors text-left text-error"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">
                {t.customer.logout || 'Log Out'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

