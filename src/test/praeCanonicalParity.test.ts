/**
 * Phase 1E.2 — TypeScript / PostgreSQL canonicalisation parity, plus strict
 * binding validation. Pure and synthetic: no I/O, nothing sent or executed.
 */
import { describe, it, expect } from 'vitest';
import {
  BindingError,
  canonicalizeAction,
  createApproval,
  decideApproval,
  applyEdit,
  hashAction,
  validateBinding,
  type Approver,
  type ProposedEmail,
} from '../../supabase/functions/_shared/prae/approvalModel.ts';
import { CANONICAL_FIXTURES } from '../../supabase/functions/_shared/prae/canonicalFixtures.ts';

const NOW = new Date('2026-09-04T00:00:00.000Z');
const owner: Approver = { userId: 'u-owner', role: 'owner', divisions: ['Snow & Ice'] };

describe('canonicalisation parity (TypeScript vs PostgreSQL)', () => {
  it.each(CANONICAL_FIXTURES)('$name canonical string matches the database', (f) => {
    expect(canonicalizeAction(f.action)).toBe(f.canonical);
  });

  it.each(CANONICAL_FIXTURES)('$name hash matches the database', async (f) => {
    expect(await hashAction(f.action)).toBe(f.hash);
  });

  it('every fixture hash is a distinct 64-hex digest', () => {
    const hashes = CANONICAL_FIXTURES.map((f) => f.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
    hashes.forEach((h) => expect(h).toMatch(/^[0-9a-f]{64}$/));
  });
});

describe('strict binding validation', () => {
  it('rejects a null or non-object binding', () => {
    for (const bad of [null, undefined, 'x', 7, []]) {
      expect(() => validateBinding(bad)).toThrow(BindingError);
    }
  });

  it('rejects an unknown channel', () => {
    expect(() => validateBinding({ channel: 'whatsapp' })).toThrow(/unknown channel/);
  });

  it('rejects unknown top-level fields', () => {
    expect(() =>
      validateBinding({ ...CANONICAL_FIXTURES[0].action, sendAt: 'now' }),
    ).toThrow(/unknown field sendAt/);
  });

  it('rejects missing required fields', () => {
    expect(() => validateBinding({ channel: 'email', to: [], attachments: [] })).toThrow(
      BindingError,
    );
    expect(() => validateBinding({ channel: 'sms', body: 'x', media: [] })).toThrow(BindingError);
  });

  it('rejects a missing attachment list', () => {
    expect(() =>
      validateBinding({
        channel: 'email',
        from: 'a@b.ca',
        to: ['c@d.ca'],
        subject: 's',
        body: 'b',
      }),
    ).toThrow(/attachments must be an array/);
  });

  it('rejects malformed attachment entries', () => {
    const base = {
      channel: 'email',
      from: 'a@b.ca',
      to: ['c@d.ca'],
      subject: 's',
      body: 'b',
    };
    const good = {
      storageObjectId: 'o',
      storageObjectVersion: 'v',
      filename: 'f',
      mimeType: 'application/pdf',
      sizeBytes: 1,
      sha256: 'a'.repeat(64),
    };
    expect(() => validateBinding({ ...base, attachments: [{ ...good, extra: 1 }] })).toThrow(
      /unknown field extra/,
    );
    const { sha256: _drop, ...missing } = good;
    expect(() => validateBinding({ ...base, attachments: [missing] })).toThrow(BindingError);
    expect(() =>
      validateBinding({ ...base, attachments: [{ ...good, sizeBytes: 1.5 }] }),
    ).toThrow(/sizeBytes/);
    expect(() => validateBinding({ ...base, attachments: [{ ...good, sha256: 'zz' }] })).toThrow(
      /sha256/,
    );
  });
});

describe('server-authoritative binding', () => {
  it('the caller cannot choose or smuggle in the stored content hash', async () => {
    const action = CANONICAL_FIXTURES[0].action;
    // a caller-supplied hash is not part of the API surface at all
    await expect(
      createApproval({
        id: 'ap-0',
        action: { ...action, ...({ contentHash: 'f'.repeat(64) } as object) } as typeof action,
        division: 'Snow & Ice',
        now: NOW,
      }),
    ).rejects.toThrow(/unknown field contentHash/);
    // and the stored hash is always the server-computed hash of the canonical form
    const { approval } = await createApproval({
      id: 'ap-1',
      action,
      division: 'Snow & Ice',
      now: NOW,
    });
    expect(approval.contentHash).toBe(CANONICAL_FIXTURES[0].hash);
  });

  it('rejects creation from an invalid binding', async () => {
    await expect(
      createApproval({
        id: 'ap-bad',
        action: { channel: 'email' } as never,
        division: 'Snow & Ice',
        now: NOW,
      }),
    ).rejects.toThrow(BindingError);
  });

  it('stores an immutable binding that the decision recomputes from', async () => {
    const { approval, nonce, audit } = await createApproval({
      id: 'ap-2',
      action: CANONICAL_FIXTURES[0].action,
      division: 'Snow & Ice',
      now: NOW,
    });
    expect(approval.contentBinding).toEqual(validateBinding(CANONICAL_FIXTURES[0].action));
    const r = await decideApproval({
      approval,
      audit,
      presentedNonce: nonce,
      approver: owner,
      decision: 'approve',
      now: NOW,
      emergencyStop: false,
    });
    expect(r.ok).toBe(true);
  });

  it('invalidates when the stored hash no longer matches the stored binding', async () => {
    const { approval, nonce, audit } = await createApproval({
      id: 'ap-3',
      action: CANONICAL_FIXTURES[0].action,
      division: 'Snow & Ice',
      now: NOW,
    });
    const tampered = { ...approval, contentHash: 'b'.repeat(64) };
    const r = await decideApproval({
      approval: tampered,
      audit,
      presentedNonce: nonce,
      approver: owner,
      decision: 'approve',
      now: NOW,
      emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe('content_changed');
  });

  it('an edit creates a new approval with a new nonce and hash, never rewriting the old one', async () => {
    const original = CANONICAL_FIXTURES[0].action as ProposedEmail;
    const { approval, nonce, audit } = await createApproval({
      id: 'ap-4',
      action: original,
      division: 'Snow & Ice',
      now: NOW,
    });
    const out = await applyEdit({
      approval,
      audit,
      editedAction: { ...original, body: 'edited body' },
      newId: 'ap-5',
      now: NOW,
    });
    expect(out.invalidated.state).toBe('invalidated');
    expect(out.invalidated.nonceUsed).toBe(true);
    // the original record's bound content is untouched
    expect(out.invalidated.contentBinding).toEqual(approval.contentBinding);
    expect(out.invalidated.contentHash).toBe(approval.contentHash);
    expect(out.replacement.id).toBe('ap-5');
    expect(out.replacement.contentHash).not.toBe(approval.contentHash);
    expect(out.nonce).not.toBe(nonce);
    expect(out.replacement.state).toBe('pending');
    expect(out.audit.slice(0, audit.length)).toEqual(audit);
  });
});

describe('authorization ordering', () => {
  it('an unauthorized role produces zero audit rows and no state change', async () => {
    const { approval, nonce, audit } = await createApproval({
      id: 'ap-6',
      action: CANONICAL_FIXTURES[0].action,
      division: 'Snow & Ice',
      now: NOW,
    });
    const r = await decideApproval({
      approval,
      audit,
      presentedNonce: nonce,
      approver: { userId: 'u-x', role: 'manager', divisions: ['Snow & Ice'] },
      decision: 'approve',
      now: NOW,
      emergencyStop: true,
    });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toBe('role_not_permitted');
    // no audit entry appended, and nothing about the approval leaked/changed
    expect(r.audit).toEqual(audit);
    expect(r.approval.state).toBe('pending');
  });
});
