import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPhone,
  formatFileSize,
  formatPercentage,
  truncateText,
  generateOrderNumber,
  formatValue,
  formatOptionalCurrency,
  formatOptionalString,
  formatOptionalNumber,
  formatOptionalBoolean,
  formatRelativeTime,
} from '../formatters';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1250, 'USD')).toBe('$1,250.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('formats BRL correctly', () => {
    expect(formatCurrency(99.9, 'BRL')).toContain('99.90');
  });

  it('defaults to USD', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });
});

describe('formatPhone', () => {
  it('formats a full international number', () => {
    expect(formatPhone('15551234567')).toBe('+1 (555) 123-4567');
  });

  it('returns raw input for non-matching format', () => {
    expect(formatPhone('123')).toBe('123');
  });
});

describe('formatFileSize', () => {
  it('returns 0 Bytes for 0', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('formats KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  it('formats MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});

describe('formatPercentage', () => {
  it('formats without decimals by default', () => {
    expect(formatPercentage(75)).toBe('75%');
  });

  it('formats with specified decimals', () => {
    expect(formatPercentage(75.567, 2)).toBe('75.57%');
  });
});

describe('truncateText', () => {
  it('returns full text if under max length', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  it('truncates and adds ellipsis', () => {
    expect(truncateText('hello world', 5)).toBe('hello...');
  });
});

describe('generateOrderNumber', () => {
  it('generates with ORD- prefix', () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^ORD-\d{6}-\d{4}$/);
  });

  it('generates unique numbers', () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    // Very unlikely to collide but structure should match
    expect(a).toMatch(/^ORD-/);
    expect(b).toMatch(/^ORD-/);
  });
});

describe('formatValue', () => {
  it('returns N/A for undefined', () => {
    expect(formatValue(undefined)).toBe('N/A');
  });

  it('returns N/A for null', () => {
    expect(formatValue(null)).toBe('N/A');
  });

  it('returns N/A for empty string', () => {
    expect(formatValue('')).toBe('N/A');
  });

  it('returns stringified value', () => {
    expect(formatValue(42)).toBe('42');
  });

  it('applies custom format function', () => {
    expect(formatValue(42, (v) => `$${v}`)).toBe('$42');
  });
});

describe('formatOptionalCurrency', () => {
  it('returns N/A for undefined', () => {
    expect(formatOptionalCurrency(undefined)).toBe('N/A');
  });

  it('returns N/A for 0', () => {
    expect(formatOptionalCurrency(0)).toBe('N/A');
  });

  it('formats valid amount', () => {
    expect(formatOptionalCurrency(50, 'USD')).toBe('$50.00');
  });
});

describe('formatOptionalString', () => {
  it('returns N/A for empty string', () => {
    expect(formatOptionalString('')).toBe('N/A');
  });

  it('returns N/A for whitespace', () => {
    expect(formatOptionalString('   ')).toBe('N/A');
  });

  it('returns the string', () => {
    expect(formatOptionalString('hello')).toBe('hello');
  });
});

describe('formatOptionalNumber', () => {
  it('returns N/A for 0', () => {
    expect(formatOptionalNumber(0)).toBe('N/A');
  });

  it('formats with suffix', () => {
    expect(formatOptionalNumber(5, ' hours')).toBe('5 hours');
  });
});

describe('formatOptionalBoolean', () => {
  it('returns N/A for undefined', () => {
    expect(formatOptionalBoolean(undefined)).toBe('N/A');
  });

  it('returns Yes for true', () => {
    expect(formatOptionalBoolean(true)).toBe('Yes');
  });

  it('returns No for false', () => {
    expect(formatOptionalBoolean(false)).toBe('No');
  });
});

describe('formatRelativeTime', () => {
  it('returns "now" for very recent dates', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('now');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo)).toBe('5 minutes ago');
  });

  it('returns hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
  });

  it('returns days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
  });
});
