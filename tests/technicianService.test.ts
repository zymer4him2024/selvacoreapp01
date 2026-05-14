/**
 * Unit tests for lib/services/technicianService.ts
 *
 * Strategy: mock firebase/firestore + firebase/storage + lib/firebase/config so the
 * service module can be imported in Node without a real Firebase connection. We then
 * assert on the calls each public function makes (Firestore query builders, doc
 * updates, transactions) and on the values it returns.
 *
 * Run with: npm test -- tests/technicianService.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// -----------------------------------------------------------------------------
// Mocks. These must be defined before the SUT is imported.
// -----------------------------------------------------------------------------
const fakeTimestamp = { seconds: 1_700_000_000, nanoseconds: 0, toMillis: () => 1_700_000_000_000 };

vi.mock('firebase/firestore', () => {
  const collection = vi.fn((_db: unknown, name: string) => ({ __collection: name }));
  const doc = vi.fn((_db: unknown, name: string, id: string) => ({ __doc: `${name}/${id}`, id }));
  const where = vi.fn((field: string, op: string, value: unknown) => ({ __where: { field, op, value } }));
  const orderBy = vi.fn((field: string, dir = 'asc') => ({ __orderBy: { field, dir } }));
  const limit = vi.fn((n: number) => ({ __limit: n }));
  const startAfter = vi.fn((cursor: unknown) => ({ __startAfter: cursor }));
  const query = vi.fn((...parts: unknown[]) => ({ __query: parts }));
  const getDocs = vi.fn();
  const getDoc = vi.fn();
  const getCountFromServer = vi.fn();
  const updateDoc = vi.fn();
  const runTransaction = vi.fn();

  const Timestamp = { now: () => fakeTimestamp };

  return {
    collection, doc, where, orderBy, limit, startAfter, query,
    getDocs, getDoc, getCountFromServer, updateDoc, runTransaction,
    Timestamp,
    QueryDocumentSnapshot: class {},
    DocumentData: class {},
  };
});

vi.mock('firebase/storage', () => ({
  ref: vi.fn((_storage: unknown, path: string) => ({ __ref: path })),
  uploadBytes: vi.fn(async () => ({ ref: {} })),
  getDownloadURL: vi.fn(async () => 'https://fake.example/photo.jpg'),
}));

vi.mock('@/lib/firebase/config', () => ({
  db: { __db: true },
  storage: { __storage: true },
}));

vi.mock('uuid', () => ({ v4: () => 'fixed-uuid-1234' }));

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
import * as firestore from 'firebase/firestore';
import * as svc from '@/lib/services/technicianService';

function makeQueryDocsSnapshot(items: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    docs: items.map((item) => ({
      id: item.id,
      data: () => item.data,
    })),
  };
}

function makeDocSnapshot(exists: boolean, data?: Record<string, unknown>, id = 'doc-1') {
  return {
    id,
    exists: () => exists,
    data: () => data,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------------
// getAvailableJobsPaginated
// -----------------------------------------------------------------------------
describe('getAvailableJobsPaginated', () => {
  it('queries pending orders ordered by createdAt desc and returns hasMore=false when count <= pageSize', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(
      makeQueryDocsSnapshot([
        { id: 'o1', data: { status: 'pending', orderNumber: 'A1' } },
        { id: 'o2', data: { status: 'pending', orderNumber: 'A2' } },
      ]) as never
    );

    const result = await svc.getAvailableJobsPaginated(5);

    expect(firestore.where).toHaveBeenCalledWith('status', '==', 'pending');
    expect(firestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(firestore.limit).toHaveBeenCalledWith(6); // pageSize + 1
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ id: 'o1', orderNumber: 'A1' });
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).not.toBeNull();
  });

  it('returns hasMore=true and trims the last item when fetch returns pageSize + 1', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(
      makeQueryDocsSnapshot([
        { id: 'o1', data: {} }, { id: 'o2', data: {} }, { id: 'o3', data: {} },
      ]) as never
    );

    const result = await svc.getAvailableJobsPaginated(2);

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.lastDoc).not.toBeNull();
  });

  it('uses startAfter when a cursor is provided', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(makeQueryDocsSnapshot([]) as never);
    const cursor = { id: 'cursor-doc' } as never;

    await svc.getAvailableJobsPaginated(10, cursor);

    expect(firestore.startAfter).toHaveBeenCalledWith(cursor);
  });

  it('returns empty items and lastDoc=null when no results', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(makeQueryDocsSnapshot([]) as never);

    const result = await svc.getAvailableJobsPaginated(10);

    expect(result.items).toEqual([]);
    expect(result.lastDoc).toBeNull();
    expect(result.hasMore).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// getTechnicianJobsPaginated
// -----------------------------------------------------------------------------
describe('getTechnicianJobsPaginated', () => {
  it('filters by technicianId, status list, and orders by installationDate asc', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(
      makeQueryDocsSnapshot([{ id: 'o1', data: { status: 'accepted' } }]) as never
    );

    await svc.getTechnicianJobsPaginated('tech-1', ['accepted', 'in_progress'], 10);

    expect(firestore.where).toHaveBeenCalledWith('technicianId', '==', 'tech-1');
    expect(firestore.where).toHaveBeenCalledWith('status', 'in', ['accepted', 'in_progress']);
    expect(firestore.orderBy).toHaveBeenCalledWith('installationDate', 'asc');
  });
});

// -----------------------------------------------------------------------------
// getTechnicianJobCounts
// -----------------------------------------------------------------------------
describe('getTechnicianJobCounts', () => {
  it('returns counts from three parallel aggregate queries', async () => {
    const mockCount = (count: number) =>
      ({ data: () => ({ count }) }) as unknown as Awaited<ReturnType<typeof firestore.getCountFromServer>>;
    vi.mocked(firestore.getCountFromServer)
      .mockResolvedValueOnce(mockCount(3))
      .mockResolvedValueOnce(mockCount(2))
      .mockResolvedValueOnce(mockCount(5));

    const counts = await svc.getTechnicianJobCounts('tech-1');

    expect(counts).toEqual({ upcoming: 3, inProgress: 2, completed: 5 });
    expect(firestore.getCountFromServer).toHaveBeenCalledTimes(3);
  });
});

// -----------------------------------------------------------------------------
// acceptJob
// -----------------------------------------------------------------------------
describe('acceptJob', () => {
  const info = { name: 'Bob', phone: '+1', whatsapp: '+1', photo: 'p.jpg', rating: 4.5 };

  function transactionWith(snapshots: Array<ReturnType<typeof makeDocSnapshot>>, update = vi.fn()) {
    const get = vi.fn();
    snapshots.forEach((s) => get.mockResolvedValueOnce(s));
    vi.mocked(firestore.runTransaction).mockImplementationOnce((async (_db: unknown, fn: (txn: unknown) => Promise<void>) => {
      await fn({ get, update });
    }) as unknown as typeof firestore.runTransaction);
    return { get, update };
  }

  it('writes the canonical technician info read from the users doc, not the client-supplied values', async () => {
    const { update } = transactionWith([
      makeDocSnapshot(true, { status: 'pending', statusHistory: [] }),                       // order
      makeDocSnapshot(true, {                                                                 // user
        displayName: 'Real Name', phone: '+999', whatsapp: '+999',
        photoURL: 'real.jpg', averageRating: 4.9,
        technicianStatus: 'approved', active: true,
      }, 'tech-1'),
    ]);

    await svc.acceptJob('order-1', 'tech-1', info);

    expect(update).toHaveBeenCalledTimes(1);
    const updateArgs = update.mock.calls[0][1];
    expect(updateArgs.status).toBe('accepted');
    expect(updateArgs.technicianId).toBe('tech-1');
    expect(updateArgs.technicianInfo).toMatchObject({
      name: 'Real Name', phone: '+999', whatsapp: '+999',
      photo: 'real.jpg', rating: 4.9,
    });
    expect(updateArgs.statusHistory[0].note).toContain('Real Name');
  });

  it('falls back to client-supplied technicianInfo when the user doc is missing (offline-queue replay)', async () => {
    const { update } = transactionWith([
      makeDocSnapshot(true, { status: 'pending', statusHistory: [] }),
      makeDocSnapshot(false), // user doc missing
    ]);

    await svc.acceptJob('order-1', 'tech-1', info);

    const updateArgs = update.mock.calls[0][1];
    expect(updateArgs.technicianInfo.name).toBe('Bob');
  });

  it('throws when the technician account is not approved', async () => {
    transactionWith([
      makeDocSnapshot(true, { status: 'pending' }),
      makeDocSnapshot(true, { technicianStatus: 'pending', active: true }),
    ]);

    await expect(svc.acceptJob('order-1', 'tech-1', info)).rejects.toThrow(/not approved|inactive/i);
  });

  it('throws when the technician account is inactive', async () => {
    transactionWith([
      makeDocSnapshot(true, { status: 'pending' }),
      makeDocSnapshot(true, { technicianStatus: 'approved', active: false }),
    ]);

    await expect(svc.acceptJob('order-1', 'tech-1', info)).rejects.toThrow(/not approved|inactive/i);
  });

  it('throws when the order does not exist', async () => {
    transactionWith([makeDocSnapshot(false)]);
    await expect(svc.acceptJob('missing', 'tech-1', info)).rejects.toThrow(/not found/i);
  });

  it('throws when the job has already been accepted (race condition)', async () => {
    transactionWith([makeDocSnapshot(true, { status: 'accepted', technicianId: 'someone-else' })]);
    await expect(svc.acceptJob('order-1', 'tech-1', info)).rejects.toThrow(/already been accepted/i);
  });
});

// -----------------------------------------------------------------------------
// startJob — authorization check
// -----------------------------------------------------------------------------
describe('startJob', () => {
  it('updates status to in_progress for the owning technician when status is accepted', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'tech-1', status: 'accepted', statusHistory: [] }) as never
    );
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined as never);

    await svc.startJob('order-1', 'tech-1');

    const updateArgs = vi.mocked(firestore.updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
    expect(updateArgs.status).toBe('in_progress');
    expect((updateArgs.statusHistory as unknown[])).toHaveLength(1);
  });

  it('rejects when the technician does not own the job', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'someone-else', status: 'accepted' }) as never
    );

    await expect(svc.startJob('order-1', 'tech-1')).rejects.toThrow(/unauthorized/i);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });

  it('rejects when the order is missing', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(makeDocSnapshot(false) as never);
    await expect(svc.startJob('missing', 'tech-1')).rejects.toThrow(/not found/i);
  });

  it('rejects when the job is not in accepted status', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'tech-1', status: 'in_progress' }) as never
    );
    await expect(svc.startJob('order-1', 'tech-1')).rejects.toThrow(/must be in accepted/i);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------------
// completeJob
// -----------------------------------------------------------------------------
describe('completeJob', () => {
  it('writes installationPhotos and statusHistory entry on completion', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'tech-1', status: 'in_progress', statusHistory: [] }) as never
    );
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined as never);

    await svc.completeJob('order-1', 'tech-1', ['url-a', 'url-b'], 'Done', ['front', 'back']);

    const args = vi.mocked(firestore.updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
    expect(args.status).toBe('completed');
    expect(args.technicianNotes).toBe('Done');
    const photos = args.installationPhotos as Array<{ url: string; description: string }>;
    expect(photos).toHaveLength(2);
    expect(photos[0].description).toBe('front');
    expect(photos[1].description).toBe('back');
  });

  it('falls back to default photo descriptions when none provided', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'tech-1', status: 'in_progress' }) as never
    );
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined as never);

    await svc.completeJob('order-1', 'tech-1', ['only-one'], undefined);

    const args = vi.mocked(firestore.updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
    const photos = args.installationPhotos as Array<{ url: string; description: string }>;
    expect(photos[0].description).toBe('Installation photo 1');
    expect(args.technicianNotes).toBe('');
  });

  it('rejects unauthorized completion', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'other', status: 'in_progress' }) as never
    );
    await expect(svc.completeJob('order-1', 'tech-1', ['x'])).rejects.toThrow(/unauthorized/i);
  });

  it('rejects when the job is not in progress', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'tech-1', status: 'accepted' }) as never
    );
    await expect(svc.completeJob('order-1', 'tech-1', ['x'])).rejects.toThrow(/in progress/i);
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------------
// getTechnicianStats
// -----------------------------------------------------------------------------
describe('getTechnicianStats', () => {
  it('aggregates totals, earnings, and completion rate; uses denormalized rating from users doc', async () => {
    // First call: jobs query
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(
      makeQueryDocsSnapshot([
        { id: 'j1', data: { status: 'completed', serviceSnapshot: { price: 100 }, rating: { score: 5 } } },
        { id: 'j2', data: { status: 'completed', serviceSnapshot: { price: 50 } } },
        { id: 'j3', data: { status: 'in_progress' } },
        { id: 'j4', data: { status: 'accepted' } },
        { id: 'j5', data: { status: 'pending' } }, // not counted in completionRate denominator
      ]) as never
    );
    // Second call: user doc for denormalized rating
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { totalReviews: 4, averageRating: 4.3 }) as never
    );

    const stats = await svc.getTechnicianStats('tech-1');

    expect(stats.totalJobs).toBe(5);
    expect(stats.completedJobs).toBe(2);
    expect(stats.inProgressJobs).toBe(1);
    expect(stats.upcomingJobs).toBe(1);
    expect(stats.totalEarnings).toBe(150);
    expect(stats.averageRating).toBe(4.3);
    // completionRate: completed(2) / started(2 completed + 1 in_progress + 1 accepted) = 50%
    expect(stats.completionRate).toBe(50);
  });

  it('falls back to per-order ratings when user doc has no reviews', async () => {
    vi.mocked(firestore.getDocs).mockResolvedValueOnce(
      makeQueryDocsSnapshot([
        { id: 'j1', data: { status: 'completed', serviceSnapshot: { price: 100 }, rating: { score: 5 } } },
        { id: 'j2', data: { status: 'completed', serviceSnapshot: { price: 100 }, rating: { score: 4 } } },
      ]) as never
    );
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { totalReviews: 0 }) as never
    );

    const stats = await svc.getTechnicianStats('tech-1');

    expect(stats.averageRating).toBe(4.5);
  });

  it('returns zeroed stats and logs (does NOT throw) when the orders query fails', async () => {
    vi.mocked(firestore.getDocs).mockRejectedValueOnce(new Error('boom'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const stats = await svc.getTechnicianStats('tech-1');

    expect(stats).toEqual({
      totalJobs: 0, completedJobs: 0, inProgressJobs: 0, upcomingJobs: 0,
      totalEarnings: 0, averageRating: 0, completionRate: 0,
    });
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('getTechnicianStats failed'),
      expect.any(Error),
    );
    errSpy.mockRestore();
  });
});

// -----------------------------------------------------------------------------
// getTechnicianJobById — visibility rules
// -----------------------------------------------------------------------------
describe('getTechnicianJobById', () => {
  it('returns null when the order does not exist', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(makeDocSnapshot(false) as never);
    expect(await svc.getTechnicianJobById('missing', 'tech-1')).toBeNull();
  });

  it('returns the order when status is pending (any technician can view)', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { status: 'pending', technicianId: undefined }, 'o1') as never
    );
    const job = await svc.getTechnicianJobById('o1', 'tech-1');
    expect(job?.id).toBe('o1');
  });

  it('returns the order when the technician owns it', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { status: 'accepted', technicianId: 'tech-1' }, 'o1') as never
    );
    const job = await svc.getTechnicianJobById('o1', 'tech-1');
    expect(job?.id).toBe('o1');
  });

  it('returns null when the technician does not own a non-pending order', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { status: 'accepted', technicianId: 'other' }, 'o1') as never
    );
    const job = await svc.getTechnicianJobById('o1', 'tech-1');
    expect(job).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// updateCompletionDetails
// -----------------------------------------------------------------------------
describe('updateCompletionDetails', () => {
  it('appends new photos to the existing array', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, {
        technicianId: 'tech-1',
        installationPhotos: [{ url: 'old', description: 'old' }],
      }) as never
    );
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined as never);

    await svc.updateCompletionDetails('o1', 'tech-1', {
      newPhotoUrls: ['new-1'],
      technicianNotes: 'updated note',
    });

    const args = vi.mocked(firestore.updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
    expect(args.technicianNotes).toBe('updated note');
    const photos = args.installationPhotos as unknown[];
    expect(photos).toHaveLength(2);
  });

  it('rejects when caller is not the owning technician', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'other' }) as never
    );
    await expect(
      svc.updateCompletionDetails('o1', 'tech-1', { technicianNotes: 'x' })
    ).rejects.toThrow(/unauthorized/i);
  });

  it('does not call updateDoc when there is nothing to update', async () => {
    vi.mocked(firestore.getDoc).mockResolvedValueOnce(
      makeDocSnapshot(true, { technicianId: 'tech-1' }) as never
    );
    await svc.updateCompletionDetails('o1', 'tech-1', {});
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------------
// uploadInstallationPhoto
// -----------------------------------------------------------------------------
describe('uploadInstallationPhoto', () => {
  it('uploads the file under orders/<orderId>/installation-photos/<uuid>_<name> and returns the download URL', async () => {
    const url = await svc.uploadInstallationPhoto(
      'order-1',
      new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
    );
    expect(url).toBe('https://fake.example/photo.jpg');
  });
});

// -----------------------------------------------------------------------------
// declineJob — current behavior is a no-op
// -----------------------------------------------------------------------------
describe('declineJob (current no-op)', () => {
  it('resolves without touching Firestore', async () => {
    await svc.declineJob('order-1', 'tech-1', 'too far');
    expect(firestore.updateDoc).not.toHaveBeenCalled();
    expect(firestore.runTransaction).not.toHaveBeenCalled();
  });
});
