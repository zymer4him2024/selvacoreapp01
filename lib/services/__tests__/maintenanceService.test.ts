import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockDocSnapshot,
  createMockQuerySnapshot,
  createMockBatch,
  createMockTimestamp,
} from './firestore-mocks';

const mockBatch = createMockBatch();
const NOW = new Date('2026-04-13T00:00:00Z');
const mockNow = createMockTimestamp(NOW);

vi.mock('@/lib/firebase/config', () => ({ db: {} }));

vi.mock('../transactionService', () => ({
  logTransaction: vi.fn().mockResolvedValue('tx-id'),
}));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
  limit: vi.fn(),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  addDoc: vi.fn().mockResolvedValue({ id: 'mail-1' }),
  writeBatch: vi.fn(() => mockBatch),
  Timestamp: {
    now: vi.fn(() => mockNow),
    fromDate: vi.fn((d: Date) => createMockTimestamp(d)),
  },
}));

import {
  completeMaintenance,
  getSchedulesByDeviceId,
  getOverdueMaintenance,
  getMaintenanceSummaryStats,
  updateVisitNotes,
} from '../maintenanceService';
import { logTransaction } from '../transactionService';

beforeEach(() => {
  vi.clearAllMocks();
  mockDoc.mockImplementation((_db: unknown, col: string, id: string) => ({
    id: id || 'mock-id',
    path: `${col}/${id}`,
  }));
});

function createScheduleData(overrides: Record<string, unknown> = {}) {
  return {
    deviceId: 'device-1',
    orderId: 'order-1',
    type: 'ezer_maintenance',
    filterName: null,
    intervalDays: 90,
    nextDueDate: createMockTimestamp(new Date('2026-07-12T00:00:00Z')),
    lastCompletedAt: null,
    completionHistory: [],
    createdAt: createMockTimestamp(new Date('2026-01-01T00:00:00Z')),
    createdBy: 'tech-1',
    ...overrides,
  };
}

// Helper: mock the two extra getDoc calls that completeMaintenance makes after batch commit
// (device for email, user for technician name)
function mockEmailLookups() {
  mockGetDoc.mockResolvedValueOnce(
    createMockDocSnapshot('device-1', { customerInfo: { email: 'test@example.com' }, productSnapshot: { name: { en: 'Ezer' } } })
  );
  mockGetDoc.mockResolvedValueOnce(
    createMockDocSnapshot('admin-1', { displayName: 'Admin' })
  );
}

