import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDocSnapshot, createMockTimestamp } from './firestore-mocks';

vi.mock('@/lib/firebase/config', () => ({ db: {} }));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockWhere = vi.fn((field: string, op: string, value: unknown) => ({ __where: [field, op, value] }));
const mockOrderBy = vi.fn((field: string, dir: string) => ({ __orderBy: [field, dir] }));
const mockLimit = vi.fn((n: number) => ({ __limit: n }));
const mockStartAfter = vi.fn((cursor: unknown) => ({ __startAfter: cursor }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => ({ __col: path })),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({
    id: id || 'mock-id',
    path: `${col}/${id}`,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: (...args: unknown[]) => mockWhere(args[0] as string, args[1] as string, args[2]),
  orderBy: (...args: unknown[]) => mockOrderBy(args[0] as string, args[1] as string),
  limit: (n: number) => mockLimit(n),
  startAfter: (cursor: unknown) => mockStartAfter(cursor),
  Timestamp: {
    fromDate: vi.fn((d: Date) => createMockTimestamp(d)),
  },
}));

import {
  getReviewsPaginated,
  getReviewStats,
  getTechniciansBelowRating,
} from '../reviewAdminService';

beforeEach(() => {
  vi.clearAllMocks();
});

// Helpers to build mock query result snapshots.
function makeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}
function makeQuerySnap(docs: Array<{ id: string; data: () => Record<string, unknown> }>) {
  return { docs, size: docs.length, empty: docs.length === 0 };
}

// -------------------------------------------------------------------
// buildConstraints (via getReviewsPaginated) — filter policy lives here
// -------------------------------------------------------------------

describe('getReviewsPaginated — filter policy', () => {
  it('Active tab: applies hidden==false and orders by createdAt desc', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getReviewsPaginated({ tab: 'active' });

    const whereCalls = mockWhere.mock.calls.map((c) => c.slice(0, 3));
    expect(whereCalls).toEqual([['hidden', '==', false]]);
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
  });

  it('Active tab + rating: adds rating==N clause', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getReviewsPaginated({ tab: 'active', rating: 4 });

    const whereCalls = mockWhere.mock.calls.map((c) => c.slice(0, 3));
    expect(whereCalls).toContainEqual(['hidden', '==', false]);
    expect(whereCalls).toContainEqual(['rating', '==', 4]);
  });

  it('Active tab + technicianId: adds technicianId==X clause first', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getReviewsPaginated({ tab: 'active', technicianId: 'tech-42' });

    const whereCalls = mockWhere.mock.calls.map((c) => c.slice(0, 3));
    expect(whereCalls[0]).toEqual(['technicianId', '==', 'tech-42']);
    expect(whereCalls).toContainEqual(['hidden', '==', false]);
  });

  it('Flagged tab: applies flagged==true AND hidden==false', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getReviewsPaginated({ tab: 'flagged' });

    const whereCalls = mockWhere.mock.calls.map((c) => c.slice(0, 3));
    expect(whereCalls).toContainEqual(['flagged', '==', true]);
    expect(whereCalls).toContainEqual(['hidden', '==', false]);
    // Rating is intentionally NOT applied on flagged tab even if passed.
  });

  it('Flagged tab: rating filter is ignored (policy: active-only)', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    // Caller should never pass rating here, but verify the service is defensive anyway.
    await getReviewsPaginated({ tab: 'flagged', rating: 3 });

    const whereCalls = mockWhere.mock.calls.map((c) => c.slice(0, 3));
    expect(whereCalls.some((w) => w[0] === 'rating')).toBe(false);
  });

  it('Hidden tab: applies hidden==true', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getReviewsPaginated({ tab: 'hidden' });

    const whereCalls = mockWhere.mock.calls.map((c) => c.slice(0, 3));
    expect(whereCalls).toContainEqual(['hidden', '==', true]);
    expect(whereCalls.some((w) => w[0] === 'rating')).toBe(false);
  });
});

// -------------------------------------------------------------------
// Pagination shape
// -------------------------------------------------------------------

