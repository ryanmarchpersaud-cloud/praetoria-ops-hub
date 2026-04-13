import { describe, it, expect } from 'vitest';

/**
 * Invoice number normalization logic — ensures placeholders like
 * "DRAFT" or "AUTO" are converted to empty strings so the DB trigger
 * can generate the next sequential number.
 */
function normalizeInvoiceNumber(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (['DRAFT', 'AUTO', ''].includes(trimmed.toUpperCase())) return '';
  return trimmed;
}

describe('Invoice number normalization', () => {
  it('converts "DRAFT" to empty string', () => {
    expect(normalizeInvoiceNumber('DRAFT')).toBe('');
  });
  it('converts "draft" (lowercase) to empty string', () => {
    expect(normalizeInvoiceNumber('draft')).toBe('');
  });
  it('converts "AUTO" to empty string', () => {
    expect(normalizeInvoiceNumber('AUTO')).toBe('');
  });
  it('converts null/undefined to empty string', () => {
    expect(normalizeInvoiceNumber(null)).toBe('');
    expect(normalizeInvoiceNumber(undefined)).toBe('');
  });
  it('preserves valid invoice numbers', () => {
    expect(normalizeInvoiceNumber('INV-00042')).toBe('INV-00042');
  });
  it('trims whitespace', () => {
    expect(normalizeInvoiceNumber('  DRAFT  ')).toBe('');
    expect(normalizeInvoiceNumber('  INV-00001  ')).toBe('INV-00001');
  });
});

describe('Invoice number regex pattern (mirrors DB trigger)', () => {
  const pattern = /^[A-Z]+-[0-9]+$/;

  it('matches valid sequences', () => {
    expect(pattern.test('INV-00001')).toBe(true);
    expect(pattern.test('INV-12345')).toBe(true);
    expect(pattern.test('PG-00001')).toBe(true);
  });
  it('rejects placeholders', () => {
    expect(pattern.test('DRAFT')).toBe(false);
    expect(pattern.test('AUTO')).toBe(false);
    expect(pattern.test('')).toBe(false);
  });
  it('rejects malformed numbers', () => {
    expect(pattern.test('INV-')).toBe(false);
    expect(pattern.test('-00001')).toBe(false);
    expect(pattern.test('inv-00001')).toBe(false); // lowercase
  });
});
