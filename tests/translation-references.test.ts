/**
 * Translation reference integrity test.
 *
 * Walks every .tsx/.ts file under app/ and components/ and finds every
 * `t.foo.bar.baz` reference (and aliased equivalents like `u.foo.bar` where
 * `const u = t.admin.users`), then verifies the path resolves to a leaf
 * string in en/pt/es/ko.
 *
 * Catches the runtime-crash class of bug where a component reads
 * `t.components.notifications.title` but the key is missing in (e.g.) pt.ts.
 *
 * Run with: npm test -- tests/translation-references.test.ts
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/lib/translations/en';
import { es } from '@/lib/translations/es';
import { pt } from '@/lib/translations/pt';
import { ko } from '@/lib/translations/ko';

type LocaleObj = Record<string, unknown>;

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

/**
 * Resolve a dotted path against a locale tree.
 *
 *   - 'ok'           → path resolves to a string leaf or to an object (namespace
 *                      alias like `const u = t.admin.users`). Both are valid.
 *   - 'leaf-prefix'  → path walks through a string leaf, then continues (e.g.
 *                      `foo.bar.replace` where `foo.bar` is a string and
 *                      `.replace` is a JS String method). Treated as ok.
 *   - 'missing'      → path doesn't resolve
 */
function pathStatus(obj: LocaleObj, dotted: string): 'ok' | 'leaf-prefix' | 'missing' {
  const parts = dotted.split('.');
  let cur: unknown = obj;
  for (let i = 0; i < parts.length; i++) {
    if (typeof cur === 'string') return 'leaf-prefix';
    if (cur && typeof cur === 'object' && parts[i] in (cur as LocaleObj)) {
      cur = (cur as LocaleObj)[parts[i]];
    } else {
      return 'missing';
    }
  }
  return 'ok';
}

/** Strip block & line comments so commented-out refs don't register. */
function stripComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  return out;
}

interface Reference {
  file: string;
  line: number;
  path: string;
  rootVar: string;
}

/**
 * Collect aliases pointing into the translation root `t`.
 *
 * Supports:
 *   const { t } = useTranslation();           → 't' (always)
 *   const { t: tr } = useTranslation();       → 'tr'
 *   const u = t.admin.users;                  → 'u' → 'admin.users'
 *   const sc = t.admin.subContractors;        → 'sc' → 'admin.subContractors'
 */
function collectAliases(src: string): Map<string, string> {
  const aliases = new Map<string, string>();
  aliases.set('t', '');

  const aliasRe = /\bconst\s+(\w+)\s*=\s*t\??\.([\w.?]+?)\s*[;,)\n]/g;
  for (const m of src.matchAll(aliasRe)) {
    const name = m[1];
    if (name === 't') continue;
    const cleanedPath = m[2].replace(/\?\./g, '.').replace(/\.+$/, '');
    aliases.set(name, cleanedPath);
  }

  const renameRe = /\{\s*t\s*:\s*(\w+)\s*\}\s*=\s*useTranslation\(\)/g;
  for (const m of src.matchAll(renameRe)) {
    aliases.set(m[1], '');
  }

  return aliases;
}

/**
 * Heuristic shadow detection: a reference like `n.read` inside
 * `array.filter((n) => !n.read)` should be skipped because `n` here is the
 * iteration variable, not our alias.
 *
 * Rule: if the alias appears as a function parameter — patterns
 *   `(alias)` `(alias,` `(alias:` — anywhere earlier on the same line as
 * the reference, treat the reference as shadowed.
 *
 * This is cheap and handles the common single-line callback case. Multi-line
 * callbacks are uncommon enough that we accept the false-positive risk.
 */
function isShadowed(line: string, alias: string, refStart: number): boolean {
  const before = line.slice(0, refStart);
  const re = new RegExp(String.raw`\(\s*${alias}\b\s*[,):]`);
  return re.test(before);
}

function findReferences(file: string, src: string): Reference[] {
  const aliases = collectAliases(src);
  const cleaned = stripComments(src);
  const lines = cleaned.split('\n');
  const refs: Reference[] = [];

  const aliasNames = Array.from(aliases.keys()).map((a) =>
    a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(
    String.raw`(^|[^A-Za-z0-9_$.])(${aliasNames.join('|')})\??\.([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)`,
    'g'
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const m of line.matchAll(pattern)) {
      const aliasName = m[2];
      const refStart = (m.index ?? 0) + m[1].length;
      if (isShadowed(line, aliasName, refStart)) continue;

      const tail = m[3].replace(/\?\./g, '.');
      const aliasBase = aliases.get(aliasName)!;
      const fullPath = aliasBase ? `${aliasBase}.${tail}` : tail;

      // Top-level translation keys are all namespaces (objects). A bare `t.foo`
      // (depth 1) cannot resolve to a string, so anything that short is almost
      // always a different `t` (a callback param, a row variable, etc.) — skip.
      const depth = fullPath.split('.').length;
      if (depth < 2) continue;

      refs.push({ file, line: i + 1, path: fullPath, rootVar: aliasName });
    }
  }
  return refs;
}

const LOCALES: ReadonlyArray<readonly [string, LocaleObj]> = [
  ['en', en as LocaleObj],
  ['pt', pt as LocaleObj],
  ['es', es as LocaleObj],
  ['ko', ko as LocaleObj],
];

describe('translation reference integrity', () => {
  const files = SCAN_ROOTS.flatMap((root) => walk(root));
  const allRefs: Reference[] = [];
  for (const f of files) {
    if (/\.test\.tsx?$/.test(f)) continue;
    const src = readFileSync(f, 'utf8');
    allRefs.push(...findReferences(f, src));
  }

  // Dedup by file+path so a single missing key isn't reported per call site.
  const seen = new Set<string>();
  const dedup: Reference[] = [];
  for (const r of allRefs) {
    const key = `${r.file}::${r.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(r);
  }

  for (const [name, locale] of LOCALES) {
    it(`every t.* reference resolves in ${name}.ts`, () => {
      const missing: string[] = [];
      for (const r of dedup) {
        const status = pathStatus(locale, r.path);
        if (status === 'missing') {
          const rel = path.relative(REPO_ROOT, r.file);
          missing.push(`${rel}:${r.line}  →  t.${r.path}  (alias: ${r.rootVar})`);
        }
      }
      expect(
        missing,
        `Found ${missing.length} broken translation references in ${name}.ts:\n  ${missing.join('\n  ')}`
      ).toEqual([]);
    });
  }

  it('reports stats', () => {
    expect(dedup.length).toBeGreaterThan(0);
  });
});