describe('getReviewsPaginated — pagination', () => {
  it('returns hasMore=false when fewer than PAGE_SIZE+1 docs', async () => {
    const docs = Array.from({ length: 5 }, (_, i) =>
      makeDoc(`r-${i}`, {
        customerId: `c-${i}`,
        customerName: 'X',
        technicianId: `t-${i}`,
        technicianName: 'Y',
        rating: 5,
        hidden: false,
      })
    );
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(docs));

    const result = await getReviewsPaginated({ tab: 'active' });

    expect(result.items).toHaveLength(5);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc?.id).toBe('r-4');
  });

  it('returns hasMore=true and trims to PAGE_SIZE when more exist', async () => {
    // PAGE_SIZE = 20; feed 21 to trigger hasMore
    const docs = Array.from({ length: 21 }, (_, i) =>
      makeDoc(`r-${i}`, {
        customerId: `c-${i}`,
        customerName: 'X',
        technicianId: `t-${i}`,
        technicianName: 'Y',
        rating: 5,
        hidden: false,
      })
    );
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(docs));

    const result = await getReviewsPaginated({ tab: 'active' });

    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(true);
    expect(result.lastDoc?.id).toBe('r-19');
  });

  it('applies startAfter when cursor is provided', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const cursor = { id: 'cursor-doc' } as never;
    await getReviewsPaginated({ tab: 'active' }, cursor);

    expect(mockStartAfter).toHaveBeenCalledWith(cursor);
  });

  it('returns empty items + null lastDoc on empty snapshot', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    const result = await getReviewsPaginated({ tab: 'hidden' });
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBeNull();
  });
});

// -------------------------------------------------------------------
// hydrateMissingNames fallback (pre-Phase-4.5 reviews)
// -------------------------------------------------------------------

describe('getReviewsPaginated — missing-name fallback', () => {
  it('does NOT fetch user docs when all names are populated', async () => {
    const docs = [
      makeDoc('r-1', {
        customerId: 'c-1',
        customerName: 'Alice',
        technicianId: 't-1',
        technicianName: 'Bob',
        rating: 5,
        hidden: false,
      }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(docs));

    await getReviewsPaginated({ tab: 'active' });

    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('batches user lookups once per unique missing ID and hydrates names', async () => {
    const docs = [
      // Missing customerName + technicianName
      makeDoc('r-1', { customerId: 'c-1', technicianId: 't-1', rating: 5, hidden: false }),
      // Same customer and technician as r-1 — should NOT re-fetch
      makeDoc('r-2', { customerId: 'c-1', technicianId: 't-1', rating: 4, hidden: false }),
      // Different technician, same customer
      makeDoc('r-3', { customerId: 'c-1', technicianId: 't-2', rating: 3, hidden: false }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(docs));
    mockGetDoc.mockImplementation((ref: { path: string }) => {
      const nameByPath: Record<string, string> = {
        'users/c-1': 'Alice',
        'users/t-1': 'Bob',
        'users/t-2': 'Carol',
      };
      return Promise.resolve(createMockDocSnapshot(ref.path, { displayName: nameByPath[ref.path] || '' }));
    });

    const result = await getReviewsPaginated({ tab: 'active' });

    // 3 unique user IDs → exactly 3 getDoc calls
    expect(mockGetDoc).toHaveBeenCalledTimes(3);
    expect(result.items[0].customerName).toBe('Alice');
    expect(result.items[0].technicianName).toBe('Bob');
    expect(result.items[1].customerName).toBe('Alice');
    expect(result.items[1].technicianName).toBe('Bob');
    expect(result.items[2].technicianName).toBe('Carol');
  });

  it('uses empty string when the user doc is missing (graceful)', async () => {
    const docs = [
      makeDoc('r-1', { customerId: 'c-missing', technicianId: 't-missing', rating: 5, hidden: false }),
    ];
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap(docs));
    mockGetDoc.mockResolvedValue(createMockDocSnapshot('missing', {}, false));

    const result = await getReviewsPaginated({ tab: 'active' });

    expect(result.items[0].customerName).toBe('');
    expect(result.items[0].technicianName).toBe('');
  });
});

// -------------------------------------------------------------------
// getReviewStats
// -------------------------------------------------------------------

describe('getReviewStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00Z'));
  });

  it('computes reviewsThisMonth, flaggedPercentThisMonth, platformAvgRating', async () => {
    // 1st getDocs call: this-month reviews — 4 docs, 1 flagged
    mockGetDocs.mockResolvedValueOnce(
      makeQuerySnap([
        makeDoc('r-1', { rating: 5, flagged: false, hidden: false }),
        makeDoc('r-2', { rating: 4, flagged: false, hidden: false }),
        makeDoc('r-3', { rating: 3, flagged: true, hidden: false }),
        makeDoc('r-4', { rating: 2, flagged: false, hidden: false }),
      ])
    );
    // 2nd getDocs: all non-hidden (for platform avg) — 5 docs avg = (5+4+3+2+5)/5 = 3.8
    mockGetDocs.mockResolvedValueOnce(
      makeQuerySnap([
        makeDoc('r-1', { rating: 5, flagged: false, hidden: false }),
        makeDoc('r-2', { rating: 4, flagged: false, hidden: false }),
        makeDoc('r-3', { rating: 3, flagged: true, hidden: false }),
        makeDoc('r-4', { rating: 2, flagged: false, hidden: false }),
        makeDoc('r-5', { rating: 5, flagged: false, hidden: false }),
      ])
    );
    // 3rd getDocs: technicians — one under threshold
    mockGetDocs.mockResolvedValueOnce(
      makeQuerySnap([
        makeDoc('t-low', { totalReviews: 10, averageRating: 3.2 }),
        makeDoc('t-ok', { totalReviews: 5, averageRating: 4.8 }),
      ])
    );

    const stats = await getReviewStats();

    expect(stats.reviewsThisMonth).toBe(4);
    expect(stats.flaggedPercentThisMonth).toBe(25); // 1/4 = 25%
    expect(stats.platformAvgRating).toBe(3.8);
    expect(stats.techniciansBelow3_5).toBe(1);
  });

  it('uses UTC calendar-month bounds in the this-month query', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getReviewStats();

    // First getDocs call's constraints should contain createdAt >= start, createdAt < end
    const whereArgs = mockWhere.mock.calls.map((c) => c.slice(0, 3));
    const createdAtConstraints = whereArgs.filter((w) => w[0] === 'createdAt');
    expect(createdAtConstraints).toHaveLength(2);
    expect(createdAtConstraints[0][1]).toBe('>=');
    expect(createdAtConstraints[1][1]).toBe('<');

    // The start boundary is April 1st 2026 00:00 UTC.
    const start = (createdAtConstraints[0][2] as { toDate: () => Date }).toDate();
    expect(start.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    const end = (createdAtConstraints[1][2] as { toDate: () => Date }).toDate();
    expect(end.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });

  it('returns 0 for flaggedPercent and platformAvg when no reviews exist', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([])); // month
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([])); // active
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([])); // techs

    const stats = await getReviewStats();
    expect(stats.reviewsThisMonth).toBe(0);
    expect(stats.flaggedPercentThisMonth).toBe(0);
    expect(stats.platformAvgRating).toBe(0);
    expect(stats.techniciansBelow3_5).toBe(0);
  });
});

