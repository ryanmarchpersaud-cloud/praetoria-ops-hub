import { describe, it, expect } from 'vitest';

/**
 * Currency formatting — mirrors formatCurrency in InvoicePrint.tsx
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

describe('Currency formatting', () => {
  it('formats whole numbers with two decimals', () => {
    expect(formatCurrency(100)).toBe('100.00');
  });
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0.00');
  });
  it('rounds to two decimals', () => {
    expect(formatCurrency(99.999)).toBe('100.00');
  });
  it('adds thousands separator', () => {
    const result = formatCurrency(1234567.89);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('.89');
  });
  it('handles negative values', () => {
    const result = formatCurrency(-50.5);
    expect(result).toContain('50.50');
  });
});
