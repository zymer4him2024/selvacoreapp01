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
      toast.success(t.components.profileDropdown.loggedOut);
      router.push('/login');
    } catch {
      toast.error(t.components.profileDropdown.failedLogout);
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

  const getInitials = () => {
    if (!userData?.displayName) return 'U';
    const names = userData.displayName.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return names[0][0];
  };

  const errorColor = '#ef4444';

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'background 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ position: 'relative' }}>
          {userData?.photoURL ? (
            <img
              src={userData.photoURL}
              alt={userData.displayName || 'User'}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--hairline)',
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--brand)',
                color: 'var(--paper)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {getInitials()}
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              background: 'var(--brand)',
              borderRadius: '50%',
              border: '2px solid var(--paper)',
            }}
          />
        </div>

        <span
          className="hidden md:block"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ink)',
            maxWidth: 150,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {userData?.displayName?.split(' ')[0] || 'User'}
        </span>

        <ChevronDown
          className="w-4 h-4"
          style={{
            color: 'var(--soft)',
            transition: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            width: 264,
            background: 'var(--paper)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: '1px solid var(--hairline)',
              background: 'var(--off-paper)',
            }}
          >
            <div className="sc-row" style={{ alignItems: 'center', gap: 12 }}>
              {userData?.photoURL ? (
                <img
                  src={userData.photoURL}
                  alt={userData.displayName || 'User'}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--brand)',
                    color: 'var(--paper)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {getInitials()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontWeight: 700,
                    color: 'var(--ink)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {userData?.displayName || 'User'}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--soft)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {userData?.email || user?.email}
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: '8px 0' }}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon className="w-5 h-5" style={{ color: 'var(--soft)' }} />
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--hairline)' }}>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                color: errorColor,
                transition: 'background 150ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut className="w-5 h-5" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                {t.customer.logout || 'Log Out'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
