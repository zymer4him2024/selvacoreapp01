import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockDocSnapshot,
  createMockQuerySnapshot,
  createMockBatch,
  createMockTimestamp,
  createMockOrder,
  createMockScheduleInput,
} from './firestore-mocks';

const mockBatch = createMockBatch();
const mockNow = createMockTimestamp(new Date('2026-04-13T00:00:00Z'));

vi.mock('@/lib/firebase/config', () => ({ db: {} }));

vi.mock('../transactionService', () => ({
  logTransaction: vi.fn().mockResolvedValue('tx-id'),
}));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  writeBatch: vi.fn(() => mockBatch),
  Timestamp: {
    now: vi.fn(() => mockNow),
    fromDate: vi.fn((d: Date) => createMockTimestamp(d)),
  },
  addDoc: vi.fn(),
}));

import { registerDevice, getDeviceByQrCode, getDeviceByOrderId } from '../deviceService';
import { logTransaction } from '../transactionService';

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockImplementation((...args: unknown[]) => {
    if (args.length === 2) {
      // doc(db, 'collection') — shouldn't happen but handle
      return { id: 'mock-id', path: args };
    }
    // doc(collectionRef) — auto-id, or doc(db, 'collection', 'id')
    return { id: args[2] || 'auto-device-id', path: args };
  });
});

function setupHappyPath() {
  const order = createMockOrder();

  // getDoc for order
  mockGetDoc.mockResolvedValueOnce(
    createMockDocSnapshot('order-1', order)
  );

  // getDocs for QR code duplicate check — empty
  mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));

  // getDocs for order-device duplicate check — empty
  mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));

  return order;
}

