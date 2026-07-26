'use client';

import { useEffect, useState } from 'react';
import {
  CrystalBg,
  GlassCard,
  GlassButton,
  GlassChip,
  GlassBadge,
} from '@/components/common/glass';

/**
 * /style-guide — Liquid Glass primitive showcase (Phase 2 review surface).
 *
 * Renders every glass primitive and lets you flip data-theme live across the
 * four palettes. This is a dev/review route, not part of the product flows.
 */

const THEMES = [
  { id: 'light', label: 'Sage' },
  { id: 'forest', label: 'Deep Forest' },
  { id: 'meadow', label: 'Meadow' },
  { id: 'dark', label: 'Dark' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

// Maintenance escalation stays semantically color-distinct — not all green.
const STATUSES = [
  { label: 'HEALTHY', color: 'var(--accent)' },
  { label: 'DUE', color: '#f59e0b' },
  { label: 'OVERDUE', color: '#f97316' },
  { label: 'CRITICAL', color: '#ef4444' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        {children}
      </div>
    </section>
  );
}

export default function StyleGuidePage() {
  const [theme, setTheme] = useState<ThemeId>('light');

  // Drive the real <html data-theme> so the whole token system re-tints live.
  // Snapshot the prior value and restore it on unmount so leaving the demo
  // doesn't strand the app in an unexpected theme.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', theme);
    return () => {
      if (prev) root.setAttribute('data-theme', prev);
    };
  }, [theme]);

  return (
    <>
      <CrystalBg />
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 960,
          margin: '0 auto',
          padding: '48px 24px 96px',
          color: 'var(--body)',
          fontFamily: 'var(--font-inter), -apple-system, system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent)' }}>
          LIQUID GLASS
        </p>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--headline)',
            margin: '4px 0 24px',
          }}
        >
          Primitive style guide
        </h1>

        {/* Theme switcher */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
          {THEMES.map((t) => (
            <GlassButton
              key={t.id}
              size="sm"
              variant={theme === t.id ? 'accent' : 'glass'}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </GlassButton>
          ))}
        </div>

        <Section title="Buttons">
          <GlassButton variant="accent">Primary action</GlassButton>
          <GlassButton variant="glass">Secondary</GlassButton>
          <GlassButton variant="accent" size="sm">
            Small
          </GlassButton>
          <GlassButton variant="glass" size="sm">
            Small
          </GlassButton>
          <GlassButton variant="accent" disabled>
            Disabled
          </GlassButton>
        </Section>

        <Section title="Chips">
          <GlassChip>DEFAULT</GlassChip>
          <GlassChip dot={false}>NO DOT</GlassChip>
          {STATUSES.map((s) => (
            <GlassChip key={s.label} dotColor={s.color}>
              {s.label}
            </GlassChip>
          ))}
        </Section>

        <Section title="Badges">
          <GlassBadge>1</GlassBadge>
          <GlassBadge>2</GlassBadge>
          <GlassBadge size={64}>3</GlassBadge>
          <GlassBadge size={88}>4</GlassBadge>
        </Section>

        <Section title="Cards">
          <GlassCard style={{ padding: 24, width: 260 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--headline)', margin: '0 0 8px' }}>
              Frosted card
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              The workhorse surface. Translucent fill, specular sheen, layered depth shadow.
            </p>
          </GlassCard>

          <GlassCard interactive style={{ padding: 24, width: 260 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--headline)', margin: '0 0 8px' }}>
              Interactive
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              Hover me — lifts on hover. Use only on clickable cards.
            </p>
          </GlassCard>

          <GlassCard tint style={{ padding: 24, width: 260 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--on-accent)', margin: '0 0 8px' }}>
              Tinted (CTA)
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, color: 'var(--on-accent)', opacity: 0.9 }}>
              Accent-filled glass for primary surfaces and calls to action.
            </p>
          </GlassCard>
        </Section>

        <Section title="Composed — role card">
          <GlassCard radius="glass-lg" style={{ padding: 32, width: '100%', maxWidth: 560 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <GlassBadge size={64}>3</GlassBadge>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <GlassChip dotColor="var(--accent)">STEP 3</GlassChip>
                  <GlassChip dotColor="#f59e0b">DUE SOON</GlassChip>
                </div>
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--headline)',
                    margin: '0 0 8px',
                  }}
                >
                  Filter replacement
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                  Ezer unit #A-1042 is approaching its scheduled maintenance window. Assign a
                  technician to keep the escalation from advancing.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <GlassButton variant="accent">Assign technician</GlassButton>
                  <GlassButton variant="glass">View device</GlassButton>
                </div>
              </div>
            </div>
          </GlassCard>
        </Section>
      </main>
    </>
  );
}
