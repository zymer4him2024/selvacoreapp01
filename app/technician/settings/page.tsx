'use client';

import { Monitor } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import ThemePreferenceRadio from '@/components/ui/ThemePreferenceRadio';

export default function TechnicianSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="sc">
      <main className="sc-main" style={{ maxWidth: 880 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="sc-eyebrow">{t.common.settings}</div>
          <h1 className="sc-h1">{t.common.settings}</h1>
          <p className="sc-lede">{t.common.displayAndAppearanceDesc}</p>
        </div>

        <div className="sc-card-static">
          <div className="sc-row" style={{ marginBottom: 16 }}>
            <Monitor className="w-6 h-6" style={{ color: 'var(--brand)' }} />
            <div>
              <h2 className="sc-h2" style={{ margin: 0 }}>{t.common.displayAndAppearance}</h2>
              <p className="sc-helper" style={{ margin: 0 }}>{t.common.displayAndAppearanceDesc}</p>
            </div>
          </div>
          <ThemePreferenceRadio />
        </div>
      </main>
    </div>
  );
}
