import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockDocSnapshot,
  createMockQuerySnapshot,
  createMockTimestamp,
  createMockOrder,
} from './firestore-mocks';

const NOW = new Date('2026-04-22T00:00:00Z');
const mockNow = createMockTimestamp(NOW);

vi.mock('@/lib/firebase/config', () => ({ db: {} }));

vi.mock('../transactionService', () => ({
  logTransaction: vi.fn().mockResolvedValue('tx-id'),
}));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockRunTransaction = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({
    id: id || 'mock-id',
    path: `${col}/${id}`,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-order-id' }),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  Timestamp: {
    now: vi.fn(() => mockNow),
    fromDate: vi.fn((d: Date) => createMockTimestamp(d)),
  },
  QueryDocumentSnapshot: vi.fn(),
  DocumentData: vi.fn(),
}));

import {
  getOrderById,
  getOrdersPaginated,
  updateOrderStatus,
  cancelOrder,
  deleteOrder,
  getActiveOrders,
  getUnassignedOrders,
} from '../orderService';
import { logTransaction } from '../transactionService';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeMockDocs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `order-${i}`,
    data: () => createMockOrder({ orderNumber: `ORD-${i}` }),
  }));
}

describe('getOrderById', () => {
  it('returns order when found', async () => {
    const orderData = createMockOrder({ orderNumber: 'ORD-001' });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', orderData));

    const result = await getOrderById('order-1');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('order-1');
  });

  it('returns null when order not found', async () => {
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-x', {}, false));

    const result = await getOrderById('order-x');

    expect(result).toBeNull();
  });
});

describe('getOrdersPaginated', () => {
  it('returns items with hasMore=false when results fit in one page', async () => {
    const docs = makeMockDocs(3);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getOrdersPaginated(10);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBe(docs[2]);
  });

  it('returns hasMore=true when more docs exist', async () => {
    const docs = makeMockDocs(6);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getOrdersPaginated(5);

    expect(result.items).toHaveLength(5);
    expect(result.hasMore).toBe(true);
    expect(result.lastDoc).toBe(docs[4]);
  });

  it('returns empty result when no orders exist', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getOrdersPaginated(10);

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBeNull();
  });

  it('accepts status filter', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: makeMockDocs(2) });

    const result = await getOrdersPaginated(10, null, 'pending');

    expect(result.items).toHaveLength(2);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('ignores "all" status filter', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: makeMockDocs(1) });

    const result = await getOrdersPaginated(10, null, 'all');

    expect(result.items).toHaveLength(1);
  });
});

describe('updateOrderStatus', () => {
  it('updates order status and appends to statusHistory', async () => {
    const order = createMockOrder({ status: 'pending', statusHistory: [] });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateOrderStatus('order-1', 'accepted', 'Approved', 'admin-1');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.status).toBe('accepted');
    expect(updateData.statusHistory).toHaveLength(1);
    expect(updateData.statusHistory[0].status).toBe('accepted');
    expect(updateData.acceptedAt).toEqual(mockNow);
  });

  it('sets startedAt when status is in_progress', async () => {
    const order = createMockOrder({ status: 'accepted', statusHistory: [] });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateOrderStatus('order-1', 'in_progress');

    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.startedAt).toEqual(mockNow);
  });

  it('sets completedAt when status is completed', async () => {
    const order = createMockOrder({ status: 'in_progress', statusHistory: [] });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateOrderStatus('order-1', 'completed');

    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.completedAt).toEqual(mockNow);
  });

  it('throws when order not found', async () => {
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-x', {}, false));

    await expect(updateOrderStatus('order-x', 'accepted')).rejects.toThrow('Order not found');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('logs transaction for accepted status', async () => {
    const order = createMockOrder({ status: 'pending', statusHistory: [] });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await updateOrderStatus('order-1', 'accepted', 'Approved', 'admin-1');

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'order_accepted',
        orderId: 'order-1',
        performedBy: 'admin-1',
      })
    );
  });
});

describe('cancelOrder', () => {
  it('cancels order with reason and logs transaction', async () => {
    const order = createMockOrder({ status: 'pending', statusHistory: [] });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await cancelOrder('order-1', 'Changed mind', 'customer', 'cust-1');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.status).toBe('cancelled');
    expect(updateData.cancellation.reason).toBe('Changed mind');
    expect(updateData.cancellation.cancelledBy).toBe('customer');
    expect(updateData.cancellation.refundIssued).toBe(true);

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'order_cancelled',
        metadata: expect.objectContaining({
          reason: 'Changed mind',
          cancelledBy: 'customer',
        }),
      })
    );
  });

  it('throws when order not found', async () => {
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-x', {}, false));

    await expect(cancelOrder('order-x', 'reason', 'admin', 'admin-1')).rejects.toThrow('Order not found');
  });

  it('sets performedByRole to customer when cancelledBy is customer', async () => {
    const order = createMockOrder({ status: 'accepted', statusHistory: [] });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await cancelOrder('order-1', 'reason', 'customer', 'cust-1');

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        performedByRole: 'customer',
      })
    );
  });

  it('sets performedByRole to admin when cancelledBy is admin', async () => {
    const order = createMockOrder({ status: 'accepted', statusHistory: [] });
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));

    await cancelOrder('order-1', 'reason', 'admin', 'admin-1');

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        performedByRole: 'admin',
      })
    );
  });
});

describe('deleteOrder', () => {
  it('deletes the order document', async () => {
    await deleteOrder('order-1');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

describe('getActiveOrders', () => {
  it('returns orders with active statuses', async () => {
    const docs = makeMockDocs(3);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getActiveOrders();

    expect(result).toHaveLength(3);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when no active orders', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getActiveOrders();

    expect(result).toHaveLength(0);
  });
});

describe('getUnassignedOrders', () => {
  it('returns only orders without technicianId', async () => {
    const docs = [
      { id: 'o1', data: () => createMockOrder({ technicianId: null }) },
      { id: 'o2', data: () => createMockOrder({ technicianId: 'tech-1' }) },
      { id: 'o3', data: () => createMockOrder({ technicianId: undefined }) },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getUnassignedOrders();

    // Only orders without technicianId
    expect(result).toHaveLength(2);
  });
});
