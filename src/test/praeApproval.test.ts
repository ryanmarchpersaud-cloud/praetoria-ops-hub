// Phase 1E — approval security foundation tests. Synthetic data only.
import { describe, it, expect } from 'vitest';
import {
  APPROVER_ROLES,
  appendAudit,
  canExecuteApproved,
  createApproval,
  decideApproval,
  hashAction,
  invalidateOnEdit,
  isExpired,
  smsSegments,
  PRAE_EXECUTION_ENABLED,
  type Approver,
  type ProposedAction,
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

const emailAction: ProposedAction = {
  channel: 'email',
  from: 'staging@example.com',
  to: ['sample.customer@example.com'],
  subject: 'Demo subject',
  body: 'Demo body',
  attachments: [],
};

const owner: Approver = { userId: 'u-owner', role: 'owner', divisions: ['Snow & Ice'] };

async function pending(division = 'Snow & Ice') {
  return createApproval({ id: 'a1', action: emailAction, division, now: NOW });
}

describe('prae approval — creation and binding', () => {
  it('binds a content hash and a fresh single-use nonce', async () => {
    const { approval } = await pending();
    expect(approval.state).toBe('pending');
    expect(approval.nonceUsed).toBe(false);
    expect(approval.contentHash).toHaveLength(64);
    expect(approval.contentHash).toBe(await hashAction(emailAction));
    const second = await pending();
    expect(second.approval.nonce).not.toBe(approval.nonce);
  });

  it('expires after the TTL', async () => {
    const { approval } = await pending();
    expect(isExpired(approval, NOW)).toBe(false);
    expect(isExpired(approval, new Date(NOW.getTime() + 16 * 60_000))).toBe(true);
  });
});

describe('prae approval — decisions', () => {
  it('approves a valid, in-window, in-division request', async () => {
    const { approval, audit } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: approval.nonce,
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
    const { approval, audit } = await pending();
    const first = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: approval.nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(first.ok).toBe(true);
    const replay = await decideApproval({
      approval: first.approval, audit: first.audit, action: emailAction,
      presentedNonce: approval.nonce, approver: owner, decision: 'approve',
      now: NOW, emergencyStop: false,
    });
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(asFail(replay).reason).toBe('nonce_already_used');
    expect(last(replay.audit).event).toBe('replay_rejected');
  });

  it('rejects a mismatched nonce', async () => {
    const { approval, audit } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: 'not-the-nonce',
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(asFail(r).reason).toBe('nonce_mismatch');
  });

  it('rejects and expires a stale approval', async () => {
    const { approval, audit } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: approval.nonce,
      approver: owner, decision: 'approve', now: new Date(NOW.getTime() + 20 * 60_000),
      emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(asFail(r).reason).toBe('expired');
    expect(asFail(r).approval.state).toBe('expired');
  });

  it('invalidates the approval when the content changed', async () => {
    const { approval, audit } = await pending();
    const edited: ProposedAction = { ...emailAction, body: 'Demo body (edited)' };
    const r = await decideApproval({
      approval, audit, action: edited, presentedNonce: approval.nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(asFail(r).reason).toBe('content_changed');
    expect(asFail(r).approval.state).toBe('invalidated');
    expect(last(r.audit).event).toBe('invalidated_by_edit');
  });

  it('an explicit edit invalidates a prior approval', async () => {
    const { approval, audit } = await pending();
    const out = invalidateOnEdit(approval, audit, NOW);
    expect(asFail(out).approval.state).toBe('invalidated');
    expect(out.approval.nonceUsed).toBe(true);
  });
});

describe('prae approval — role and division isolation', () => {
  it.each(['staff', 'customer', 'subcontractor', 'tenant', 'worker'])(
    'rejects unauthorized role %s',
    async (role) => {
      const { approval, audit } = await pending();
      const r = await decideApproval({
        approval, audit, action: emailAction, presentedNonce: approval.nonce,
        approver: { userId: 'u-x', role, divisions: ['Snow & Ice'] },
        decision: 'approve', now: NOW, emergencyStop: false,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(asFail(r).reason).toBe('role_not_permitted');
    },
  );

  it('rejects a cross-division approval attempt', async () => {
    const { approval, audit } = await pending('Snow & Ice');
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: approval.nonce,
      approver: { userId: 'u-m', role: 'manager', divisions: ['Junk Removal'] },
      decision: 'approve', now: NOW, emergencyStop: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(asFail(r).reason).toBe('division_not_permitted');
  });

  it('permits only the documented approver roles', () => {
    expect([...APPROVER_ROLES]).toEqual(['owner', 'admin', 'manager', 'ops_manager']);
  });
});

describe('prae approval — emergency stop and execution gate', () => {
  it('global emergency stop blocks every decision', async () => {
    const { approval, audit } = await pending();
    const r = await decideApproval({
      approval, audit, action: emailAction, presentedNonce: approval.nonce,
      approver: owner, decision: 'approve', now: NOW, emergencyStop: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
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
