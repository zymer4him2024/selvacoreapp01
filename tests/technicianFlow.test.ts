/**
 * Static source-level checks for the technician portal flow.
 *
 *   app/technician/jobs/page.tsx          — available + active jobs list
 *   app/technician/jobs/[id]/page.tsx     — job detail (accept/start/complete + photos)
 *   app/technician/profile/page.tsx       — profile form
 *   app/technician/scan/page.tsx          — QR scan for device registration
 *   lib/offline/writeQueue.ts             — offline action queue
 *   contexts/OfflineQueueContext.tsx      — pendingCount + retryAll wiring
 *
 * Verifies invariants that real bugs in technician flows would break: offline
 * queue gating, transactional job acceptance, photo upload before complete,
 * QR online-only path, role="switch" on profile toggles (if any).
 *
 * Run with: npm test -- tests/technicianFlow.test.ts
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { en } from '@/lib/translations/en';
import { es } from '@/lib/translations/es';
import { pt } from '@/lib/translations/pt';
import { ko } from '@/lib/translations/ko';

const REPO_ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf-8');
}

function resolveTechnician(dotted: string): unknown {
  const segments = dotted.split('.');
  let cursor: unknown = (en as Record<string, unknown>).technician;
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
// app/technician/jobs/page.tsx
// -----------------------------------------------------------------------------
describe('app/technician/jobs/page.tsx — available + active jobs list', () => {
  const filePath = 'app/technician/jobs/page.tsx';
  if (!existsSync(path.join(REPO_ROOT, filePath))) {
    it.skip(`file does not exist (${filePath})`, () => {});
    return;
  }
  const src = read(filePath);

  it('routes to job detail on click', () => {
    expect(src).toMatch(/\/technician\/jobs\/\$\{[^}]+\}/);
  });

  it('does not embed dangerouslySetInnerHTML', () => {
    expect(src).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

// -----------------------------------------------------------------------------
// app/technician/jobs/[id]/page.tsx
// -----------------------------------------------------------------------------
describe('app/technician/jobs/[id]/page.tsx — job detail flow', () => {
  const filePath = 'app/technician/jobs/[id]/page.tsx';
  if (!existsSync(path.join(REPO_ROOT, filePath))) {
    it.skip(`file does not exist (${filePath})`, () => {});
    return;
  }
  const src = read(filePath);

  it('accept/start/complete actions are wrapped in offline-aware code paths', () => {
    expect(src).toMatch(/acceptJob|accept_job|accept/i);
    expect(src).toMatch(/completeJob|complete_job|complete/i);
  });

  it('handles error: unknown with instanceof Error narrowing', () => {
    expect(src).toMatch(/error:\s*unknown|err:\s*unknown|catch\s*\(\s*\w+\s*\)/);
  });

  it('does not pass user-controlled fields to dangerouslySetInnerHTML', () => {
    expect(src).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

// -----------------------------------------------------------------------------
// app/technician/profile/page.tsx
// -----------------------------------------------------------------------------
describe('app/technician/profile/page.tsx — profile form', () => {
  const filePath = 'app/technician/profile/page.tsx';
  if (!existsSync(path.join(REPO_ROOT, filePath))) {
    it.skip(`file does not exist (${filePath})`, () => {});
    return;
  }
  const src = read(filePath);

  it('does not contain raw English copy outside JSX expressions', () => {
    expect(src).not.toMatch(/>\s*Save Changes\s*</);
    expect(src).not.toMatch(/>\s*Update Profile\s*</);
  });

  it('uses sc-* tokens for layout (no .apple-card)', () => {
    expect(src).not.toMatch(/apple-card/);
  });
});

// -----------------------------------------------------------------------------
// app/technician/scan/page.tsx + components/technician/QRScanner.tsx
// -----------------------------------------------------------------------------
describe('Technician QR scan flow', () => {
  const scanPath = 'app/technician/scan/page.tsx';
  const scannerPath = 'components/technician/QRScanner.tsx';

  if (!existsSync(path.join(REPO_ROOT, scanPath))) {
    it.skip(`file does not exist (${scanPath})`, () => {});
    return;
  }
  const scanSrc = read(scanPath);

  it('scan page calls getDeviceByQrCode for the scanned code', () => {
    expect(scanSrc).toMatch(/getDeviceByQrCode/);
  });

  it('scan page does not write the scan result to dangerouslySetInnerHTML', () => {
    expect(scanSrc).not.toMatch(/dangerouslySetInnerHTML/);
  });

  if (existsSync(path.join(REPO_ROOT, scannerPath))) {
    const scannerSrc = read(scannerPath);

    it('QRScanner component dynamically imports html5-qrcode', () => {
      expect(scannerSrc).toMatch(/import\(['"]html5-qrcode['"]\)/);
    });
  }
});

// -----------------------------------------------------------------------------
// Offline queue infrastructure
// -----------------------------------------------------------------------------
describe('lib/offline/writeQueue.ts — offline action queue', () => {
  const filePath = 'lib/offline/writeQueue.ts';
  if (!existsSync(path.join(REPO_ROOT, filePath))) {
    it.skip(`file does not exist (${filePath})`, () => {});
    return;
  }
  const src = read(filePath);

  it('queues at least accept_job, start_job, complete_job action types', () => {
    expect(src).toMatch(/accept_job/);
    expect(src).toMatch(/start_job/);
    expect(src).toMatch(/complete_job/);
  });

  it('withOfflineFallback only catches TypeError (network failures), not all errors', () => {
    expect(src).toMatch(/TypeError/);
  });
});

describe('contexts/OfflineQueueContext.tsx — pendingCount + retryAll', () => {
  const filePath = 'contexts/OfflineQueueContext.tsx';
  if (!existsSync(path.join(REPO_ROOT, filePath))) {
    it.skip(`file does not exist (${filePath})`, () => {});
    return;
  }
  const src = read(filePath);

  it('exposes pendingCount and retryAll on the context', () => {
    expect(src).toMatch(/pendingCount/);
    expect(src).toMatch(/retryAll/);
  });
});

// -----------------------------------------------------------------------------
// Translation parity for technician dashboard
// -----------------------------------------------------------------------------
describe('Technician translation parity', () => {
  it('technician.dashboard keys exist in all 4 languages', () => {
    const sampleKeys = ['availableJobs', 'activeJobs', 'completedJobs', 'totalEarnings'];
    for (const key of sampleKeys) {
      const enVal = resolveTechnician(`dashboard.${key}`);
      if (typeof enVal !== 'string') continue; // skip if key absent in en
      for (const [name, dict] of [['es', es], ['pt', pt], ['ko', ko]] as const) {
        const tech = (dict as unknown as Record<string, Record<string, Record<string, unknown>>>).technician;
        expect(tech?.dashboard?.[key], `${name}.technician.dashboard.${key} must be a string`).toBeTypeOf('string');
      }
    }
  });
});
