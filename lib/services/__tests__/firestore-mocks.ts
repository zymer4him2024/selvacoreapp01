import { vi } from 'vitest';

export function createMockDocSnapshot(
  id: string,
  data: Record<string, unknown>,
  exists = true
) {
  return {
    id,
    exists: () => exists,
    data: () => (exists ? data : undefined),
  };
}

export function createMockQuerySnapshot(
  docs: Array<{ id: string; data: Record<string, unknown> }>
) {
  const mockDocs = docs.map((d) => createMockDocSnapshot(d.id, d.data));
  return {
    empty: docs.length === 0,
    docs: mockDocs,
    size: docs.length,
  };
}

export function createMockBatch() {
  return {
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockTimestamp(date: Date = new Date('2026-04-13T00:00:00Z')) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
  };
}

export function createMockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-000001-0001',
    customerId: 'customer-1',
    technicianId: 'tech-1',
    status: 'completed',
    productSnapshot: {
      name: { en: 'Ezer Water Filter', es: '', pt: '', ko: '' },
      variation: 'Standard',
      image: 'https://example.com/image.jpg',
    },
    installationAddress: {
      street: '123 Main St',
      city: 'Sao Paulo',
      state: 'SP',
      postalCode: '01000-000',
      country: 'Brazil',
    },
    customerInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    },
    ...overrides,
  };
}

export function createMockScheduleInput(
  overrides: Record<string, unknown> = {}
) {
  return {
    type: 'ezer_maintenance' as const,
    intervalDays: 180,
    firstDueDate: new Date('2026-10-10T00:00:00Z'),
    ...overrides,
  };
}
