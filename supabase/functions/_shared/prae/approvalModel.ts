// Phase 1E / 1E.1 — Prae approval security foundation.
//
// PURE MODEL ONLY. This module performs no I/O: no email, no SMS, no IMAP,
// no AI, no network. It is not wired to any sending path in this phase.
// It exists so approval security can be tested with synthetic data before any
// execution path is ever built.
//
// Phase 1E.1 hardening:
//  - the usable nonce is NEVER stored: only its SHA-256 digest is persisted,
//    and the raw nonce is returned exactly once by createApproval();
//  - digests are compared in constant time;
//  - the content hash binds a versioned canonical form of the COMPLETE
//    proposed action, including attachment/media storage identity, immutable
//    version, MIME type, byte size and content digest;
//  - approver roles are restricted to owner/admin;
//  - TTL is validated (positive integer minutes, default 15, maximum 60).

export type PraeApprovalState =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'invalidated';

export type PraeChannel = 'email' | 'sms';

/**
 * Roles allowed to approve at all. Phase 1E.1: owner and admin only.
 * Manager / ops-manager / representative approval requires a separate written
 * authorisation together with explicit division-scoped policies.
 */
export const APPROVER_ROLES = ['owner', 'admin'] as const;
export type ApproverRole = (typeof APPROVER_ROLES)[number];

export type Approver = {
  userId: string;
  role: string;
  /** Divisions the approver is authorised for. */
  divisions: string[];
};

/**
 * Attachment / media binding. Storage objects are referenced by immutable
 * identity (object id + version) AND by content digest, so replacing a file
 * with a different one that has the same filename and byte size still breaks
 * the binding. Attachments remain synthetic and disabled in this phase.
 */