describe('completeMaintenance', () => {
  it('updates schedule with new nextDueDate and appended completion history', async () => {
    const scheduleData = createScheduleData({ intervalDays: 90 });
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-1', scheduleData)
    );
    mockEmailLookups();

    await completeMaintenance('schedule-1', 'admin-1', 'Routine check');

    expect(mockBatch.update).toHaveBeenCalledTimes(2); // schedule + device
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);

    // Schedule update
    const scheduleUpdateCall = mockBatch.update.mock.calls[0];
    const scheduleUpdate = scheduleUpdateCall[1];
    expect(scheduleUpdate.lastCompletedAt).toEqual(mockNow);

    // nextDueDate = now + 90 days
    const expectedNextDue = new Date(NOW.getTime() + 90 * 24 * 60 * 60 * 1000);
    expect(scheduleUpdate.nextDueDate.toDate().getTime()).toBe(expectedNextDue.getTime());

    // Completion history appended
    expect(scheduleUpdate.completionHistory).toHaveLength(1);
    expect(scheduleUpdate.completionHistory[0].completedBy).toBe('admin-1');
    expect(scheduleUpdate.completionHistory[0].notes).toBe('Routine check');
  });

  it('appends to existing completion history without overwriting', async () => {
    const existingHistory = [
      { completedAt: createMockTimestamp(), completedBy: 'admin-1', notes: 'First' },
      { completedAt: createMockTimestamp(), completedBy: 'admin-2', notes: 'Second' },
    ];
    const scheduleData = createScheduleData({ completionHistory: existingHistory });
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-1', scheduleData)
    );
    mockEmailLookups();

    await completeMaintenance('schedule-1', 'admin-3', 'Third');

    const scheduleUpdate = mockBatch.update.mock.calls[0][1];
    expect(scheduleUpdate.completionHistory).toHaveLength(3);
    expect(scheduleUpdate.completionHistory[0].notes).toBe('First');
    expect(scheduleUpdate.completionHistory[1].notes).toBe('Second');
    expect(scheduleUpdate.completionHistory[2].completedBy).toBe('admin-3');
    expect(scheduleUpdate.completionHistory[2].notes).toBe('Third');
  });

  it('updates device ezer fields when type is ezer_maintenance', async () => {
    const scheduleData = createScheduleData({ type: 'ezer_maintenance', intervalDays: 180 });
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-1', scheduleData)
    );
    mockEmailLookups();

    await completeMaintenance('schedule-1', 'admin-1');

    // Second batch.update call is for the device
    const deviceUpdate = mockBatch.update.mock.calls[1][1];
    expect(deviceUpdate.lastEzerMaintenanceAt).toEqual(mockNow);
    expect(deviceUpdate.nextEzerMaintenanceDue).toBeDefined();
    const expectedDue = new Date(NOW.getTime() + 180 * 24 * 60 * 60 * 1000);
    expect(deviceUpdate.nextEzerMaintenanceDue.toDate().getTime()).toBe(expectedDue.getTime());

    // Should NOT have filter fields
    expect(deviceUpdate.lastFilterReplacementAt).toBeUndefined();
    expect(deviceUpdate.nextFilterReplacementDue).toBeUndefined();
  });

  it('updates device filter fields when type is filter_replacement', async () => {
    const scheduleData = createScheduleData({
      type: 'filter_replacement',
      filterName: 'Sediment Filter',
      intervalDays: 180,
    });
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-1', scheduleData)
    );

    // getFilterSchedulesForDevice call — no sibling filters
    mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));
    mockEmailLookups();

    await completeMaintenance('schedule-1', 'admin-1');

    const deviceUpdate = mockBatch.update.mock.calls[1][1];
    expect(deviceUpdate.lastFilterReplacementAt).toEqual(mockNow);
    expect(deviceUpdate.nextFilterReplacementDue).toBeDefined();

    // Should NOT have ezer fields
    expect(deviceUpdate.lastEzerMaintenanceAt).toBeUndefined();
    expect(deviceUpdate.nextEzerMaintenanceDue).toBeUndefined();
  });

  it('sets nextFilterReplacementDue to earliest across sibling schedules', async () => {
    const scheduleData = createScheduleData({
      type: 'filter_replacement',
      filterName: 'Carbon Filter',
      intervalDays: 365,
    });
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-1', scheduleData)
    );

    // Sibling filter has an earlier due date
    const siblingDueDate = new Date('2026-05-01T00:00:00Z');
    mockGetDocs.mockResolvedValueOnce(
      createMockQuerySnapshot([
        {
          id: 'schedule-2',
          data: {
            deviceId: 'device-1',
            type: 'filter_replacement',
            filterName: 'Sediment Filter',
            intervalDays: 90,
            nextDueDate: createMockTimestamp(siblingDueDate),
          },
        },
      ])
    );
    mockEmailLookups();

    await completeMaintenance('schedule-1', 'admin-1');

    const deviceUpdate = mockBatch.update.mock.calls[1][1];
    // Sibling's due date (May 1) is earlier than this schedule's new due (now + 365 days)
    expect(deviceUpdate.nextFilterReplacementDue.toDate().getTime()).toBe(siblingDueDate.getTime());
  });

  it('throws when schedule does not exist', async () => {
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-x', {}, false)
    );

    await expect(completeMaintenance('schedule-x', 'admin-1')).rejects.toThrow(
      'Schedule not found'
    );
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('calls logTransaction with maintenance_completed type', async () => {
    const scheduleData = createScheduleData({
      filterName: 'Sediment Filter',
      type: 'filter_replacement',
    });
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-1', scheduleData)
    );
    mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));
    mockEmailLookups();

    await completeMaintenance('schedule-1', 'admin-1', 'Done');

    expect(logTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'maintenance_completed',
        performedBy: 'admin-1',
        performedByRole: 'admin',
        metadata: expect.objectContaining({
          scheduleId: 'schedule-1',
          deviceId: 'device-1',
          maintenanceType: 'filter_replacement',
          filterName: 'Sediment Filter',
          notes: 'Done',
        }),
      })
    );
  });

  it('includes notes in completion entry when provided', async () => {
    const scheduleData = createScheduleData();
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-1', scheduleData)
    );
    mockEmailLookups();

    await completeMaintenance('schedule-1', 'admin-1', 'Replaced filter cartridge');

    const scheduleUpdate = mockBatch.update.mock.calls[0][1];
    expect(scheduleUpdate.completionHistory[0].notes).toBe('Replaced filter cartridge');
  });

  it('sets empty string for notes when not provided', async () => {
    const scheduleData = createScheduleData();
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('schedule-1', scheduleData)
    );
    mockEmailLookups();

    await completeMaintenance('schedule-1', 'admin-1');

    const scheduleUpdate = mockBatch.update.mock.calls[0][1];
    expect(scheduleUpdate.completionHistory[0].notes).toBe('');
  });
});