describe('registerDevice', () => {
  it('creates device and maintenance schedules in a batch on happy path', async () => {
    setupHappyPath();

    const input = {
      qrCodeData: 'QR-12345',
      schedules: [
        createMockScheduleInput(),
        createMockScheduleInput({
          type: 'filter_replacement',
          filterName: 'Sediment Filter',
          intervalDays: 180,
          firstDueDate: new Date('2026-10-10T00:00:00Z'),
        }),
      ],
    };

    const result = await registerDevice('order-1', 'tech-1', input);

    expect(result).toBe('auto-device-id');
    // 1 device + 2 schedules = 3 batch.set calls
    expect(mockBatch.set).toHaveBeenCalledTimes(3);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);

    // Verify device doc fields
    const deviceSetCall = mockBatch.set.mock.calls[0];
    const deviceData = deviceSetCall[1];
    expect(deviceData.qrCodeData).toBe('QR-12345');
    expect(deviceData.orderId).toBe('order-1');
    expect(deviceData.customerId).toBe('customer-1');
    expect(deviceData.technicianId).toBe('tech-1');
    expect(deviceData.status).toBe('active');
    expect(deviceData.lastEzerMaintenanceAt).toBeNull();
    expect(deviceData.lastFilterReplacementAt).toBeNull();
    expect(deviceData.productSnapshot.variation).toBe('Standard');
    expect(deviceData.customerInfo.name).toBe('John Doe');

    // Verify first schedule doc
    const schedule1Data = mockBatch.set.mock.calls[1][1];
    expect(schedule1Data.type).toBe('ezer_maintenance');
    expect(schedule1Data.intervalDays).toBe(180);
    expect(schedule1Data.lastCompletedAt).toBeNull();
    expect(schedule1Data.completionHistory).toEqual([]);
    expect(schedule1Data.createdBy).toBe('tech-1');

    // Verify second schedule doc
    const schedule2Data = mockBatch.set.mock.calls[2][1];
    expect(schedule2Data.type).toBe('filter_replacement');
    expect(schedule2Data.filterName).toBe('Sediment Filter');
  });

  it('sets nextEzerMaintenanceDue from ezer schedule firstDueDate', async () => {
    setupHappyPath();
    const ezerDate = new Date('2026-10-10T00:00:00Z');

    const input = {
      qrCodeData: 'QR-EZER',
      schedules: [createMockScheduleInput({ firstDueDate: ezerDate })],
    };

    await registerDevice('order-1', 'tech-1', input);

    const deviceData = mockBatch.set.mock.calls[0][1];
    expect(deviceData.nextEzerMaintenanceDue.toDate().getTime()).toBe(ezerDate.getTime());
  });

  it('sets nextFilterReplacementDue to earliest filter date', async () => {
    setupHappyPath();

    const earlyDate = new Date('2026-07-01T00:00:00Z');
    const lateDate = new Date('2027-01-01T00:00:00Z');

    const input = {
      qrCodeData: 'QR-FILTER',
      schedules: [
        createMockScheduleInput(),
        createMockScheduleInput({
          type: 'filter_replacement',
          filterName: 'Sediment Filter',
          intervalDays: 180,
          firstDueDate: lateDate,
        }),
        createMockScheduleInput({
          type: 'filter_replacement',
          filterName: 'Carbon Filter',
          intervalDays: 365,
          firstDueDate: earlyDate,
        }),
      ],
    };

    await registerDevice('order-1', 'tech-1', input);

    const deviceData = mockBatch.set.mock.calls[0][1];
    expect(deviceData.nextFilterReplacementDue.toDate().getTime()).toBe(earlyDate.getTime());
  });

  it('throws when order does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('order-1', {}, false)
    );

    const input = {
      qrCodeData: 'QR-X',
      schedules: [createMockScheduleInput()],
    };

    await expect(registerDevice('order-1', 'tech-1', input)).rejects.toThrow('Order not found');
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('throws when QR code is already registered', async () => {
    const order = createMockOrder();
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));
    // QR check returns existing device
    mockGetDocs.mockResolvedValueOnce(
      createMockQuerySnapshot([{ id: 'existing-device', data: { qrCodeData: 'QR-DUP' } }])
    );

    const input = {
      qrCodeData: 'QR-DUP',
      schedules: [createMockScheduleInput()],
    };

    await expect(registerDevice('order-1', 'tech-1', input)).rejects.toThrow(
      'This QR code is already registered to another device'
    );
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('throws when device already registered for order', async () => {
    const order = createMockOrder();
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('order-1', order));
    // QR check — empty
    mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));
    // Order-device check — existing device
    mockGetDocs.mockResolvedValueOnce(
      createMockQuerySnapshot([{ id: 'existing-device', data: { orderId: 'order-1' } }])
    );

    const input = {
      qrCodeData: 'QR-NEW',
      schedules: [createMockScheduleInput()],
    };

    await expect(registerDevice('order-1', 'tech-1', input)).rejects.toThrow(
      'A device is already registered for this order'
    );
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('calls logTransaction with correct metadata', async () => {
    setupHappyPath();

    const input = {
      qrCodeData: 'QR-TX',
      schedules: [createMockScheduleInput()],
    };

    await registerDevice('order-1', 'tech-1', input);

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'device_registered',
        orderId: 'order-1',
        orderNumber: 'ORD-000001-0001',
        customerId: 'customer-1',
        technicianId: 'tech-1',
        performedBy: 'tech-1',
        performedByRole: 'technician',
        metadata: expect.objectContaining({
          deviceId: 'auto-device-id',
          qrCodeData: 'QR-TX',
          schedulesCount: 1,
        }),
      })
    );
  });

  it('creates correct number of schedule documents for multiple schedules', async () => {
    setupHappyPath();

    const input = {
      qrCodeData: 'QR-MULTI',
      schedules: [
        createMockScheduleInput(),
        createMockScheduleInput({
          type: 'filter_replacement',
          filterName: 'Sediment Filter',
          intervalDays: 180,
          firstDueDate: new Date('2026-10-10T00:00:00Z'),
        }),
        createMockScheduleInput({
          type: 'filter_replacement',
          filterName: 'Carbon Filter',
          intervalDays: 365,
          firstDueDate: new Date('2027-04-10T00:00:00Z'),
        }),
      ],
    };

    await registerDevice('order-1', 'tech-1', input);

    // 1 device + 3 schedules = 4
    expect(mockBatch.set).toHaveBeenCalledTimes(4);
  });
});

describe('getDeviceByQrCode', () => {
  it('returns device when found', async () => {
    const deviceData = { qrCodeData: 'QR-FOUND', status: 'active' };
    mockGetDocs.mockResolvedValueOnce(
      createMockQuerySnapshot([{ id: 'device-1', data: deviceData }])
    );

    const result = await getDeviceByQrCode('QR-FOUND');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('device-1');
    expect(result!.qrCodeData).toBe('QR-FOUND');
  });

  it('returns null when no device matches', async () => {
    mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));

    const result = await getDeviceByQrCode('QR-NONE');

    expect(result).toBeNull();
  });
});

describe('getDeviceByOrderId', () => {
  it('returns device when found', async () => {
    const deviceData = { orderId: 'order-1', status: 'active' };
    mockGetDocs.mockResolvedValueOnce(
      createMockQuerySnapshot([{ id: 'device-1', data: deviceData }])
    );

    const result = await getDeviceByOrderId('order-1');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('device-1');
  });

  it('returns null when no device matches', async () => {
    mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));

    const result = await getDeviceByOrderId('order-999');

    expect(result).toBeNull();
  });
});
