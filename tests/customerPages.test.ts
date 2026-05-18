/**
 * Static source-level checks for customer portal pages.
 *
 *   app/customer/order/payment/confirmation/page.tsx — Tier 1: real order data, not stubs
 *   app/customer/order/payment/page.tsx              — Tier 2: shared progress tracker
 *   app/customer/order/details/page.tsx              — Tier 2: shared progress tracker
 *   app/customer/orders/[id]/page.tsx                — Tier 3: timeline, MapPin, timeLabel, review CTA
 *   app/customer/orders/[id]/review/page.tsx         — Tier 3: star hover preview
 *   app/customer/settings/page.tsx                   — Tier 3: switch a11y
 *   components/customer/OrderProgressTracker.tsx     — Tier 2: #fff on brand (not var(--paper))
 *
 * No DOM is required. These tests verify the audit fixes shipped in commits
 * d6170de (Tier 1), 48b9f06 (Tier 2), and the current Tier 3 batch do not regress.
 *
 * Run with: npm test -- tests/customerPages.test.ts
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/lib/translations/en';
import { es } from '@/lib/translations/es';
import { pt } from '@/lib/translations/pt';
import { ko } from '@/lib/translations/ko';

const REPO_ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf-8');
}


// -----------------------------------------------------------------------------
// Tier 1 — confirmation page reads real order data
// -----------------------------------------------------------------------------
describe('app/customer/order/payment/confirmation/page.tsx — real data, no stubs', () => {
  const src = read('app/customer/order/payment/confirmation/page.tsx');

  it('fetches the Order doc from Firestore by id', () => {
    expect(src).toMatch(/getDoc\(/);
    expect(src).toMatch(/doc\([^,]+,\s*['"]orders['"]/);
  });

  it('does not contain the old hardcoded placeholders', () => {
    expect(src).not.toMatch(/Water Purifier System/);
    expect(src).not.toMatch(/2024-01-15/);
    expect(src).not.toMatch(/123 Main Street/);
  });

  it('imports TIME_SLOTS for time-slot label mapping', () => {
    expect(src).toMatch(/TIME_SLOTS/);
  });

  it('does not render the removed Download Receipt stub button', () => {
    expect(src).not.toMatch(/Download Receipt/);
  });

  it('uses t.orders.amazonPay (not the nonexistent t.payment.amazonPay)', () => {
    expect(src).not.toMatch(/t\.payment\.amazonPay/);
  });
});

// -----------------------------------------------------------------------------
// Tier 2 — shared progress tracker
// -----------------------------------------------------------------------------
describe('OrderProgressTracker — shared component used on details + payment', () => {
  const detailsSrc = read('app/customer/order/details/page.tsx');
  const paymentSrc = read('app/customer/order/payment/page.tsx');
  const trackerSrc = read('components/customer/OrderProgressTracker.tsx');

  it('order/details imports and renders OrderProgressTracker with currentStep=2', () => {
    expect(detailsSrc).toMatch(/from ['"]@\/components\/customer\/OrderProgressTracker['"]/);
    expect(detailsSrc).toMatch(/<OrderProgressTracker\s+currentStep=\{2\}/);
  });

  it('order/payment imports and renders OrderProgressTracker with currentStep=4', () => {
    expect(paymentSrc).toMatch(/from ['"]@\/components\/customer\/OrderProgressTracker['"]/);
    expect(paymentSrc).toMatch(/<OrderProgressTracker\s+currentStep=\{4\}/);
  });

  it('tracker uses #fff (not var(--paper)) for text on var(--brand) background', () => {
    expect(trackerSrc).not.toMatch(/color:\s*['"]var\(--paper\)['"][\s\S]{0,80}background:\s*['"]var\(--brand\)/);
    expect(trackerSrc).toMatch(/background:\s*['"]var\(--brand\)['"][\s\S]{0,120}color:\s*['"]#fff['"]/);
  });

  it('order/payment sticky header uses var(--paper) (not hardcoded rgba)', () => {
    expect(paymentSrc).not.toMatch(/rgba\(255,\s*255,\s*255,\s*0\.85\)/);
  });
});

// -----------------------------------------------------------------------------
// Tier 2 — .sc-required class replaces inline asterisk span
// -----------------------------------------------------------------------------
describe('Required-asterisk consistency — .sc-required class', () => {
  it('globals.css defines .sc-required with var(--warn)', () => {
    const css = read('app/globals.css');
    expect(css).toMatch(/\.sc-required\s*\{[^}]*color:\s*var\(--warn\)/);
  });

  const filesUsingRequired = [
    'app/customer/products/[id]/page.tsx',
    'app/customer/order/photos/page.tsx',
    'app/customer/register/page.tsx',
  ];

  for (const file of filesUsingRequired) {
    it(`${file} uses sc-required class, not inline var(--warn) asterisk`, () => {
      const src = read(file);
      expect(src).toMatch(/className=["']sc-required["']>\*</);
      expect(src).not.toMatch(/style=\{\{\s*color:\s*['"]var\(--warn\)['"]\s*\}\}>\*</);
    });
  }
});

// -----------------------------------------------------------------------------
// Tier 3 — orders/[id] timeline, MapPin, timeLabel, review CTA
// -----------------------------------------------------------------------------
describe('app/customer/orders/[id]/page.tsx — timeline + i18n + icon polish', () => {
  const src = read('app/customer/orders/[id]/page.tsx');

  it('timeline removes the dead ternary (brand : brand) and uses brand-tint ring on latest', () => {
    expect(src).not.toMatch(/['"]var\(--brand\)['"]\s*:\s*['"]var\(--brand\)['"]/);
    expect(src).toMatch(/boxShadow:\s*isLatest \? ['"]0 0 0 4px var\(--brand-tint\)['"]/);
  });

  it('uses t.customer.timeLabel instead of hardcoded "Time:"', () => {
    expect(src).not.toMatch(/>Time:\s*\{order\.timeSlot/);
    expect(src).toMatch(/\{o\.timeLabel\}:\s*\{order\.timeSlot/);
  });

  it('replaces 📍 emoji with MapPin icon', () => {
    expect(src).not.toMatch(/📍/);
    expect(src).toMatch(/<MapPin[^/]*\/>\s*\{order\.installationAddress\.landmark/);
  });

  it('review CTA uses default sc-cta (no warn background override)', () => {
    const reviewCta = src.match(/order\.status === ['"]completed['"] && !order\.rating[\s\S]{0,800}rateExperience/);
    expect(reviewCta).not.toBeNull();
    expect(reviewCta?.[0]).not.toMatch(/background:\s*['"]var\(--warn\)['"]/);
  });

  it('avatar/check icon uses #fff (not var(--paper)) on brand backgrounds', () => {
    expect(src).not.toMatch(/background:\s*['"]var\(--brand\)['"][\s\S]{0,120}color:\s*['"]var\(--paper\)['"]/);
  });
});

// -----------------------------------------------------------------------------
// Tier 3 — order/details still uses MapPin (no remaining 📍)
// -----------------------------------------------------------------------------
describe('app/customer/order/details/page.tsx — MapPin replaces emoji', () => {
  const src = read('app/customer/order/details/page.tsx');

  it('does not contain the 📍 emoji', () => {
    expect(src).not.toMatch(/📍/);
  });

  it('renders MapPin near landmark', () => {
    expect(src).toMatch(/<MapPin[^/]*\/>\s*\{address\.landmark/);
  });
});

// -----------------------------------------------------------------------------
// Tier 3 — review form star hover preview
// -----------------------------------------------------------------------------
describe('app/customer/orders/[id]/review/page.tsx — star hover preview', () => {
  const src = read('app/customer/orders/[id]/review/page.tsx');

  it('declares hoveredStar state', () => {
    expect(src).toMatch(/const \[hoveredStar, setHoveredStar\]\s*=\s*useState<number \| null>/);
  });

  it('uses hoveredStar to override displayed score', () => {
    expect(src).toMatch(/const displayScore = hoveredStar \?\? score/);
    expect(src).toMatch(/const active = n <= displayScore/);
  });

  it('wires onMouseEnter and onMouseLeave on the radiogroup', () => {
    expect(src).toMatch(/onMouseLeave=\{\(\)\s*=>\s*setHoveredStar\(null\)\}/);
    expect(src).toMatch(/onMouseEnter=\{\(\)\s*=>\s*setHoveredStar\(n\)\}/);
  });

  it('also supports keyboard focus hover (onFocus / onBlur)', () => {
    expect(src).toMatch(/onFocus=\{\(\)\s*=>\s*setHoveredStar\(n\)\}/);
    expect(src).toMatch(/onBlur=\{\(\)\s*=>\s*setHoveredStar\(null\)\}/);
  });
});

// -----------------------------------------------------------------------------
// Tier 3 — settings switch a11y
// -----------------------------------------------------------------------------
describe('app/customer/settings/page.tsx — toggle a11y', () => {
  const src = read('app/customer/settings/page.tsx');

  it('renderToggle accepts ariaLabel and applies role="switch" + aria-checked', () => {
    expect(src).toMatch(/renderToggle\s*=\s*\(checked:\s*boolean,\s*onChange:[^,]+,\s*ariaLabel:\s*string\)/);
    expect(src).toMatch(/role="switch"/);
    expect(src).toMatch(/aria-checked=\{checked\}/);
    expect(src).toMatch(/aria-label=\{ariaLabel\}/);
  });

  it('all three callsites pass an ss.* aria-label as the third arg', () => {
    const callLines = src.split('\n').filter((line) => /renderToggle\(settings\./.test(line));
    expect(callLines.length).toBe(3);
    for (const line of callLines) {
      expect(line).toMatch(/,\s*ss\.\w+\)/);
    }
  });
});

// -----------------------------------------------------------------------------
// Translation parity — timeLabel lives at t.orders.timeLabel (consumed via o = t.orders)
// -----------------------------------------------------------------------------
describe('Translation parity for orders.timeLabel', () => {
  it('en/es/pt/ko all define orders.timeLabel as a string', () => {
    for (const [name, dict] of [['en', en], ['es', es], ['pt', pt], ['ko', ko]] as const) {
      const orders = (dict as Record<string, Record<string, unknown>>).orders;
      expect(orders?.timeLabel, `${name}.orders.timeLabel must be a string`).toBeTypeOf('string');
    }
  });

  it('productFallback and device status keys exist in all 4 languages under customer', () => {
    const keys = [
      ['ordersListScreen', 'productFallback'],
      ['devices', 'statusActive'],
      ['devices', 'statusInactive'],
      ['devices', 'statusDecommissioned'],
    ] as const;
    for (const [ns, key] of keys) {
      for (const [name, dict] of [['en', en], ['es', es], ['pt', pt], ['ko', ko]] as const) {
        const cust = (dict as unknown as Record<string, Record<string, Record<string, unknown>>>).customer;
        expect(cust?.[ns]?.[key], `${name}.customer.${ns}.${key} must be a string`).toBeTypeOf('string');
      }
    }
  });
});
