import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDocSnapshot, createMockTimestamp } from './firestore-mocks';

const mockNow = createMockTimestamp(new Date('2026-04-22T00:00:00Z'));

vi.mock('@/lib/firebase/config', () => ({ db: {} }));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockSetDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({
    id: id || 'mock-id',
    path: `${col}/${id}`,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  Timestamp: {
    now: vi.fn(() => mockNow),
    fromMillis: vi.fn((ms: number) => createMockTimestamp(new Date(ms))),
  },
}));

vi.mock('../transactionService', () => ({
  logTransaction: vi.fn().mockResolvedValue('txn-1'),
}));

import {
  createReview,
  updateReview,
  getReviewForOrder,
  getReviewsForTechnician,
  flagReview,
  hideReview,
  restoreReview,
} from '../reviewService';
import { logTransaction } from '../transactionService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createReview', () => {
  it('creates review when order is completed and no existing review', async () => {
    // Order exists and is completed, owned by cust-1
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', { status: 'completed', customerId: 'cust-1', technicianId: 'tech-1' })
    );
    // No existing review — getDoc returns not found for reviews/order-1
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', {}, false)
    );
    // Customer user doc for denormalized customerName
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('cust-1', { displayName: 'Alice Customer' })
    );
    // Technician user doc for denormalized technicianName
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('tech-1', { displayName: 'Bob Technician' })
    );

    const id = await createReview('order-1', 'cust-1', 5, 'Great service!');

    expect(id).toBe('order-1');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    const reviewData = mockSetDoc.mock.calls[0][1];
    expect(reviewData.rating).toBe(5);
    expect(reviewData.comment).toBe('Great service!');
    expect(reviewData.flagged).toBe(false);
    expect(reviewData.hidden).toBe(false);
    expect(reviewData.technicianId).toBe('tech-1');
    expect(reviewData.customerName).toBe('Alice Customer');
    expect(reviewData.technicianName).toBe('Bob Technician');
    expect(reviewData.editableUntil).toBeDefined();
  });

  it('throws when order is not completed', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', { status: 'in_progress', customerId: 'cust-1' })
    );

    await expect(createReview('order-1', 'cust-1', 5)).rejects.toThrow('Cannot review an order that is not completed');
  });

  it('throws when customer does not own the order', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', { status: 'completed', customerId: 'other-user' })
    );

    await expect(createReview('order-1', 'cust-1', 5)).rejects.toThrow('Not authorized to review this order');
  });

  it('throws when review already exists', async () => {
    // Order is completed
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', { status: 'completed', customerId: 'cust-1' })
    );
    // Review doc already exists at reviews/order-1
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', { orderId: 'order-1', rating: 5 })
    );

    await expect(createReview('order-1', 'cust-1', 5)).rejects.toThrow('Review already exists for this order');
  });

  it('throws when order not found', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', {}, false)
    );

    await expect(createReview('order-1', 'cust-1', 5)).rejects.toThrow('Order not found');
  });

  it('throws on invalid rating', async () => {
    await expect(createReview('order-1', 'cust-1', 0)).rejects.toThrow('Rating must be an integer between 1 and 5');
    await expect(createReview('order-1', 'cust-1', 6)).rejects.toThrow('Rating must be an integer between 1 and 5');
    await expect(createReview('order-1', 'cust-1', 3.5)).rejects.toThrow('Rating must be an integer between 1 and 5');
  });

  it('logs transaction on create', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', { status: 'completed', customerId: 'cust-1', technicianId: 'tech-1' })
    );
    // No existing review
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', {}, false)
    );
    // Customer user doc (denormalization)
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('cust-1', { displayName: 'Alice' })
    );
    // Technician user doc (denormalization)
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('tech-1', { displayName: 'Bob' })
    );

    await createReview('order-1', 'cust-1', 4);

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'review_created',
        orderId: 'order-1',
        customerId: 'cust-1',
        performedBy: 'cust-1',
      })
    );
  });
});

