'use client';

import { Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';

type LabelKey =
  | 'themeSage'
  | 'themeForest'
  | 'themeMeadow'
  | 'themeDark'
  | 'themeSystem';

type Option = {
  value: Theme;
  labelKey: LabelKey;
  /** Palette accent swatch (green themes) … */
  swatch?: string;
  /** … or a lucide icon (dark / system). */
  Icon?: typeof Moon;
};

// Swatch colors mirror each palette's --accent token so the picker previews the
// theme without depending on the active data-theme.
const OPTIONS: Option[] = [
  { value: 'light', labelKey: 'themeSage', swatch: '#2fa36b' },
  { value: 'forest', labelKey: 'themeForest', swatch: '#1f7a54' },
  { value: 'meadow', labelKey: 'themeMeadow', swatch: '#57a03e' },
  { value: 'dark', labelKey: 'themeDark', Icon: Moon },
  { value: 'system', labelKey: 'themeSystem', Icon: Monitor },
];

export default function ThemePreferenceRadio() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div role="radiogroup" aria-label={t.common.theme} className="grid grid-cols-3 gap-3">
      {OPTIONS.map(({ value, labelKey, swatch, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(value)}
            className={[
              'flex flex-col items-center justify-center gap-2 py-4 px-3',
              'rounded-sc-md border transition-all duration-150',
              selected
                ? 'border-[color:var(--accent)] bg-[color:var(--brand-tint)] shadow-sc-focus'
                : 'border-[color:var(--hairline)] bg-[color:var(--paper)] hover:bg-[color:var(--hover-bg)]',
            ].join(' ')}
          >
            {swatch ? (
              <span
                aria-hidden
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '9999px',
                  background: swatch,
                  boxShadow: selected
                    ? '0 0 0 3px var(--paper), 0 0 0 5px var(--accent)'
                    : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                }}
              />
            ) : (
              Icon && (
                <Icon
                  size={20}
                  className={selected ? 'text-[color:var(--accent)]' : 'text-[color:var(--soft)]'}
                  aria-hidden
                />
              )
            )}
            <span
              className={[
                'text-sm font-medium',
                selected ? 'text-[color:var(--ink)]' : 'text-[color:var(--soft)]',
              ].join(' ')}
            >
              {t.common[labelKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
