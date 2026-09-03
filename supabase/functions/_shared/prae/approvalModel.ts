// Phase 1E — Prae approval security foundation.
//
// PURE MODEL ONLY. This module performs no I/O: no email, no SMS, no IMAP,
// no AI, no network. It is not wired to any sending path in this phase.
// It exists so approval security can be tested with synthetic data before any
// execution path is ever built.

export type PraeApprovalState =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'invalidated';

export type PraeChannel = 'email' | 'sms';

/** Roles allowed to approve at all. Everything else is rejected. */
export const APPROVER_ROLES = ['owner', 'admin', 'manager', 'ops_manager'] as const;
export type ApproverRole = (typeof APPROVER_ROLES)[number];

export type Approver = {
  userId: string;
  role: string;
  /** Divisions the approver is authorised for. */
  divisions: string[];
};

export type ProposedEmail = {
  channel: 'email';
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachments: { filename: string; sizeBytes: number }[];
};

export type ProposedSms = {
  channel: 'sms';
  fromNumber: string;
  toNumber: string;
  body: string;
  media: { url: string }[];
};

export type ProposedAction = ProposedEmail | ProposedSms;

export type ApprovalRequest = {
  id: string;
  nonce: string;
  contentHash: string;
  state: PraeApprovalState;
  division: string;
  expiresAt: string;
  createdAt: string;
  /** Set once a terminal decision is recorded. */
  decidedByUserId?: string;
  decidedByRole?: string;
  decidedAt?: string;
  nonceUsed: boolean;
};

export type AuditEntry = {
  at: string;
  event:
    | 'created'
    | 'approved'
    | 'rejected'
    | 'expired'
    | 'invalidated_by_edit'
    | 'replay_rejected'
    | 'unauthorized_rejected'
    | 'emergency_stop_rejected';
  actorUserId: string | null;
  actorRole: string | null;
  detail: string;
};

/** Append-only audit history: the only permitted mutation is appending. */
export function appendAudit(history: readonly AuditEntry[], entry: AuditEntry): AuditEntry[] {
  return [...history, entry];
}

