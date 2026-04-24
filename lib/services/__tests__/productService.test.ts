import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockDocSnapshot,
  createMockTimestamp,
} from './firestore-mocks';

const mockNow = createMockTimestamp(new Date('2026-04-22T00:00:00Z'));

vi.mock('@/lib/firebase/config', () => ({ db: {}, storage: {} }));

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockAddDoc = vi.fn().mockResolvedValue({ id: 'new-product-id' });

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, path: string) => path),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({
    id: id || 'mock-id',
    path: `${col}/${id}`,
  })),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  Timestamp: {
    now: vi.fn(() => mockNow),
    fromDate: vi.fn((d: Date) => createMockTimestamp(d)),
  },
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn().mockResolvedValue({}),
  getDownloadURL: vi.fn().mockResolvedValue('https://storage.example.com/image.jpg'),
  deleteObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

import {
  getProductById,
  getProductsPaginated,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getActiveProducts,
  searchProducts,
} from '../productService';

beforeEach(() => {
  vi.clearAllMocks();
});

function createMockProduct(overrides: Record<string, unknown> = {}) {
  return {
    name: { en: 'Ezer Water Filter', es: '', pt: '', ko: '' },
    brand: 'Selvacore',
    category: 'water-filters',
    active: true,
    images: ['https://example.com/img1.jpg'],
    createdAt: createMockTimestamp(new Date('2026-01-01')),
    updatedAt: createMockTimestamp(new Date('2026-01-01')),
    ...overrides,
  };
}

function makeMockProductDocs(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `prod-${i}`,
    data: () => createMockProduct({
      name: { en: `Product ${i}`, es: '', pt: '', ko: '' },
      createdAt: createMockTimestamp(new Date(2026, 0, count - i)),
    }),
  }));
}

describe('getProductById', () => {
  it('returns product when found', async () => {
    const productData = createMockProduct();
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('prod-1', productData));

    const result = await getProductById('prod-1');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('prod-1');
  });

  it('returns null when product not found', async () => {
    mockGetDoc.mockResolvedValueOnce(createMockDocSnapshot('prod-x', {}, false));

    const result = await getProductById('prod-x');

    expect(result).toBeNull();
  });
});

describe('getProductsPaginated', () => {
  it('returns items with hasMore=false when results fit in one page', async () => {
    const docs = makeMockProductDocs(3);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getProductsPaginated(10);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBe(docs[2]);
  });

  it('returns hasMore=true when more docs exist', async () => {
    const docs = makeMockProductDocs(4);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getProductsPaginated(3);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(true);
  });

  it('returns empty result when no products', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getProductsPaginated(10);

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.lastDoc).toBeNull();
  });
});

describe('createProduct', () => {
  it('creates product and returns id', async () => {
    const productData = {
      name: { en: 'New Product', es: '', pt: '', ko: '' },
      brand: 'Selvacore',
      category: 'water-filters',
      active: true,
      images: [],
    };

    const id = await createProduct(productData as never);

    expect(id).toBe('new-product-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const addedData = mockAddDoc.mock.calls[0][1];
    expect(addedData.name.en).toBe('New Product');
    expect(addedData.createdAt).toEqual(mockNow);
    expect(addedData.updatedAt).toEqual(mockNow);
  });
});

describe('updateProduct', () => {
  it('updates product with new data and sets updatedAt', async () => {
    await updateProduct('prod-1', { brand: 'NewBrand' } as never);

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const updateData = mockUpdateDoc.mock.calls[0][1];
    expect(updateData.brand).toBe('NewBrand');
    expect(updateData.updatedAt).toEqual(mockNow);
  });
});

describe('deleteProduct', () => {
  it('deletes the product document', async () => {
    await deleteProduct('prod-1');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

describe('getAllProducts', () => {
  it('returns all products sorted by createdAt descending', async () => {
    const docs = [
      {
        id: 'prod-old',
        data: () => createMockProduct({
          name: { en: 'Old', es: '', pt: '', ko: '' },
          createdAt: createMockTimestamp(new Date('2025-01-01')),
        }),
      },
      {
        id: 'prod-new',
        data: () => createMockProduct({
          name: { en: 'New', es: '', pt: '', ko: '' },
          createdAt: createMockTimestamp(new Date('2026-06-01')),
        }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getAllProducts();

    expect(result).toHaveLength(2);
    // Newest first
    expect(result[0].id).toBe('prod-new');
    expect(result[1].id).toBe('prod-old');
  });

  it('returns empty array when no products', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });

    const result = await getAllProducts();

    expect(result).toHaveLength(0);
  });
});

describe('getActiveProducts', () => {
  it('returns only active products sorted by createdAt', async () => {
    const docs = makeMockProductDocs(2);
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await getActiveProducts();

    expect(result).toHaveLength(2);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});

describe('searchProducts', () => {
  it('filters products by name match', async () => {
    const docs = [
      {
        id: 'prod-1',
        data: () => createMockProduct({
          name: { en: 'Ezer Water Filter', es: '', pt: '', ko: '' },
          brand: 'Selvacore',
          category: 'water-filters',
        }),
      },
      {
        id: 'prod-2',
        data: () => createMockProduct({
          name: { en: 'Carbon Cartridge', es: '', pt: '', ko: '' },
          brand: 'FilterCo',
          category: 'cartridges',
        }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await searchProducts('ezer');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('prod-1');
  });

  it('filters products by brand match', async () => {
    const docs = [
      {
        id: 'prod-1',
        data: () => createMockProduct({ brand: 'Selvacore', category: 'filters' }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await searchProducts('selvacore');

    expect(result).toHaveLength(1);
  });

  it('returns empty when no match', async () => {
    const docs = [
      {
        id: 'prod-1',
        data: () => createMockProduct({ brand: 'Selvacore', category: 'filters' }),
      },
    ];
    mockGetDocs.mockResolvedValueOnce({ docs });

    const result = await searchProducts('xyz-nonexistent');

    expect(result).toHaveLength(0);
  });
});