describe('getSchedulesByDeviceId', () => {
  it('returns schedules for a device', async () => {
    mockGetDocs.mockResolvedValueOnce(
      createMockQuerySnapshot([
        { id: 'sched-1', data: { type: 'ezer_maintenance', deviceId: 'device-1' } },
        { id: 'sched-2', data: { type: 'filter_replacement', deviceId: 'device-1' } },
      ])
    );

    const result = await getSchedulesByDeviceId('device-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('sched-1');
    expect(result[1].id).toBe('sched-2');
  });

  it('returns empty array when none found', async () => {
    mockGetDocs.mockResolvedValueOnce(createMockQuerySnapshot([]));

    const result = await getSchedulesByDeviceId('device-999');

    expect(result).toEqual([]);
  });
});

describe('getOverdueMaintenance', () => {
  it('returns overdue schedules joined with device data', async () => {
    // First getDocs: overdue schedules
    mockGetDocs.mockResolvedValueOnce(
      createMockQuerySnapshot([
        { id: 'sched-1', data: { deviceId: 'device-1', type: 'ezer_maintenance' } },
      ])
    );

    // getDoc for device join
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('device-1', { status: 'active', qrCodeData: 'QR-1' })
    );

    const result = await getOverdueMaintenance();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sched-1');
    expect(result[0].device.id).toBe('device-1');
    expect(result[0].device.qrCodeData).toBe('QR-1');
  });

  it('excludes schedules whose device is missing', async () => {
    mockGetDocs.mockResolvedValueOnce(
      createMockQuerySnapshot([
        { id: 'sched-1', data: { deviceId: 'device-missing', type: 'ezer_maintenance' } },
      ])
    );

    // Device not found
    mockGetDoc.mockResolvedValueOnce(
      createMockDocSnapshot('device-missing', {}, false)
    );

    const result = await getOverdueMaintenance();

    expect(result).toHaveLength(0);
  });
});

describe('getMaintenanceSummaryStats', () => {
  it('returns correct counts from parallel queries', async () => {
    // Promise.all resolves 4 getDocs calls in parallel
    mockGetDocs
      .mockResolvedValueOnce({ size: 10, docs: [] }) // devices count
      .mockResolvedValueOnce({ size: 3, docs: [] })  // overdue
      .mockResolvedValueOnce({ size: 5, docs: [] })  // this week
      .mockResolvedValueOnce({ size: 8, docs: [] }); // this month

    const stats = await getMaintenanceSummaryStats();

    expect(stats).toEqual({
      totalDevices: 10,
      overdueCount: 3,
      upcomingThisWeek: 5,
      upcomingThisMonth: 8,
    });
  });
});

describe('updateVisitNotes', () => {
  it('calls updateDoc with the correct notes', async () => {
    await updateVisitNotes('visit-1', 'Updated notes');

    expect(mockDoc).toHaveBeenCalledWith({}, 'maintenanceVisits', 'visit-1');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual({ notes: 'Updated notes' });
  });

  it('handles empty string notes', async () => {
    await updateVisitNotes('visit-1', '');

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual({ notes: '' });
  });
});
