'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

// User-selectable themes. 'light' renders the Sage glass palette; 'forest' and
// 'meadow' are the other two green light-family palettes; 'dark' is the dark
// palette; 'system' follows the OS light/dark preference.
export type Theme = 'light' | 'dark' | 'system' | 'forest' | 'meadow';
// The concrete value written to <html data-theme>. Forest/meadow are their own
// values; the sc-* token system has no block for them, so it falls back to its
// bare :root (light) values while the glass tokens re-tint.
export type ResolvedTheme = 'light' | 'dark' | 'forest' | 'meadow';

const SELECTABLE: Theme[] = ['light', 'dark', 'system', 'forest', 'meadow'];

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (next: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'selvacore-theme';

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && SELECTABLE.includes(value as Theme);
}

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : null;
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(choice: Theme): ResolvedTheme {
  if (choice === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return choice;
}

function applyDataTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolved);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, userData } = useAuth();
  // Default to the light 'Sage' palette (not 'system') so the crystal skin
  // shows in light by default; users can still pick dark/system/forest/meadow.
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const userPickedRef = useRef<boolean>(false);

  // 1. Hydrate from localStorage on mount. localStorage wins over Firestore.
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      setThemeState(stored);
      userPickedRef.current = true;
      const r = resolve(stored);
      setResolvedTheme(r);
      applyDataTheme(r);
    } else {
      // No stored choice → default to light (not OS preference).
      const r = resolve('light');
      setResolvedTheme(r);
      applyDataTheme(r);
    }
  }, []);

  // 2. Seed from Firestore once, only if user hasn't picked in this browser.
  useEffect(() => {
    if (userPickedRef.current) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;

    const profileTheme = userData?.preferredTheme;
    if (isTheme(profileTheme)) {
      setThemeState(profileTheme);
      window.localStorage.setItem(STORAGE_KEY, profileTheme);
      const r = resolve(profileTheme);
      setResolvedTheme(r);
      applyDataTheme(r);
    }
  }, [userData?.preferredTheme]);

  // 3. While in system mode, follow OS preference live.
  useEffect(() => {
    if (theme !== 'system') return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const r: ResolvedTheme = mq.matches ? 'dark' : 'light';
      setResolvedTheme(r);
      applyDataTheme(r);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      userPickedRef.current = true;
      setThemeState(next);
      const r = resolve(next);
      setResolvedTheme(r);
      applyDataTheme(r);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      if (user) {
        updateDoc(doc(db, 'users', user.uid), {
          preferredTheme: next,
          updatedAt: new Date(),
        }).catch(() => {
          // Non-fatal: localStorage still holds the choice for this browser.
        });
      }
    },
    [user],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
