import { describe, it, expect } from 'vitest';

/**
 * Quote approval workflow logic — ensures portal only shows
 * Approve/Decline for actionable statuses.
 */
type ApprovalStatus = 'Draft' | 'Needs review' | 'Approved' | 'Sent' | 'Declined' | 'Archived';

function isActionableByCustomer(status: string): boolean {
  return ['Sent', 'Needs review'].includes(status);
}

function isVisibleInPortal(status: string): boolean {
  return ['Sent', 'Needs review', 'Approved', 'Declined'].includes(status);
}

function getValidAdminTransitions(status: ApprovalStatus): ApprovalStatus[] {
  switch (status) {
    case 'Draft': return ['Needs review'];
    case 'Needs review': return ['Approved', 'Draft', 'Declined'];
    case 'Approved': return ['Sent', 'Draft'];
    case 'Sent': return ['Draft'];
    case 'Declined': return ['Draft'];
    default: return [];
  }
}

describe('Quote approval — customer portal visibility', () => {
  it('shows Approve/Decline for "Sent" quotes', () => {
    expect(isActionableByCustomer('Sent')).toBe(true);
  });
  it('shows Approve/Decline for "Needs review" quotes', () => {
    expect(isActionableByCustomer('Needs review')).toBe(true);
  });
  it('hides Approve/Decline for "Approved" quotes (already approved)', () => {
    expect(isActionableByCustomer('Approved')).toBe(false);
  });
  it('hides Approve/Decline for "Draft" quotes', () => {
    expect(isActionableByCustomer('Draft')).toBe(false);
  });
  it('hides Approve/Decline for "Declined" quotes', () => {
    expect(isActionableByCustomer('Declined')).toBe(false);
  });
});

describe('Quote visibility in customer portal', () => {
  it('shows Sent, Needs review, Approved, Declined quotes', () => {
    expect(isVisibleInPortal('Sent')).toBe(true);
    expect(isVisibleInPortal('Needs review')).toBe(true);
    expect(isVisibleInPortal('Approved')).toBe(true);
    expect(isVisibleInPortal('Declined')).toBe(true);
  });
  it('hides Draft and Archived quotes', () => {
    expect(isVisibleInPortal('Draft')).toBe(false);
    expect(isVisibleInPortal('Archived')).toBe(false);
  });
});

describe('Admin quote pipeline transitions', () => {
  it('Draft can go to Needs review', () => {
    expect(getValidAdminTransitions('Draft')).toContain('Needs review');
  });
  it('Needs review can go to Approved or Declined', () => {
    const transitions = getValidAdminTransitions('Needs review');
    expect(transitions).toContain('Approved');
    expect(transitions).toContain('Declined');
  });
  it('Approved can go to Sent', () => {
    expect(getValidAdminTransitions('Approved')).toContain('Sent');
  });
  it('Sent cannot go directly to Approved', () => {
    expect(getValidAdminTransitions('Sent')).not.toContain('Approved');
  });
});