describe('updateReview', () => {
  it('updates review within edit window', async () => {
    const futureDate = createMockTimestamp(new Date('2026-05-06T00:00:00Z'));
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('review-1', {
        customerId: 'cust-1',
        orderId: 'order-1',
        technicianId: 'tech-1',
        rating: 4,
        comment: 'Old text',
        editableUntil: futureDate,
      })
    );

    await updateReview('review-1', 'cust-1', 5, 'Updated text');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.rating).toBe(5);
    expect(updateData.comment).toBe('Updated text');
  });

  it('throws when edit window expired', async () => {
    const expiredDate = createMockTimestamp(new Date('2026-01-15T00:00:00Z'));
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('review-1', {
        customerId: 'cust-1',
        editableUntil: expiredDate,
      })
    );

    await expect(
      updateReview('review-1', 'cust-1', 5, 'Too late')
    ).rejects.toThrow('Edit window has expired');
  });

  it('throws when not authorized', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('review-1', {
        customerId: 'other-user',
        editableUntil: createMockTimestamp(new Date('2026-05-06T00:00:00Z')),
      })
    );

    await expect(
      updateReview('review-1', 'cust-1', 5, 'Hack')
    ).rejects.toThrow('Not authorized to edit this review');
  });

  it('logs transaction on update', async () => {
    const futureDate = createMockTimestamp(new Date('2026-05-06T00:00:00Z'));
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('review-1', {
        customerId: 'cust-1',
        orderId: 'order-1',
        technicianId: 'tech-1',
        rating: 3,
        editableUntil: futureDate,
      })
    );

    await updateReview('review-1', 'cust-1', 5);

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'review_updated',
        performedBy: 'cust-1',
      })
    );
  });
});

describe('getReviewForOrder', () => {
  it('returns review when found', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', { orderId: 'order-1', rating: 5 })
    );

    const result = await getReviewForOrder('order-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('order-1');
  });

  it('returns null when not found', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-x', {}, false)
    );

    const result = await getReviewForOrder('order-x');
    expect(result).toBeNull();
  });
});

describe('getReviewsForTechnician', () => {
  it('returns paginated reviews', async () => {
    const docs = Array.from({ length: 3 }, (_, i) => ({
      id: `review-${i}`,
      data: () => ({ technicianId: 'tech-1', rating: 5 - i, hidden: false }),
    }));
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getReviewsForTechnician('tech-1', 10);
    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
  });

  it('returns hasMore when more docs exist', async () => {
    const docs = Array.from({ length: 4 }, (_, i) => ({
      id: `review-${i}`,
      data: () => ({ technicianId: 'tech-1', rating: 5, hidden: false }),
    }));
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getReviewsForTechnician('tech-1', 3);
    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(true);
  });
});

describe('flagReview', () => {
  it('sets flagged with reason and logs transaction', async () => {
    await flagReview('review-1', 'Inappropriate content', 'admin-1');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.flagged).toBe(true);
    expect(updateData.flaggedReason).toBe('Inappropriate content');

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'review_flagged',
        performedBy: 'admin-1',
      })
    );
  });
});

describe('hideReview', () => {
  it('sets hidden to true and logs transaction', async () => {
    await hideReview('review-1', true, 'admin-1');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1].hidden).toBe(true);

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'review_hidden',
        performedBy: 'admin-1',
      })
    );
  });

  it('restores review and logs unhidden transaction', async () => {
    await hideReview('review-1', false, 'admin-1');

    expect(mockUpdateDoc.mock.calls[0][1].hidden).toBe(false);

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'review_unhidden',
      })
    );
  });
});

describe('restoreReview', () => {
  it('clears flagged, flaggedReason, and hidden in a single update', async () => {
    await restoreReview('review-1', 'admin-1');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.flagged).toBe(false);
    expect(updateData.flaggedReason).toBe('');
    expect(updateData.hidden).toBe(false);
    expect(updateData.updatedAt).toBeDefined();
  });

  it('logs review_restored transaction attributed to admin', async () => {
    await restoreReview('review-1', 'admin-1');

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'review_restored',
        performedBy: 'admin-1',
        performedByRole: 'admin',
        metadata: { reviewId: 'review-1' },
      })
    );
  });
});
