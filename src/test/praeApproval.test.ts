// Phase 1E / 1E.1 — approval security tests. Synthetic data only.
import { describe, it, expect } from 'vitest';
import {
  APPROVER_ROLES,
  CONTENT_HASH_VERSION,
  DEFAULT_TTL_MINUTES,
  MAX_TTL_MINUTES,
  appendAudit,
  canExecuteApproved,
  canonicalizeAction,
  constantTimeEqual,
  createApproval,
  decideApproval,
  hashAction,
  hashNonce,
  invalidateOnEdit,
  isValidTtlMinutes,
  smsSegments,
  PRAE_EXECUTION_ENABLED,
  type ApprovalRequest,
  type Approver,
  type AuditEntry,
  type BoundStorageObject,
  type ProposedAction,
  type ProposedEmail,
  type ProposedSms,
} from '../../supabase/functions/_shared/prae/approvalModel.ts';
import {
  PRAE_ACTIVITY_DEMO,
  PRAE_TABS,
  filterPraeItems,
} from '../components/prae/praeActivityDemo';

const NOW = new Date('2026-09-03T12:00:00.000Z');

type Failure = Extract<Awaited<ReturnType<typeof decideApproval>>, { ok: false }>;
const asFail = (r: Awaited<ReturnType<typeof decideApproval>>) => r as Failure;
const last = <T,>(a: readonly T[]) => a[a.length - 1];

const attachment: BoundStorageObject = {
  storageObjectId: 'obj-1',
  storageObjectVersion: 'v1',
  filename: 'notice.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  sha256: 'a'.repeat(64),
};

const emailAction: ProposedEmail = {
  channel: 'email',
  from: 'staging@example.com',
  to: ['sample.customer@example.com'],
  cc: ['dispatch@example.com'],
  subject: 'Demo subject',
  body: 'Demo body',
  attachments: [attachment],
};

const smsAction: ProposedSms = {
  channel: 'sms',
  fromNumber: '+15550100',
  toNumber: '+15550142',
  body: 'Demo sms. Reply STOP to opt out.',
  media: [],
};

const owner: Approver = { userId: 'u-owner', role: 'owner', divisions: ['Snow & Ice'] };

async function pending(division = 'Snow & Ice', action: ProposedAction = emailAction) {
  return await createApproval({ id: 'ap-1', action, division, now: NOW });
}

