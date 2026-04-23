import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockDocSnapshot,
  createMockTimestamp,
  createMockOrder,
} from './firestore-mocks';

const mockNow = createMockTimestamp(new Date('2026-04-22T00:00:00Z'));

vi.mock('@/lib/firebase/config', () => ({ db: {}, storage: {} }));

const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({
    id: id || 'mock-id',
    path: `${col}/${id}`,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: vi.fn(),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
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

import { updateCompletionDetails } from '../technicianService';

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
