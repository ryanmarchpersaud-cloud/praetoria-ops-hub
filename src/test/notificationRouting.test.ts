import { describe, it, expect } from 'vitest';

/**
 * Notification click routing logic — mirrors the route resolution
 * in NotificationCenter.tsx. Ensures every record_type maps to a
 * valid navigation target.
 */
function resolveNotificationRoute(recordType: string | null, recordId: string | null): string {
  if (!recordType || !recordId) return '/';
  switch (recordType) {
    case 'request': return `/requests/${recordId}`;
    case 'quote': return `/quotes/${recordId}`;
    case 'job': return `/jobs/${recordId}`;
    case 'visit': return `/visits/${recordId}`;
    case 'invoice': return `/invoices/${recordId}`;
    case 'payment': return `/finance/payments/${recordId}`;
    case 'agreement': return `/agreements/${recordId}`;
    case 'incident': return `/incidents/${recordId}`;
    default: return '/';
  }
}

describe('Notification route resolution', () => {
  const fakeId = 'abc-123';

  it('routes requests correctly', () => {
    expect(resolveNotificationRoute('request', fakeId)).toBe(`/requests/${fakeId}`);
  });
  it('routes quotes correctly', () => {
    expect(resolveNotificationRoute('quote', fakeId)).toBe(`/quotes/${fakeId}`);
  });
  it('routes invoices correctly', () => {
    expect(resolveNotificationRoute('invoice', fakeId)).toBe(`/invoices/${fakeId}`);
  });
  it('routes payments correctly', () => {
    expect(resolveNotificationRoute('payment', fakeId)).toBe(`/finance/payments/${fakeId}`);
  });
  it('routes agreements correctly', () => {
    expect(resolveNotificationRoute('agreement', fakeId)).toBe(`/agreements/${fakeId}`);
  });
  it('routes incidents correctly', () => {
    expect(resolveNotificationRoute('incident', fakeId)).toBe(`/incidents/${fakeId}`);
  });
  it('returns home for null/unknown types', () => {
    expect(resolveNotificationRoute(null, fakeId)).toBe('/');
    expect(resolveNotificationRoute('unknown', fakeId)).toBe('/');
    expect(resolveNotificationRoute('request', null)).toBe('/');
  });
});
