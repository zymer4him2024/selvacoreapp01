/**
 * Smoke test: hits every route in the app and reports status + latency.
 *
 * Usage:
 *   npx tsx scripts/smoke-test.ts                       # default: prod
 *   npx tsx scripts/smoke-test.ts --base http://localhost:3000
 *   npx tsx scripts/smoke-test.ts --concurrency 5
 *
 * Exit codes:
 *   0 = all routes pass (200 or 307 redirect-to-login)
 *   1 = one or more routes returned a bad status (404, 5xx, timeout)
 */

const DEFAULT_BASE = 'https://selvacoreapp01.web.app';
const TIMEOUT_MS = 15000;

type Role = 'public' | 'customer' | 'technician' | 'admin' | 'static';

type Route = {
  path: string;
  role: Role;
  note?: string;
};

const ROUTES: Route[] = [
  { path: '/', role: 'public', note: 'homepage' },
  { path: '/login', role: 'public' },
  { path: '/select-role', role: 'public' },

  { path: '/customer', role: 'customer' },
  { path: '/customer/register', role: 'customer' },
  { path: '/customer/profile', role: 'customer' },
  { path: '/customer/settings', role: 'customer' },
  { path: '/customer/orders', role: 'customer' },
  { path: '/customer/devices', role: 'customer' },
  { path: '/customer/order/details', role: 'customer' },
  { path: '/customer/order/photos', role: 'customer' },
  { path: '/customer/order/payment', role: 'customer' },
  { path: '/customer/order/payment/confirmation', role: 'customer' },

  { path: '/technician', role: 'technician' },
  { path: '/technician/apply', role: 'technician', note: 'apply form (requires Google sign-in first)' },
  { path: '/technician/jobs', role: 'technician' },
  { path: '/technician/profile', role: 'technician' },
  { path: '/technician/scan', role: 'technician' },
  { path: '/technician/settings', role: 'technician' },

  { path: '/admin', role: 'admin' },
  { path: '/admin/analytics', role: 'admin' },
  { path: '/admin/inventory', role: 'admin' },
  { path: '/admin/maintenance', role: 'admin' },
  { path: '/admin/orders', role: 'admin' },
  { path: '/admin/products', role: 'admin' },
  { path: '/admin/products/new', role: 'admin' },
  { path: '/admin/qr-codes', role: 'admin' },
  { path: '/admin/reviews', role: 'admin' },
  { path: '/admin/schedule', role: 'admin' },
  { path: '/admin/services', role: 'admin' },
  { path: '/admin/services/new', role: 'admin' },
  { path: '/admin/settings', role: 'admin' },
  { path: '/admin/sub-admins', role: 'admin' },
  { path: '/admin/sub-admins/new', role: 'admin' },
  { path: '/admin/sub-contractors', role: 'admin' },
  { path: '/admin/sub-contractors/new', role: 'admin' },
  { path: '/admin/technicians', role: 'admin' },
  { path: '/admin/transactions', role: 'admin' },
  { path: '/admin/users', role: 'admin' },
  { path: '/admin/users/new', role: 'admin' },

  { path: '/manifest.json', role: 'static' },
  { path: '/sw.js', role: 'static' },
  { path: '/favicon.ico', role: 'static' },
];

type Result = {
  path: string;
  role: Role;
  status: number | 'TIMEOUT' | 'ERROR';
  ms: number;
  ok: boolean;
  detail: string;
};

function parseArgs(): { base: string; concurrency: number } {
  const args = process.argv.slice(2);
  let base = DEFAULT_BASE;
  let concurrency = 8;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base' && args[i + 1]) {
      base = args[i + 1].replace(/\/$/, '');
      i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10) || 8;
      i++;
    }
  }
  return { base, concurrency };
}

async function hit(base: string, route: Route): Promise<Result> {
  const url = `${base}${route.path}`;
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'User-Agent': 'selvacore-smoke-test/1.0' },
    });
    clearTimeout(timer);
    const ms = Date.now() - start;
    const status = res.status;
    let ok = false;
    let detail = '';

    if (route.role === 'public' || route.role === 'static') {
      ok = status === 200;
      detail = ok ? 'OK' : `expected 200, got ${status}`;
    } else {
      ok = status === 200 || status === 307 || status === 308;
      detail = status === 200
        ? 'OK (public access)'
        : status === 307 || status === 308
          ? `OK (auth redirect -> ${res.headers.get('location') || '?'})`
          : `expected 200/307, got ${status}`;
    }
    return { path: route.path, role: route.role, status, ms, ok, detail };
  } catch (err: unknown) {
    clearTimeout(timer);
    const ms = Date.now() - start;
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    return {
      path: route.path,
      role: route.role,
      status: isAbort ? 'TIMEOUT' : 'ERROR',
      ms,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runPool<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function loop() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, loop));
  return results;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function main() {
  const { base, concurrency } = parseArgs();
  console.log(`\nSmoke test: ${base}`);
  console.log(`Routes: ${ROUTES.length} | concurrency: ${concurrency} | timeout: ${TIMEOUT_MS}ms\n`);

  const t0 = Date.now();
  runPool(ROUTES, (r) => hit(base, r), concurrency).then((results) => {
    const totalMs = Date.now() - t0;

    console.log(pad('STATUS', 8) + pad('TIME', 8) + pad('ROLE', 12) + pad('PATH', 50) + 'DETAIL');
    console.log('-'.repeat(120));
    for (const r of results) {
      const marker = r.ok ? 'PASS' : 'FAIL';
      const statusStr = String(r.status);
      console.log(
        pad(marker, 8) +
        pad(`${r.ms}ms`, 8) +
        pad(r.role, 12) +
        pad(r.path, 50) +
        `${statusStr.padEnd(5)} ${r.detail}`
      );
    }

    const passed = results.filter((r) => r.ok).length;
    const failed = results.length - passed;
    const slow = results.filter((r) => typeof r.status === 'number' && r.ms > 2000);
    const avg = Math.round(results.reduce((acc, r) => acc + r.ms, 0) / results.length);
    const p95 = [...results].map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

    console.log('-'.repeat(120));
    console.log(`\nSummary:`);
    console.log(`  passed: ${passed} / ${results.length}`);
    console.log(`  failed: ${failed}`);
    console.log(`  avg latency: ${avg}ms | p95: ${p95}ms`);
    console.log(`  slow (>2s): ${slow.length}`);
    console.log(`  total wall time: ${totalMs}ms\n`);

    if (failed > 0) {
      console.log('Failures:');
      for (const r of results.filter((x) => !x.ok)) {
        console.log(`  ${r.path} -> ${r.status} (${r.detail})`);
      }
      process.exit(1);
    }
    process.exit(0);
  });
}

main();
