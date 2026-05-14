'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';

type Option = {
  value: Theme;
  labelKey: 'themeLight' | 'themeDark' | 'themeSystem';
  Icon: typeof Sun;
};

const OPTIONS: Option[] = [
  { value: 'light', labelKey: 'themeLight', Icon: Sun },
  { value: 'dark', labelKey: 'themeDark', Icon: Moon },
  { value: 'system', labelKey: 'themeSystem', Icon: Monitor },
];

export default function ThemePreferenceRadio() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div role="radiogroup" aria-label={t.common.theme} className="grid grid-cols-3 gap-3">
      {OPTIONS.map(({ value, labelKey, Icon }) => {
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
                ? 'border-[color:var(--brand)] bg-[color:var(--brand-tint)] shadow-sc-focus'
                : 'border-[color:var(--hairline)] bg-[color:var(--paper)] hover:bg-[color:var(--hover-bg)]',
            ].join(' ')}
          >
            <Icon
              size={20}
              className={selected ? 'text-[color:var(--brand)]' : 'text-[color:var(--soft)]'}
              aria-hidden
            />
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
