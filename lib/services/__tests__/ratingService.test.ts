import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockTimestamp } from './firestore-mocks';

const mockNow = createMockTimestamp(new Date('2026-04-22T00:00:00Z'));

vi.mock('@/lib/firebase/config', () => ({ db: {} }));

const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'review-1' });

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({
    id: id || 'mock-id',
    path: `${col}/${id}`,
  })),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  Timestamp: {
    now: vi.fn(() => mockNow),
  },
}));

vi.mock('../customerHistoryService', () => ({
  addCustomerHistoryRecord: vi.fn().mockResolvedValue('history-1'),
}));

import { submitRating } from '../ratingService';
import { addCustomerHistoryRecord } from '../customerHistoryService';

beforeEach(() => {
  vi.clearAllMocks();
});

const baseInput = {
  orderId: 'order-1',
  orderNumber: 'ORD-001',
  customerId: 'cust-1',
  installerId: 'tech-1',
  subContractorId: 'sub-1',
  score: 5,
  review: 'Great service!',
  categories: {
    punctuality: 5,
    professionalism: 5,
    quality: 5,
    cleanliness: 4,
  },
};

describe('submitRating', () => {
  it('updates the order with rating summary', async () => {
    await submitRating(baseInput);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.rating.score).toBe(5);
    expect(updateData.rating.review).toBe('Great service!');
    expect(updateData.rating.ratedAt).toEqual(mockNow);
  });

  it('creates a detailed review document', async () => {
    await submitRating(baseInput);

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const reviewData = mockAddDoc.mock.calls[0][1];
    expect(reviewData.orderId).toBe('order-1');
    expect(reviewData.customerId).toBe('cust-1');
    expect(reviewData.installerId).toBe('tech-1');
    expect(reviewData.subContractorId).toBe('sub-1');
    expect(reviewData.rating).toBe(5);
    expect(reviewData.review).toBe('Great service!');
    expect(reviewData.categories.punctuality).toBe(5);
    expect(reviewData.categories.cleanliness).toBe(4);
    expect(reviewData.images).toEqual([]);
    expect(reviewData.helpful).toBe(0);
    expect(reviewData.createdAt).toEqual(mockNow);
  });

  it('logs a customer history record', async () => {
    await submitRating(baseInput);

    expect(addCustomerHistoryRecord).toHaveBeenCalledWith({
      customerId: 'cust-1',
      type: 'order_rated',
      title: 'Review Submitted',
      description: 'Rated order ORD-001 with 5/5 stars',
      orderId: 'order-1',
    });
  });

  it('handles low rating correctly', async () => {
    const lowRatingInput = { ...baseInput, score: 1, review: 'Poor job' };

    await submitRating(lowRatingInput);

    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.rating.score).toBe(1);
    expect(updateData.rating.review).toBe('Poor job');

    const reviewData = mockAddDoc.mock.calls[0][1];
    expect(reviewData.rating).toBe(1);

    expect(addCustomerHistoryRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Rated order ORD-001 with 1/5 stars',
      })
    );
  });

  it('executes all three writes (update, addDoc, history)', async () => {
    await submitRating(baseInput);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(addCustomerHistoryRecord).toHaveBeenCalledTimes(1);
  });
});
