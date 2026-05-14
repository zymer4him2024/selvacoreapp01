/**
 * Multi-language coverage test.
 *
 * Two checks:
 *   1. Symmetry — every leaf key in en.ts must exist (and be non-empty) in pt/es/ko.
 *   2. Hardcoded English — scan every page/component for user-facing strings that
 *      bypass useTranslation. Add `// i18n-ignore` on the offending line to silence
 *      a deliberate exception (brand names, debug strings, etc.).
 *
 * This test is intentionally static (no dev server, no DOM). Run with: npm test.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/lib/translations/en';
import { es } from '@/lib/translations/es';
import { pt } from '@/lib/translations/pt';
import { ko } from '@/lib/translations/ko';

type LocaleObj = Record<string, unknown>;

function collectLeafPaths(obj: LocaleObj, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [pp, vv] of collectLeafPaths(v as LocaleObj, p)) out.set(pp, vv);
    } else {
      out.set(p, String(v ?? ''));
    }
  }
  return out;
}

const LOCALES: ReadonlyArray<readonly [string, LocaleObj]> = [
  ['en', en as LocaleObj],
  ['pt', pt as LocaleObj],
  ['es', es as LocaleObj],
  ['ko', ko as LocaleObj],
];

describe('translation symmetry', () => {
  const enPaths = collectLeafPaths(en as LocaleObj);

  for (const [name, locale] of LOCALES) {
    if (name === 'en') continue;
    const localePaths = collectLeafPaths(locale);

    it(`${name}.ts has every key from en.ts`, () => {
      const missing: string[] = [];
      for (const key of enPaths.keys()) {
        if (!localePaths.has(key)) missing.push(key);
      }
      expect(missing, `Missing keys in ${name}.ts:\n  ${missing.join('\n  ')}`).toEqual([]);
    });

    it(`${name}.ts has no empty values`, () => {
      const empty: string[] = [];
      for (const [key, value] of localePaths) {
        if (!value || !value.trim()) empty.push(key);
      }
      expect(empty, `Empty values in ${name}.ts:\n  ${empty.join('\n  ')}`).toEqual([]);
    });

    it(`${name}.ts has no extra keys not in en.ts`, () => {
      const extras: string[] = [];
      for (const key of localePaths.keys()) {
        if (!enPaths.has(key)) extras.push(key);
      }
      expect(extras, `Extra keys in ${name}.ts not in en.ts:\n  ${extras.join('\n  ')}`).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// Hardcoded-English scanner
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN_ROOTS = ['app', 'components'];
const IGNORE_DIRS = new Set(['node_modules', '.next', 'dist', '__tests__']);

function walk(dir: string, out: string[] = []): string[] {
  const abs = path.resolve(REPO_ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = path.join(abs, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(path.relative(REPO_ROOT, full), out);
    else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

interface Violation {
  file: string;
  line: number;
  text: string;
  kind: 'jsx-text' | 'attribute' | 'toast';
}

// Words that look English but are brand/technical and should not be translated.
const BRAND_ALLOWLIST = new Set<string>([
  'Selvacore', 'Google', 'Amazon Pay', 'Amazon', 'Firebase', 'Apple', 'iOS', 'Android',
  'BRL', 'USD', 'EUR', 'KRW', 'WiFi', 'API', 'URL', 'PDF', 'JPG', 'PNG', 'QR',
  'Ezer', 'Sub-Admin', 'Sub-Contractor', 'No Image',
]);

const ATTRS_TO_SCAN = ['placeholder', 'title', 'alt', 'aria-label', 'aria-describedby'];

function looksLikeEnglish(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 3) return false;
  if (BRAND_ALLOWLIST.has(trimmed)) return false;
  // Reject if it starts with an operator/punctuation (likely a JS expression
  // captured between two `>` `<` chars that aren't actually JSX delimiters).
  if (!/^[A-Za-z'"]/.test(trimmed)) return false;
  // Reject if it contains JS comparison/logical operators (means it's code).
  if (/(\&\&|\|\||===|!==|<=|>=)/.test(trimmed)) return false;
  // Must contain at least one lowercase letter (filters out pure code identifiers
  // and acronyms) AND at least one alphabetic run of length 3+.
  if (!/[a-z]/.test(trimmed)) return false;
  if (!/[A-Za-z]{3,}/.test(trimmed)) return false;
  // Skip pure URLs / data URIs / paths.
  if (/^https?:\/\//.test(trimmed)) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) return false;
  if (trimmed.startsWith('data:')) return false;
  // Skip kebab-case / snake_case identifiers (likely CSS class or constant).
  if (/^[a-z][a-z0-9_-]+$/.test(trimmed)) return false;
  // Skip camelCase / PascalCase single-token identifiers.
  if (/^[A-Za-z][A-Za-z0-9]+$/.test(trimmed) && !/\s/.test(trimmed)) return false;
  return true;
}

function lineHasIgnore(line: string, prevLine: string | undefined): boolean {
  return /\/\/\s*i18n-ignore/.test(line) || (prevLine ? /\/\/\s*i18n-ignore/.test(prevLine) : false);
}

function scanFile(file: string): Violation[] {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const violations: Violation[] = [];

  // Skip pure type / config files.
  const rel = path.relative(REPO_ROOT, file);
  if (/\.test\.tsx?$/.test(file)) return violations;
  if (rel.startsWith('app/sw.ts')) return violations;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (lineHasIgnore(line, lines[i - 1])) continue;

    // 1. JSX text: ">Some Text<" between tags on a single line.
    const jsxText = line.match(/>([^<>{}\n]+?)</g);
    if (jsxText) {
      for (const raw of jsxText) {
        const text = raw.slice(1, -1).trim();
        if (looksLikeEnglish(text)) {
          violations.push({ file: rel, line: i + 1, text, kind: 'jsx-text' });
        }
      }
    }

    // 2. JSX attributes with literal English values.
    for (const attr of ATTRS_TO_SCAN) {
      const re = new RegExp(`${attr}\\s*=\\s*["']([^"'{}\\n]+)["']`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        const value = m[1].trim();
        if (looksLikeEnglish(value)) {
          violations.push({ file: rel, line: i + 1, text: `${attr}="${value}"`, kind: 'attribute' });
        }
      }
    }

    // 3. toast.success/error/info/warning('Literal English').
    const toastRe = /toast\.(success|error|info|warning|loading)\(\s*['"]([^'"]+)['"]/g;
    let tm: RegExpExecArray | null;
    while ((tm = toastRe.exec(line)) !== null) {
      const value = tm[2].trim();
      if (looksLikeEnglish(value)) {
        violations.push({ file: rel, line: i + 1, text: `toast.${tm[1]}('${value}')`, kind: 'toast' });
      }
    }
  }

  return violations;
}

describe('hardcoded English scanner', () => {
  const allFiles = SCAN_ROOTS.flatMap((root) => walk(root));

  it('every page.tsx imports useTranslation (or has // i18n-ignore-file)', () => {
    const pages = allFiles.filter((f) => /\/(page|layout)\.tsx$/.test(f));
    const missing: string[] = [];
    for (const file of pages) {
      const src = readFileSync(file, 'utf8');
      if (/\/\/\s*i18n-ignore-file/.test(src)) continue;
      if (!/use(Translation|LanguageContext)/.test(src)) {
        // Layouts that are pure server wrappers without text content are OK.
        // Flag only if the file actually emits English text.
        if (/<[a-zA-Z][^>]*>[A-Z][a-zA-Z\s]/.test(src)) {
          missing.push(path.relative(REPO_ROOT, file));
        }
      }
    }
    expect(missing, `Pages with text but no useTranslation:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  it('no hardcoded English JSX text, attributes, or toasts', () => {
    const violations: Violation[] = [];
    for (const file of allFiles) {
      violations.push(...scanFile(file));
    }
    if (violations.length > 0) {
      const grouped: Record<string, Violation[]> = {};
      for (const v of violations) {
        (grouped[v.file] ??= []).push(v);
      }
      const report = Object.entries(grouped)
        .map(
          ([file, vs]) =>
            `\n  ${file}:\n${vs.map((v) => `    L${v.line} [${v.kind}] ${v.text}`).join('\n')}`,
        )
        .join('');
      expect.fail(`Found ${violations.length} hardcoded English string(s):${report}`);
    }
  });
});
