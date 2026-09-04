# Phase 1E.1 — Approval Security Model Hardening

Status: implemented, awaiting written approval. Nothing is connected to any
execution path. `PRAE_EXECUTION_ENABLED = false` and
`prae_emergency_stop.stopped = true` remain in force.

## Preflight (before the migration)

| Table | Rows | Classification |
| --- | --- | --- |
| `prae_approvals` | 1 | 1 synthetic (`is_synthetic = true`), **0 non-synthetic** |
| `prae_approval_audit` | 1 | synthetic evidence, preserved |
| `prae_emergency_stop` | 1 | `stopped = true` |

The migration re-checks this in SQL and aborts with an exception if any
non-synthetic approval exists. No audit evidence was deleted.

## Nonce security

- `prae_approvals.nonce` (plaintext uuid) was **dropped**.
- `prae_approvals.nonce_digest` (SHA-256 hex, unique, `^[0-9a-f]{64}$`) replaces it.
- The raw nonce is generated inside `public.prae_create_approval(...)` and
  returned **once** in that call's result to an authenticated owner/admin session.
- The raw nonce is never stored, logged, written to an audit row, placed in a
  URL, or persisted in browser storage.
- Digest comparison uses `public.prae_constant_time_eq` (both sides re-hashed to
  32 bytes, full-length XOR accumulation, no early exit) and, in the pure model,
  `constantTimeEqual`.

## Atomic single-use decision

`public.prae_decide_approval(_approval_id, _nonce, _decision, _content_hash)`
— `SECURITY DEFINER`, executable by `authenticated`/`service_role` only.

Inside one transaction with `SELECT ... FOR UPDATE` on the approval row it
requires **all** of:

1. emergency stop is false
2. caller is owner or admin (`is_admin_or_owner`)
3. caller covers the approval's division (`prae_division_allowed`)
4. state is `pending`
5. nonce not yet used
6. nonce digest matches (constant time)
7. not expired
8. content hash still matches

The final `UPDATE` is additionally guarded by `state = 'pending' AND
nonce_used = false`; if it affects zero rows the call returns `already_decided`.
Two simultaneous attempts therefore produce exactly one accepted decision.

Browsers hold `SELECT` only. `INSERT/UPDATE/DELETE/TRUNCATE` are revoked from
`anon` and `authenticated` on `prae_approvals`, `prae_approval_audit` and
`prae_emergency_stop`. The audit table keeps its append-only trigger.

## Complete content binding

Canonical format version **2** (`prae.v2`), bound by the content hash.

Email: channel, from, to, cc, subject, exact normalized body, and for each
attachment — storage object id, immutable version, filename, MIME type, byte
size, SHA-256 content digest.

SMS: channel, sending number, recipient number, exact body, and for each media
object — storage object id, immutable version, filename, MIME type, byte size,
SHA-256 content digest.

Attachments and media remain synthetic and disabled; the binding only ensures
future content cannot change after approval.

## Roles

Owner and admin only, consistently across:

- pure model `APPROVER_ROLES = ['owner','admin']`
- database (`is_admin_or_owner` inside both RPCs, RLS read policies)
- `/prae` route (`<ModuleGuard module="ownerOnly">` → `isOwnerOrAdmin`)
- approval-detail access (rendered inside the guarded `/prae` area)
- tests and this document

Manager / ops-manager / representative approval is explicitly out of scope and
requires separate written authorization plus division-scoped policies.

## Expiration

Default 15 minutes, documented maximum 60 minutes. Non-integer, zero, negative,
NaN, infinite and excessive TTLs are rejected in both the model
(`isValidTtlMinutes`) and the database (`invalid_ttl` plus the
`prae_approvals_ttl_bounds` check constraint).

## SMS estimator

`smsSegments` now distinguishes GSM-7 basic characters (1 unit), GSM-7 extension
characters `^{}\[~]|€` and form feed (2 units) and UCS-2 (UTF-16 code units, so a
non-BMP emoji costs 2). Limits: 160/153 GSM-7, 70/67 UCS-2. Two-unit characters
are never split across a segment boundary. Counts are exact, not an estimate.

## Files changed

- `supabase/functions/_shared/prae/approvalModel.ts` — hardened pure model
- `src/components/prae/praeActivityDemo.ts` — bound attachment/media type
- `src/components/prae/PraeApprovalDetail.tsx` — displays binding + SMS units
- `src/test/praeApproval.test.ts` — rewritten security suite
- `src/test/praeDbSecurity.test.ts` — new database contract suite
- `src/test/legacyCopilotGate.test.ts` — assertion-arity fix only
- migration `prae approval security hardening`

## Rollback

1. Revert the listed source files (git revert of this change set).
2. Drop the new functions:
   `DROP FUNCTION public.prae_decide_approval(uuid,text,text,text);`
   `DROP FUNCTION public.prae_create_approval(text,text,text,jsonb,integer,boolean);`
   `DROP FUNCTION public.prae_division_allowed(uuid,text);`
   `DROP FUNCTION public.prae_constant_time_eq(text,text);`
   `DROP FUNCTION public.prae_sha256_hex(text);`
3. Drop the new constraints/columns if required:
   `ALTER TABLE public.prae_approvals DROP CONSTRAINT prae_approvals_ttl_bounds, DROP COLUMN content_binding, DROP COLUMN content_hash_version;`
4. The plaintext `nonce` column is intentionally **not** restorable — the prior
   value was synthetic and is gone by design.

## Pre-existing AI endpoint (unchanged)

`summarize-meeting` remains the only active AI-gateway caller and is untouched
by this phase. `chat-copilot` stays fail-closed behind
`LEGACY_CHAT_COPILOT_ENABLED` (variable not created).
