'use client';

import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-text-primary">{t.errorPages.pageNotFound}</h2>
          <p className="text-text-secondary">
            {t.errorPages.pageNotFoundDesc}
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          {t.errorPages.goToLogin}
        </Link>
      </div>
    </div>
  );
}