describe('prae approval — nonce secrecy', () => {
  it('never stores the raw nonce on the approval record', async () => {
    const { approval, nonce } = await pending();
    const serialized = JSON.stringify(approval);
    expect(serialized).not.toContain(nonce);
    expect((approval as unknown as Record<string, unknown>).nonce).toBeUndefined();
    expect(approval.nonceDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(approval.nonceDigest).toBe(await hashNonce(nonce));
  });

  it('never writes the raw nonce into any audit entry', async () => {
    const { approval, audit, nonce } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(JSON.stringify(r.audit)).not.toContain(nonce);
    expect(JSON.stringify(r.approval)).not.toContain(nonce);
  });

  it('issues a fresh high-entropy nonce per approval', async () => {
    const a = await pending();
    const b = await pending();
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.nonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it('compares digests in constant time (full-length, no early exit)', () => {
    const src = constantTimeEqual.toString();
    expect(src).not.toMatch(/return\s+false;?\s*}?\s*$/m);
    expect(src).toContain('|=');
    expect(constantTimeEqual('a'.repeat(64), 'a'.repeat(64))).toBe(true);
    expect(constantTimeEqual('a'.repeat(64), 'b' + 'a'.repeat(63))).toBe(false);
    expect(constantTimeEqual('a'.repeat(64), 'a'.repeat(63) + 'b')).toBe(false);
    expect(constantTimeEqual('a'.repeat(64), 'a'.repeat(63))).toBe(false);
  });
});

describe('prae approval — content binding', () => {
  it('uses a versioned canonical format', async () => {
    expect(CONTENT_HASH_VERSION).toBe(2);
    expect(canonicalizeAction(emailAction)).toContain('prae.v2');
    const { approval } = await pending();
    expect(approval.contentHashVersion).toBe(2);
  });

  it('binds every email field', () => {
    const c = canonicalizeAction(emailAction);
    for (const part of ['email', 'staging@example.com', 'sample.customer@example.com',
      'dispatch@example.com', 'Demo subject', 'Demo body', 'obj-1', 'v1', 'notice.pdf',
      'application/pdf', '1024', 'a'.repeat(64)]) {
      expect(c).toContain(part);
    }
  });

  it('binds every sms field including media identity', () => {
    const withMedia: ProposedSms = { ...smsAction, media: [attachment] };
    const c = canonicalizeAction(withMedia);
    for (const part of ['sms', '+15550100', '+15550142', 'Reply STOP', 'obj-1', 'v1',
      'application/pdf', '1024', 'a'.repeat(64)]) {
      expect(c).toContain(part);
    }
  });

  it.each([
    ['subject', { subject: 'Changed' }],
    ['body', { body: 'Demo body (edited)' }],
    ['to', { to: ['someone.else@example.com'] }],
    ['cc', { cc: [] }],
    ['from', { from: 'other@example.com' }],
  ])('a changed %s produces a different hash', async (_label, patch) => {
    const before = await hashAction(emailAction);
    const after = await hashAction({ ...emailAction, ...patch } as ProposedEmail);
    expect(after).not.toBe(before);
  });

  it('detects an attachment swapped for a different file with the same name and size', async () => {
    const before = await hashAction(emailAction);
    const swapped: ProposedEmail = {
      ...emailAction,
      attachments: [{ ...attachment, storageObjectVersion: 'v2', sha256: 'b'.repeat(64) }],
    };
    expect(await hashAction(swapped)).not.toBe(before);
  });

  it('detects a media object swapped for a different file with the same name and size', async () => {
    const original: ProposedSms = { ...smsAction, media: [attachment] };
    const swapped: ProposedSms = {
      ...smsAction,
      media: [{ ...attachment, storageObjectVersion: 'v2', sha256: 'c'.repeat(64) }],
    };
    expect(await hashAction(swapped)).not.toBe(await hashAction(original));
  });
});

describe('prae approval — expiration bounds', () => {
  it('defaults to 15 minutes and caps at 60', async () => {
    expect(DEFAULT_TTL_MINUTES).toBe(15);
    expect(MAX_TTL_MINUTES).toBe(60);
    const { approval } = await pending();
    expect(Date.parse(approval.expiresAt) - Date.parse(approval.createdAt)).toBe(15 * 60_000);
  });

  it.each([0, -1, -15, 1.5, 61, 1440, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid ttl %s',
    async (ttl) => {
      expect(isValidTtlMinutes(ttl)).toBe(false);
      await expect(
        createApproval({ id: 'ap-x', action: emailAction, division: 'Snow & Ice', now: NOW, ttlMinutes: ttl }),
      ).rejects.toThrow(/invalid_ttl/);
    },
  );

  it.each([1, 15, 59, 60])('accepts valid ttl %s', (ttl) => {
    expect(isValidTtlMinutes(ttl)).toBe(true);
  });

  it('accepts a decision one second before expiry and rejects it at the boundary', async () => {
    const { approval, audit, nonce } = await pending();
    const justInTime = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce, approver: owner,
      decision: 'approve', now: new Date(Date.parse(approval.expiresAt) - 1000), emergencyStop: false,
    });
    expect(justInTime.ok).toBe(true);

    const atBoundary = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce, approver: owner,
      decision: 'approve', now: new Date(Date.parse(approval.expiresAt)), emergencyStop: false,
    });
    expect(atBoundary.ok).toBe(false);
    expect(asFail(atBoundary).reason).toBe('expired');
    expect(asFail(atBoundary).approval.state).toBe('expired');
  });
});

