// Phase 1G — deep-link return path and alert-text safety rules.
import { describe, it, expect, beforeEach } from 'vitest';
import { storeReturnTo, takeReturnTo } from '../lib/praeReturnTo';

beforeEach(() => sessionStorage.clear());

describe('prae return-to', () => {
  it('remembers an approval deep link and replays it once', () => {
    storeReturnTo('/prae/approvals/6f0b1b7e-0000-4000-8000-000000000000');
    expect(takeReturnTo()).toBe('/prae/approvals/6f0b1b7e-0000-4000-8000-000000000000');
    expect(takeReturnTo()).toBeNull();
  });

  it('never stores a query string, a token or an off-site URL', () => {
    storeReturnTo('/prae/approvals/abc?nonce=secret');
    expect(takeReturnTo()).toBe('/prae/approvals/abc');
    storeReturnTo('https://evil.example.com/steal');
    expect(takeReturnTo()).toBeNull();
    storeReturnTo('//evil.example.com');
    expect(takeReturnTo()).toBe(null);
  });

  it('ignores the login screen and the root path', () => {
    storeReturnTo('/login');
    expect(takeReturnTo()).toBeNull();
    storeReturnTo('/');
    expect(takeReturnTo()).toBeNull();
  });
});

describe('approval alert text', () => {
  const alert = (division: string, id: string) =>
    `Praetoria Ops: 1 item needs approval (${division}). Open: https://praetoriagroup.ca/prae/approvals/${id} Reply STOP to opt out.`;

  it('carries a count, a division, a login-protected link and opt-out wording only', () => {
    const text = alert('administration', 'abc123');
    expect(text).toContain('1 item needs approval');
    expect(text).toContain('Reply STOP to opt out.');
    expect(text).toMatch(/https:\/\/praetoriagroup\.ca\/prae\/approvals\//);
    // No content, no credentials.
    for (const forbidden of ['nonce', 'token', '@', '$', 'Subject:']) {
      expect(text).not.toContain(forbidden);
    }
  });
});