// -------------------------------------------------------------------
// getTechniciansBelowRating
// -------------------------------------------------------------------

describe('getTechniciansBelowRating', () => {
  it('counts only technicians with totalReviews > 0 and averageRating < threshold', async () => {
    mockGetDocs.mockResolvedValueOnce(
      makeQuerySnap([
        makeDoc('t-1', { totalReviews: 10, averageRating: 2.9 }), // count
        makeDoc('t-2', { totalReviews: 5, averageRating: 3.4 }), // count
        makeDoc('t-3', { totalReviews: 3, averageRating: 3.5 }), // NOT count (not < 3.5)
        makeDoc('t-4', { totalReviews: 20, averageRating: 4.7 }), // NOT count
        makeDoc('t-5', { totalReviews: 0, averageRating: 1.0 }), // NOT count (zero reviews)
        makeDoc('t-6', {}), // NOT count (no fields)
        makeDoc('t-7', { totalReviews: 2 }), // NOT count (no averageRating)
      ])
    );

    const count = await getTechniciansBelowRating(3.5);
    expect(count).toBe(2);
  });

  it('returns 0 when no technicians match', async () => {
    mockGetDocs.mockResolvedValueOnce(
      makeQuerySnap([
        makeDoc('t-1', { totalReviews: 10, averageRating: 5 }),
        makeDoc('t-2', { totalReviews: 10, averageRating: 4.5 }),
      ])
    );

    expect(await getTechniciansBelowRating(3.5)).toBe(0);
  });

  it('queries users collection filtered by role==technician', async () => {
    mockGetDocs.mockResolvedValueOnce(makeQuerySnap([]));

    await getTechniciansBelowRating(3.5);

    const whereCalls = mockWhere.mock.calls.map((c) => c.slice(0, 3));
    expect(whereCalls).toContainEqual(['role', '==', 'technician']);
  });
});
