import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockTimestamp } from './firestore-mocks';

const mockNow = createMockTimestamp(new Date('2026-04-22T00:00:00Z'));

vi.mock('@/lib/firebase/config', () => ({ db: {} }));

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'history-1' });

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => mockNow),
  },
}));

import {
  addCustomerHistoryRecord,
  getCustomerHistory,
  getCustomerHistoryByType,
  getCustomerPaymentHistory,
  getCustomerOrderHistory,
} from '../customerHistoryService';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addCustomerHistoryRecord', () => {
  it('creates a history record and returns its id', async () => {
    const id = await addCustomerHistoryRecord({
      customerId: 'cust-1',
      type: 'order_placed',
      title: 'Order Placed',
      description: 'Placed order ORD-001',
      orderId: 'order-1',
    });

    expect(id).toBe('history-1');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const addedData = mockAddDoc.mock.calls[0][1];
    expect(addedData.customerId).toBe('cust-1');
    expect(addedData.type).toBe('order_placed');
    expect(addedData.timestamp).toEqual(mockNow);
  });

  it('includes optional amount and currency', async () => {
    await addCustomerHistoryRecord({
      customerId: 'cust-1',
      type: 'payment_made',
      title: 'Payment',
      description: 'Paid R$500',
      amount: 500,
      currency: 'BRL',
    });

    const addedData = mockAddDoc.mock.calls[0][1];
    expect(addedData.amount).toBe(500);
    expect(addedData.currency).toBe('BRL');
  });
});

describe('getCustomerHistory', () => {
  it('returns history records for a customer', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'h1',
          data: () => ({
            customerId: 'cust-1',
            type: 'order_placed',
            title: 'Order Placed',
            description: 'desc',
            timestamp: mockNow,
          }),
        },
        {
          id: 'h2',
          data: () => ({
            customerId: 'cust-1',
            type: 'payment_made',
            title: 'Payment',
            description: 'desc',
            timestamp: mockNow,
          }),
        },
      ],
    });

    const result = await getCustomerHistory('cust-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('h1');
    expect(result[1].id).toBe('h2');
    // timestamp should be converted to Date via toDate()
    expect(result[0].timestamp).toBeInstanceOf(Date);
  });

  it('returns empty array when no history', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getCustomerHistory('cust-no-history');

    expect(result).toHaveLength(0);
  });
});

describe('getCustomerHistoryByType', () => {
  it('returns only records of the specified type', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'h1',
          data: () => ({
            customerId: 'cust-1',
            type: 'payment_made',
            title: 'Payment',
            description: 'desc',
            timestamp: mockNow,
          }),
        },
      ],
    });

    const result = await getCustomerHistoryByType('cust-1', 'payment_made');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('h1');
  });
});

describe('getCustomerPaymentHistory', () => {
  it('delegates to getCustomerHistoryByType with payment_made', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getCustomerPaymentHistory('cust-1');

    expect(result).toHaveLength(0);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});

describe('getCustomerOrderHistory', () => {
  it('delegates to getCustomerHistoryByType with order_placed', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getCustomerOrderHistory('cust-1');

    expect(result).toHaveLength(0);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});
