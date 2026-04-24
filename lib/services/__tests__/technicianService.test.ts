import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockDocSnapshot,
  createMockQuerySnapshot,
  createMockTimestamp,
  createMockOrder,
} from './firestore-mocks';

const mockNow = createMockTimestamp(new Date('2026-04-22T00:00:00Z'));

vi.mock('@/lib/firebase/config', () => ({ db: {}, storage: {} }));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({
    id: id || 'mock-id',
    path: `${col}/${id}`,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  runTransaction: vi.fn(),
  Timestamp: {
    now: vi.fn(() => mockNow),
    fromDate: vi.fn((d: Date) => createMockTimestamp(d)),
  },
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

import {
  updateCompletionDetails,
  getAvailableJobsPaginated,
  getTechnicianJobsPaginated,
} from '../technicianService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('updateCompletionDetails', () => {
  it('updates technicianNotes when provided', async () => {
    const order = createMockOrder({ technicianId: 'tech-1', technicianNotes: 'old notes' });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateCompletionDetails('order-1', 'tech-1', { technicianNotes: 'new notes' });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.technicianNotes).toBe('new notes');
    expect(updateData.installationPhotos).toBeUndefined();
  });

  it('appends new photos to existing installationPhotos', async () => {
    const existingPhotos = [
      { url: 'https://example.com/photo1.jpg', uploadedAt: mockNow, description: 'Photo 1' },
    ];
    const order = createMockOrder({
      technicianId: 'tech-1',
      installationPhotos: existingPhotos,
    });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateCompletionDetails('order-1', 'tech-1', {
      newPhotoUrls: ['https://example.com/photo2.jpg', 'https://example.com/photo3.jpg'],
    });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.installationPhotos).toHaveLength(3);
    expect(updateData.installationPhotos[0].url).toBe('https://example.com/photo1.jpg');
    expect(updateData.installationPhotos[1].url).toBe('https://example.com/photo2.jpg');
    expect(updateData.installationPhotos[2].url).toBe('https://example.com/photo3.jpg');
  });

  it('updates both notes and photos in a single call', async () => {
    const order = createMockOrder({
      technicianId: 'tech-1',
      installationPhotos: [],
    });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateCompletionDetails('order-1', 'tech-1', {
      technicianNotes: 'updated',
      newPhotoUrls: ['https://example.com/new.jpg'],
    });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.technicianNotes).toBe('updated');
    expect(updateData.installationPhotos).toHaveLength(1);
  });

  it('throws when order not found', async () => {
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-x', {}, false));

    await expect(
      updateCompletionDetails('order-x', 'tech-1', { technicianNotes: 'test' })
    ).rejects.toThrow('Order not found');

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('throws when technician does not own the order', async () => {
    const order = createMockOrder({ technicianId: 'tech-other' });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await expect(
      updateCompletionDetails('order-1', 'tech-1', { technicianNotes: 'test' })
    ).rejects.toThrow('Unauthorized');

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('does not call updateDoc when no changes provided', async () => {
    const order = createMockOrder({ technicianId: 'tech-1' });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateCompletionDetails('order-1', 'tech-1', {});

    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('handles undefined installationPhotos on existing order', async () => {
    const order = createMockOrder({ technicianId: 'tech-1' });
    delete (order as Record<string, unknown>).installationPhotos;
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateCompletionDetails('order-1', 'tech-1', {
      newPhotoUrls: ['https://example.com/first.jpg'],
    });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.installationPhotos).toHaveLength(1);
  });
});

function makeMockDocs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `order-${i}`,
    data: () => createMockOrder({ orderNumber: `ORD-${i}` }),
  }));
}

describe('getAvailableJobsPaginated', () => {
  it('returns items with hasMore=false when results fit in one page', async () => {
    const docs = makeMockDocs(3);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getAvailableJobsPaginated(10);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBe(docs[2]);
  });

  it('returns hasMore=true and trims to pageSize when more docs exist', async () => {
    // pageSize=2 → fetches 3 docs → hasMore=true, returns 2
    const docs = makeMockDocs(3);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getAvailableJobsPaginated(2);

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.lastDoc).toBe(docs[1]);
  });

  it('returns empty result when no jobs available', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getAvailableJobsPaginated(10);

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBeNull();
  });

  it('passes cursor to query when provided', async () => {
    const fakeCursor = { id: 'cursor-doc' } as never;
    mockGetDocs.mockResolvedValueOnce({ docs: makeMockDocs(1) });

    await getAvailableJobsPaginated(10, fakeCursor);

    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});

describe('getTechnicianJobsPaginated', () => {
  it('returns items with hasMore=false when results fit in one page', async () => {
    const docs = makeMockDocs(2);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getTechnicianJobsPaginated('tech-1', ['accepted'], 10);

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBe(docs[1]);
  });

  it('returns hasMore=true when more docs exist beyond pageSize', async () => {
    const docs = makeMockDocs(4);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getTechnicianJobsPaginated('tech-1', ['accepted'], 3);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(true);
  });

  it('returns empty result for technician with no jobs', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getTechnicianJobsPaginated('tech-1', ['completed'], 10);

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBeNull();
  });

  it('passes cursor to query when provided', async () => {
    const fakeCursor = { id: 'cursor-doc' } as never;
    mockGetDocs.mockResolvedValueOnce({ docs: makeMockDocs(1) });

    await getTechnicianJobsPaginated('tech-1', ['in_progress'], 10, fakeCursor);

    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});