export type BoundStorageObject = {
  storageObjectId: string;
  storageObjectVersion: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

export type ProposedEmail = {
  channel: 'email';
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  attachments: BoundStorageObject[];
};

export type ProposedSms = {
  channel: 'sms';
  fromNumber: string;
  toNumber: string;
  body: string;
  media: BoundStorageObject[];
};

export type ProposedAction = ProposedEmail | ProposedSms;

export type ApprovalRequest = {
  id: string;
  /** SHA-256 hex digest of the nonce. The raw nonce is never stored here. */
  nonceDigest: string;
  contentHash: string;
  contentHashVersion: number;
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

// ---------------------------------------------------------------------------
// Canonical content binding
// ---------------------------------------------------------------------------

/** Version of the canonical serialisation format bound by the content hash. */
export const CONTENT_HASH_VERSION = 2;

function canonicalObject(o: BoundStorageObject) {
  return [
    o.storageObjectId,
    o.storageObjectVersion,
    o.filename,
    o.mimeType,
    o.sizeBytes,
    o.sha256.toLowerCase(),
  ];
}

/**
 * Deterministic canonical serialisation of the EXACT complete proposed action.
 * Body text is bound verbatim (normalised only for line endings) so any edit
 * changes the hash.
 */
export function canonicalizeAction(action: ProposedAction): string {
  const normalizeBody = (b: string) => b.replace(/\r\n/g, '\n');
  if (action.channel === 'email') {
    return JSON.stringify([
      'prae.v2',
      'email',
      action.from.trim().toLowerCase(),
      action.to.map((t) => t.trim().toLowerCase()),
      (action.cc ?? []).map((t) => t.trim().toLowerCase()),
      action.subject,
      normalizeBody(action.body),
      action.attachments.map(canonicalObject),
    ]);
  }
  return JSON.stringify([
    'prae.v2',
    'sms',
    action.fromNumber.trim(),
    action.toNumber.trim(),
    normalizeBody(action.body),
    action.media.map(canonicalObject),
  ]);
}

export async function sha256Hex(input: string): Promise<string> {
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

// ---------------------------------------------------------------------------
// Nonce handling
// ---------------------------------------------------------------------------

/** Generates a 256-bit random nonce. Returned to the caller only once. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hashNonce(nonce: string): Promise<string> {
  return sha256Hex(nonce);
}

/**
 * Constant-time comparison of two hex digests. No early exit: the full length
 * is always traversed and the result is a XOR accumulation.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let acc = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    acc |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  }
  return acc === 0;
}

// ---------------------------------------------------------------------------
// Lifetime
// ---------------------------------------------------------------------------

export const DEFAULT_TTL_MINUTES = 15;
export const MAX_TTL_MINUTES = 60;

/** Rejects non-integer, zero, negative, NaN and excessive TTL values. */
export function isValidTtlMinutes(ttl: unknown): ttl is number {
  return (
    typeof ttl === 'number' &&
    Number.isFinite(ttl) &&
    Number.isInteger(ttl) &&
    ttl >= 1 &&
    ttl <= MAX_TTL_MINUTES
  );
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function createApproval(params: {
  id: string;
  action: ProposedAction;
  division: string;
  now: Date;
  ttlMinutes?: number;
}): Promise<{ approval: ApprovalRequest; nonce: string; audit: AuditEntry[] }> {
  const ttl = params.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  if (!isValidTtlMinutes(ttl)) {
    throw new RangeError(
      `invalid_ttl: expected an integer between 1 and ${MAX_TTL_MINUTES} minutes`,
    );
  }
  // The raw nonce lives only in this return value. It is never persisted,
  // logged, placed in a URL, or written to browser storage.
  const nonce = newNonce();
  const approval: ApprovalRequest = {
    id: params.id,
    nonceDigest: await hashNonce(nonce),
    contentHash: await hashAction(params.action),
    contentHashVersion: CONTENT_HASH_VERSION,
    state: 'pending',
    division: params.division,
    createdAt: params.now.toISOString(),
    expiresAt: new Date(params.now.getTime() + ttl * 60_000).toISOString(),
    nonceUsed: false,
  };
  return {
    approval,
    nonce,
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
 *
 * The database mirror of this function (public.prae_decide_approval) applies
 * exactly the same conditions inside a single locked transaction, so two
 * simultaneous attempts can only ever yield one accepted decision.
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
  if (!constantTimeEqual(await hashNonce(presentedNonce), approval.nonceDigest))
    return fail('nonce_mismatch', 'replay_rejected');
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
  if (!constantTimeEqual(currentHash, approval.contentHash)) {
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

// ---------------------------------------------------------------------------
// SMS segmentation
// ---------------------------------------------------------------------------

/** GSM 03.38 basic alphabet (each character costs 1 septet). */
const GSM7_BASIC = new Set(
  (
    '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
    '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
  ).split(''),
);

/** GSM 03.38 extension table (each character costs 2 septets). */
const GSM7_EXTENDED = new Set(['\f', '^', '{', '}', '\\', '[', '~', ']', '|', '€']);

export type SmsEstimate = {
  encoding: 'GSM-7' | 'UCS-2';
  segments: number;
  /** Billable units: septets for GSM-7 (extension chars count 2), UTF-16 code units for UCS-2. */
  units: number;
  /** Visible characters (code points, so an emoji counts as 1). */
  chars: number;
};

/**
 * Accurate SMS segment calculation.
 *  - GSM-7: 160 units single / 153 per part; extension characters cost 2 units
 *    and are never split across parts.
 *  - UCS-2: 70 units single / 67 per part; measured in UTF-16 code units, so a
 *    non-BMP emoji (surrogate pair) costs 2 units and is never split.
 */
export function smsSegments(body: string): SmsEstimate {
  const codePoints = Array.from(body);
  const isGsm = codePoints.every((c) => GSM7_BASIC.has(c) || GSM7_EXTENDED.has(c));
  const chars = codePoints.length;

  if (chars === 0) return { encoding: isGsm ? 'GSM-7' : 'UCS-2', segments: 0, units: 0, chars: 0 };

  const costs = isGsm
    ? codePoints.map((c) => (GSM7_EXTENDED.has(c) ? 2 : 1))
    : codePoints.map((c) => (c.codePointAt(0)! > 0xffff ? 2 : 1));
  const units = costs.reduce((a, b) => a + b, 0);

  const single = isGsm ? 160 : 70;
  const multi = isGsm ? 153 : 67;
  if (units <= single) {
    return { encoding: isGsm ? 'GSM-7' : 'UCS-2', segments: 1, units, chars };
  }

  // Pack greedily; a 2-unit character never straddles a segment boundary.
  let segments = 1;
  let used = 0;
  for (const cost of costs) {
    if (used + cost > multi) {
      segments += 1;
      used = 0;
    }
    used += cost;
  }
  return { encoding: isGsm ? 'GSM-7' : 'UCS-2', segments, units, chars };
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