describe('prae approval — decisions', () => {
  it('approves a valid, in-window, in-division request', async () => {
    const { approval, audit, nonce } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.approval.state).toBe('approved');
    expect(r.approval.nonceUsed).toBe(true);
    expect(r.approval.decidedByUserId).toBe('u-owner');
    expect(last(r.audit).event).toBe('approved');
  });

  it('rejects replay of a used approval', async () => {
    const { approval, audit, nonce } = await pending();
    const first = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(first.ok).toBe(true);
    const replay = await decideApproval({
      approval: first.approval, audit: first.audit, action: emailAction,
      presentedNonce: nonce, approver: owner, decision: 'approve',
      now: NOW, emergencyStop: false,
    });
    expect(replay.ok).toBe(false);
    expect(asFail(replay).reason).toBe('nonce_already_used');
    expect(last(replay.audit).event).toBe('replay_rejected');
  });

  it('two simultaneous attempts yield exactly one accepted decision', async () => {
    const { approval, audit, nonce } = await pending();
    // Serialised store standing in for the single-row database transaction.
    let record: ApprovalRequest = approval;
    let history: AuditEntry[] = [...audit];
    const attempt = async () => {
      const r = await decideApproval({
        approval: record, audit: history, action: emailAction, presentedNonce: nonce,
        approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
      });
      record = r.approval;
      history = r.audit;
      return r;
    };
    const results = [await attempt(), await attempt()];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(1);
    expect(asFail(results[1]).reason).toBe('nonce_already_used');
    expect(record.state).toBe('approved');
  });

  it('rejects a mismatched nonce', async () => {
    const { approval, audit } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: 'not-the-nonce',
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    expect(asFail(r).reason).toBe('nonce_mismatch');
  });

  it('invalidates the approval when the content changed', async () => {
    const { approval, audit, nonce } = await pending();
    const edited: ProposedEmail = { ...emailAction, body: 'Demo body (edited)' };
    const r = await decideApproval({
      approval, audit, action: edited, presentedNonce: nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    expect(asFail(r).reason).toBe('content_changed');
    expect(asFail(r).approval.state).toBe('invalidated');
    expect(last(r.audit).event).toBe('invalidated_by_edit');
  });

  it('invalidates when an attachment is replaced with the same filename and size', async () => {
    const { approval, audit, nonce } = await pending();
    const swapped: ProposedEmail = {
      ...emailAction,
      attachments: [{ ...attachment, storageObjectVersion: 'v2', sha256: 'd'.repeat(64) }],
    };
    const r = await decideApproval({
      approval, audit, action: swapped, presentedNonce: nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    expect(asFail(r).reason).toBe('content_changed');
  });

  it('an explicit edit invalidates a prior approval', async () => {
    const { approval, audit } = await pending();
    const out = invalidateOnEdit(approval, audit, NOW);
    expect(out.approval.state).toBe('invalidated');
    expect(out.approval.nonceUsed).toBe(true);
  });
});

describe('prae approval — role and division isolation', () => {
  it('permits only owner and admin during Phase 1E.1', () => {
    expect([...APPROVER_ROLES]).toEqual(['owner', 'admin']);
  });

  it.each(['owner', 'admin'])('allows %s', async (role) => {
    const { approval, audit, nonce } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: { userId: 'u-1', role, divisions: ['Snow & Ice'] },
      decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(true);
  });

  it.each([
    'manager', 'ops_manager', 'supervisor', 'dispatcher', 'staff', 'accountant',
    'hr_admin', 'customer', 'subcontractor', 'tenant', 'property_owner',
    'property_manager', 'leasing_agent', 'lead_worker', '', 'OWNER',
  ])('rejects unauthorized role %s', async (role) => {
    const { approval, audit, nonce } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: { userId: 'u-x', role, divisions: ['Snow & Ice'] },
      decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    expect(asFail(r).reason).toBe('role_not_permitted');
    // Phase 1E.2: authorization precedes any audit write — no entry is added.
    expect(r.audit).toEqual(audit);
  });

  it('rejects a cross-division approval attempt without writing audit', async () => {
    const { approval, audit, nonce } = await pending('Snow & Ice');
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: { userId: 'u-a', role: 'admin', divisions: ['Junk Removal'] },
      decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    expect(asFail(r).reason).toBe('division_not_permitted');
    expect(r.audit).toEqual(audit);
  });

  it('an out-of-division caller cannot mint an emergency-stop audit entry', async () => {
    const { approval, audit, nonce } = await pending('Snow & Ice');
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: { userId: 'u-a', role: 'admin', divisions: ['Junk Removal'] },
      decision: 'approve', now: NOW, emergencyStop: true,
    });
    expect(asFail(r).reason).toBe('division_not_permitted');
    expect(r.audit).toEqual(audit);
  });

});

describe('prae approval — emergency stop and execution gate', () => {
  it('global emergency stop blocks every decision', async () => {
    const { approval, audit, nonce } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: true,
    });
    expect(r.ok).toBe(false);
    expect(asFail(r).reason).toBe('emergency_stop_active');
    expect(last(r.audit).event).toBe('emergency_stop_rejected');
  });

  it('execution stays disabled even for an approved request', async () => {
    expect(PRAE_EXECUTION_ENABLED).toBe(false);
    const { approval } = await pending();
    expect(canExecuteApproved({ ...approval, state: 'approved' }).allowed).toBe(false);
  });
});

