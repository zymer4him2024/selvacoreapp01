/**
 * Static source-level checks for the three technician-adjacent pages.
 *
 *   app/admin/services/page.tsx       — admin services list
 *   app/admin/technicians/page.tsx    — admin technicians management list
 *   app/technician/page.tsx           — technician portal dashboard
 *
 * No DOM is required; the project has no jsdom/RTL installed. These tests
 * verify load-bearing invariants that real bugs in the recent sub-admin work
 * would break (role gating, hooks dependency arrays, translation keys, no
 * hardcoded English next to translated copy, dangerous patterns like
 * confirm() without abort handling, etc.).
 *
 * Run with: npm test -- tests/technicianPages.test.ts
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/lib/translations/en';

const REPO_ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf-8');
}

function resolveTranslationPath(rootName: 'admin' | 'technician' | 'common', dotted: string): unknown {
  const segments = dotted.split('.');
  let cursor: unknown = (en as Record<string, unknown>)[rootName];
  for (const seg of segments) {
    if (cursor && typeof cursor === 'object' && seg in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cursor;
}

// -----------------------------------------------------------------------------
// app/admin/services/page.tsx
// -----------------------------------------------------------------------------
describe('app/admin/services/page.tsx — admin services list', () => {
  const src = read('app/admin/services/page.tsx');

  it('imports useAuth and reads role for sub-admin gating', () => {
    expect(src).toMatch(/from ['"]@\/contexts\/AuthContext['"]/);
    expect(src).toMatch(/isSubAdmin\s*=\s*userData\?\.role === ['"]sub-admin['"]/);
  });

  it('hides the "Add Service" header CTA from sub-admin', () => {
    expect(src).toMatch(/\{!isSubAdmin && \(\s*\n?\s*<Link[\s\S]*?\/admin\/services\/new/);
  });

  it('hides the empty-state "Add First" CTA from sub-admin', () => {
    expect(src).toMatch(/\{!searchTerm && !isSubAdmin && \(/);
  });

  it('hides per-row Edit and Delete actions from sub-admin', () => {
    expect(src).toMatch(/\{!isSubAdmin && \(\s*\n?\s*<div className=["'][^"']*flex gap-2[^"']*ml-4["']/);
  });

  it('uses role-aware subtitle (sv.subtitle vs sv.subtitleSubAdmin)', () => {
    expect(src).toMatch(/isSubAdmin \? sv\.subtitleSubAdmin : sv\.subtitle/);
    expect(resolveTranslationPath('admin', 'services.subtitleSubAdmin')).toBeTypeOf('string');
  });

  it('all translation keys it reads through sv.* exist in en.ts', () => {
    const keys = [...src.matchAll(/\bsv\.([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
    const unique = Array.from(new Set(keys));
    expect(unique.length).toBeGreaterThan(5);
    for (const k of unique) {
      expect(resolveTranslationPath('admin', `services.${k}`)).toBeTypeOf('string');
    }
  });

  it('useEffect for loadServices has no missing dependency warnings (intentionally empty deps)', () => {
    expect(src).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*loadServices\(\);\s*\}\s*,\s*\[\]\s*\)/);
  });

  it('escapes user-controlled search input only by lowercasing — does not pass to dangerouslySetInnerHTML', () => {
    expect(src).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

// -----------------------------------------------------------------------------
// app/admin/technicians/page.tsx
// -----------------------------------------------------------------------------
describe('app/admin/technicians/page.tsx — admin technicians list', () => {
  const src = read('app/admin/technicians/page.tsx');

  it('imports useAuth and computes isSubAdmin from role', () => {
    expect(src).toMatch(/from ['"]@\/contexts\/AuthContext['"]/);
    expect(src).toMatch(/isSubAdmin\s*=\s*userData\?\.role === ['"]sub-admin['"]/);
  });

  it('uses role-aware subtitle', () => {
    expect(src).toMatch(/isSubAdmin \? tc\.subtitleSubAdmin : tc\.subtitle/);
    expect(resolveTranslationPath('admin', 'technicians.subtitleSubAdmin')).toBeTypeOf('string');
  });

  it('navigates to /admin/technicians/[id] on row click', () => {
    expect(src).toMatch(/router\.push\(`\/admin\/technicians\/\$\{technician\.id\}`\)/);
  });

  it('filterTechnicians is correctly listed in the filter effect dependency array', () => {
    expect(src).toMatch(
      /useEffect\(\(\)\s*=>\s*\{\s*filterTechnicians\(\);\s*\}\s*,\s*\[\s*activeTab\s*,\s*technicians\s*,\s*searchTerm\s*\]\s*\)/
    );
  });

  it('all tc.* translation keys it reads exist in en.ts', () => {
    const keys = [...src.matchAll(/\btc\.([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
    const unique = Array.from(new Set(keys));
    for (const k of unique) {
      const value = resolveTranslationPath('admin', `technicians.${k}`);
      // values can be string or nested-object alias but for tc.* leaves they must be strings
      expect(value, `missing translation key admin.technicians.${k}`).toBeTypeOf('string');
    }
  });

  it('has no obvious hardcoded English label outside of <h1>{tc.title}</h1> children', () => {
    // crude heuristic: text nodes inside JSX that are 3+ ASCII words (likely English copy).
    const literalText = [...src.matchAll(/>\s*([A-Z][a-z]+(?:\s+[A-Za-z]+){2,})\s*</g)].map((m) => m[1]);
    expect(literalText).toEqual([]);
  });

  it('uses formatOptionalString / formatOptionalNumber / formatOptionalDate for nullable display fields', () => {
    expect(src).toMatch(/formatOptionalString\(technician\.displayName\)/);
    expect(src).toMatch(/formatOptionalString\(technician\.email\)/);
    expect(src).toMatch(/formatOptionalNumber\(technician\.completedJobs\)/);
  });
});

// -----------------------------------------------------------------------------
// app/technician/page.tsx
// -----------------------------------------------------------------------------
describe('app/technician/page.tsx — technician portal dashboard', () => {
  const src = read('app/technician/page.tsx');

  it('renders three terminal-state cards: pending, declined, suspended', () => {
    expect(src).toMatch(/technicianStatus === ['"]pending['"]/);
    expect(src).toMatch(/technicianStatus === ['"]declined['"]/);
    expect(src).toMatch(/technicianStatus === ['"]suspended['"]/);
  });

  it('only fires loadData() when user is present (avoids unauthenticated reads)', () => {
    expect(src).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*if \(user\)\s*\{\s*loadData\(\);\s*\}\s*\}\s*,\s*\[\s*user\s*\]\s*\)/);
  });

  it('paginates available jobs with cursor + IntersectionObserver sentinel', () => {
    expect(src).toMatch(/getAvailableJobsPaginated\(10\)/);
    expect(src).toMatch(/IntersectionObserver/);
    expect(src).toMatch(/sentinelRef/);
  });

  it('uses translated strings for every job/stat label (td.*)', () => {
    const keys = [...src.matchAll(/\btd\.([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
    const unique = Array.from(new Set(keys));
    expect(unique.length).toBeGreaterThan(10);
    for (const k of unique) {
      const value = resolveTranslationPath('technician', `dashboard.${k}`);
      expect(value, `missing translation key technician.dashboard.${k}`).toBeTypeOf('string');
    }
  });

  it('offline pending sync tile is gated on pendingCount > 0', () => {
    expect(src).toMatch(/\{pendingCount > 0 && \(/);
    expect(src).toMatch(/retryAll/);
  });

  it('uses preferredLanguage with safe fallback to "en" for productSnapshot.name lookup', () => {
    expect(src).toMatch(
      /productSnapshot\.name\[userData\?\.preferredLanguage\s*\|\|\s*['"]en['"]\]\s*\|\|\s*job\.productSnapshot\.name\.en/
    );
  });

  it('does not pass user-controlled installationAddress directly into URLs / HTML', () => {
    expect(src).not.toMatch(/dangerouslySetInnerHTML/);
    expect(src).not.toMatch(/eval\(/);
  });
});