/** Deterministic canonical serialisation of the exact proposed content. */
export function canonicalizeAction(action: ProposedAction): string {
  if (action.channel === 'email') {
    return JSON.stringify([
      'email',
      action.from.trim().toLowerCase(),
      action.to.map((t) => t.trim().toLowerCase()),
      (action.cc ?? []).map((t) => t.trim().toLowerCase()),
      action.subject,
      action.body,
      action.attachments.map((a) => [a.filename, a.sizeBytes]),
    ]);
  }
  return JSON.stringify([
    'sms',
    action.fromNumber.trim(),
    action.toNumber.trim(),
    action.body,
    action.media.map((m) => m.url),
  ]);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Cryptographic hash bound to the exact proposed content. */
export function hashAction(action: ProposedAction): Promise<string> {
  return sha256Hex(canonicalizeAction(action));
}

export function newNonce(): string {
  return crypto.randomUUID();
}

export const DEFAULT_TTL_MINUTES = 15;

export async function createApproval(params: {
  id: string;
  action: ProposedAction;
  division: string;
  now: Date;
  ttlMinutes?: number;
}): Promise<{ approval: ApprovalRequest; audit: AuditEntry[] }> {
  const ttl = params.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const approval: ApprovalRequest = {
    id: params.id,
    nonce: newNonce(),
    contentHash: await hashAction(params.action),
    state: 'pending',
    division: params.division,
    createdAt: params.now.toISOString(),
    expiresAt: new Date(params.now.getTime() + ttl * 60_000).toISOString(),
    nonceUsed: false,
  };
  return {
    approval,
    audit: appendAudit([], {
      at: approval.createdAt,
      event: 'created',
      actorUserId: null,
      actorRole: null,
      detail: `approval created for division ${params.division}`,
    }),
  };
}

export function isExpired(approval: ApprovalRequest, now: Date): boolean {
  return now.getTime() >= Date.parse(approval.expiresAt);
}

/** Any edit to the proposed content invalidates the previous approval. */
export function invalidateOnEdit(
  approval: ApprovalRequest,
  audit: readonly AuditEntry[],
  now: Date,
): { approval: ApprovalRequest; audit: AuditEntry[] } {
  return {
    approval: { ...approval, state: 'invalidated', nonceUsed: true },
    audit: appendAudit(audit, {
      at: now.toISOString(),
      event: 'invalidated_by_edit',
      actorUserId: null,
      actorRole: null,
      detail: 'proposed content changed; prior approval invalidated',
    }),
  };
}

export type DecisionResult =
  | { ok: true; approval: ApprovalRequest; audit: AuditEntry[] }
  | { ok: false; reason: DecisionRejection; approval: ApprovalRequest; audit: AuditEntry[] };

export type DecisionRejection =
  | 'emergency_stop_active'
  | 'not_pending'
  | 'nonce_mismatch'
  | 'nonce_already_used'
  | 'expired'
  | 'content_changed'
  | 'role_not_permitted'
  | 'division_not_permitted';

export type DecisionInput = {
  approval: ApprovalRequest;
  audit: readonly AuditEntry[];
  action: ProposedAction;
  presentedNonce: string;
  approver: Approver;
  decision: 'approve' | 'reject';
  now: Date;
  emergencyStop: boolean;
};

/**
 * Validate and record a decision. Never executes anything — the caller of a
 * future phase would still need its own explicit send gate.
 */
export async function decideApproval(input: DecisionInput): Promise<DecisionResult> {
  const { approval, action, presentedNonce, approver, now } = input;
  const fail = (reason: DecisionRejection, event: AuditEntry['event']): DecisionResult => ({
    ok: false,
    reason,
    approval,
    audit: appendAudit(input.audit, {
      at: now.toISOString(),
      event,
      actorUserId: approver.userId,
      actorRole: approver.role,
      detail: reason,
    }),
  });

  if (input.emergencyStop) return fail('emergency_stop_active', 'emergency_stop_rejected');
  if (!APPROVER_ROLES.includes(approver.role as ApproverRole))
    return fail('role_not_permitted', 'unauthorized_rejected');
  if (!approver.divisions.includes(approval.division))
    return fail('division_not_permitted', 'unauthorized_rejected');
  if (approval.nonceUsed) return fail('nonce_already_used', 'replay_rejected');
  if (approval.state !== 'pending') return fail('not_pending', 'replay_rejected');
  if (presentedNonce !== approval.nonce) return fail('nonce_mismatch', 'replay_rejected');
  if (isExpired(approval, now)) {
    return {
      ok: false,
      reason: 'expired',
      approval: { ...approval, state: 'expired', nonceUsed: true },
      audit: appendAudit(input.audit, {
        at: now.toISOString(),
        event: 'expired',
        actorUserId: approver.userId,
        actorRole: approver.role,
        detail: 'approval window elapsed',
      }),
    };
  }
  const currentHash = await hashAction(action);
  if (currentHash !== approval.contentHash) {
    const invalidated = invalidateOnEdit(approval, input.audit, now);
    return { ok: false, reason: 'content_changed', ...invalidated };
  }

  const state: PraeApprovalState = input.decision === 'approve' ? 'approved' : 'rejected';
  return {
    ok: true,
    approval: {
      ...approval,
      state,
      nonceUsed: true,
      decidedByUserId: approver.userId,
      decidedByRole: approver.role,
      decidedAt: now.toISOString(),
    },
    audit: appendAudit(input.audit, {
      at: now.toISOString(),
      event: state === 'approved' ? 'approved' : 'rejected',
      actorUserId: approver.userId,
      actorRole: approver.role,
      detail: `decision recorded (no execution in this phase)`,
    }),
  };
}

/** SMS segment estimate — display only. */
export function smsSegments(body: string): { encoding: 'GSM-7' | 'UCS-2'; segments: number; chars: number } {
  // eslint-disable-next-line no-control-regex
  const nonGsm = /[^\u0000-\u007F]/.test(body);
  const encoding = nonGsm ? 'UCS-2' : 'GSM-7';
  const single = nonGsm ? 70 : 160;
  const multi = nonGsm ? 67 : 153;
  const chars = body.length;
  const segments = chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / multi);
  return { encoding, segments, chars };
}

/**
 * Execution is disabled for the whole of Phase 1E. This is the single choke
 * point a future phase must change, under separate approval.
 */
export const PRAE_EXECUTION_ENABLED = false;

export function canExecuteApproved(approval: ApprovalRequest): { allowed: false; reason: string } {
  return {
    allowed: false,
    reason:
      approval.state === 'approved'
        ? 'execution_disabled_phase_1e'
        : 'execution_disabled_phase_1e_and_not_approved',
  };
}