describe('prae approval — append-only audit', () => {
  it('never mutates or drops prior entries', () => {
    const a1 = appendAudit([], { at: NOW.toISOString(), event: 'created', actorUserId: null, actorRole: null, detail: 'x' });
    const a2 = appendAudit(a1, { at: NOW.toISOString(), event: 'approved', actorUserId: 'u', actorRole: 'owner', detail: 'y' });
    expect(a1).toHaveLength(1);
    expect(a2).toHaveLength(2);
    expect(a2[0]).toEqual(a1[0]);
  });

  it('preserves the full trail across a rejected then replayed decision', async () => {
    const { approval, audit, nonce } = await pending();
    const first = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: nonce,
      approver: owner, decision: 'reject', now: NOW, emergencyStop: false,
    });
    const replay = await decideApproval({
      approval: first.approval, audit: first.audit, action: emailAction, presentedNonce: nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(replay.audit.slice(0, first.audit.length)).toEqual(first.audit);
    expect(replay.audit.length).toBe(first.audit.length + 1);
  });
});

describe('prae approval — SMS segmentation accuracy', () => {
  it('counts GSM-7 basic characters', () => {
    const s = smsSegments('a'.repeat(160));
    expect(s.encoding).toBe('GSM-7');
    expect(s.units).toBe(160);
    expect(s.segments).toBe(1);
    expect(smsSegments('a'.repeat(161)).segments).toBe(2);
  });

  it('charges GSM-7 extension characters two units', () => {
    const s = smsSegments('{}');
    expect(s.encoding).toBe('GSM-7');
    expect(s.units).toBe(4);
    expect(s.chars).toBe(2);
    expect(smsSegments('€'.repeat(80)).units).toBe(160);
    expect(smsSegments('€'.repeat(80)).segments).toBe(1);
    expect(smsSegments('€'.repeat(81)).segments).toBe(2);
  });

  it('switches to UCS-2 for non-GSM characters', () => {
    const s = smsSegments('日'.repeat(70));
    expect(s.encoding).toBe('UCS-2');
    expect(s.units).toBe(70);
    expect(s.segments).toBe(1);
    expect(smsSegments('日'.repeat(71)).segments).toBe(2);
  });

  it('counts an emoji as one character but two UCS-2 units', () => {
    const s = smsSegments('😀');
    expect(s.encoding).toBe('UCS-2');
    expect(s.chars).toBe(1);
    expect(s.units).toBe(2);
    expect(smsSegments('😀'.repeat(35)).segments).toBe(1);
    expect(smsSegments('😀'.repeat(36)).segments).toBe(2);
  });

  it('never splits a two-unit character across a segment boundary', () => {
    const s = smsSegments('😀'.repeat(100));
    expect(s.units).toBe(200);
    // 67-unit parts hold 33 emoji (66 units) each.
    expect(s.segments).toBe(Math.ceil(100 / 33));
  });

  it('returns zero segments for an empty body', () => {
    expect(smsSegments('').segments).toBe(0);
  });
});

describe('prae demo data safety', () => {
  it('uses only synthetic addresses and reserved numbers', () => {
    const blob = JSON.stringify(PRAE_ACTIVITY_DEMO);
    expect(blob).not.toContain('praetoriagroup.ca');
    for (const m of blob.match(/[\w.+-]+@[\w.-]+/g) ?? []) {
      expect(m.endsWith('@example.com')).toBe(true);
    }
    for (const m of blob.match(/\+1\d+/g) ?? []) {
      expect(m.startsWith('+1555')).toBe(true);
    }
  });

  it('every tab filter is total and approval items are flagged', () => {
    const seen = new Set<string>();
    for (const t of PRAE_TABS) filterPraeItems(PRAE_ACTIVITY_DEMO, t.id).forEach((i) => seen.add(i.id));
    expect(seen.size).toBe(PRAE_ACTIVITY_DEMO.length);
    expect(filterPraeItems(PRAE_ACTIVITY_DEMO, 'needs_approval').every((i) => i.approvalRequired)).toBe(true);
  });

  it('estimates SMS segments for the demo message', () => {
    const sms = PRAE_ACTIVITY_DEMO.find((i) => i.proposal?.channel === 'sms')!;
    const p = sms.proposal as { body: string };
    const s = smsSegments(p.body);
    expect(s.segments).toBeGreaterThanOrEqual(1);
    expect(/STOP/i.test(p.body)).toBe(true);
  });
});
