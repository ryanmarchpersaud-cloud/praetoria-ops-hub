# Phase 1E.2 — Server-Authoritative Approval Binding and Authorization Ordering

Status: implemented, awaiting written approval. Nothing is connected to Prae,
messaging or any execution path. `PRAE_EXECUTION_ENABLED = false` and
`prae_emergency_stop.stopped = true` remain in force.

## Preflight (before the migration)

| Table | Rows | Classification |
| --- | --- | --- |
| `prae_approvals` | 1 | 1 synthetic, **0 non-synthetic** |
| `prae_approval_audit` | 1 | synthetic evidence, preserved |
| `prae_emergency_stop` | 1 | `stopped = true` |

The migration re-checks this in SQL and aborts if any non-synthetic approval
exists.

## Server-authoritative content hash

- `prae_create_approval(_content_binding jsonb, _division text, _ttl_minutes int
  default 15, _is_synthetic boolean default true)` — the caller supplies the
  **proposed content**, never a hash.
- The server builds the canonical representation (`prae_canonical_action`,
  format `prae.v2`) and computes `content_hash` (`prae_content_hash`).
- `content_binding` is `NOT NULL`; `content_hash_version` is constrained to `2`
  (`prae_approvals_hash_version_supported`).
- Channel-specific validation rejects missing, unknown or malformed fields —
  including attachment/media entries, which must carry exactly
  `storageObjectId`, `storageObjectVersion`, `filename`, `mimeType`,
  `sizeBytes` (non-negative integer) and `sha256` (64 hex).
- The old `prae_create_approval(text,text,text,jsonb,integer,boolean)` overload
  had its grants revoked and was dropped.

## Immutable approved proposal

A BEFORE UPDATE trigger (`prae_approvals_bound_fields_immutable`) rejects any
change to `channel`, `division`, `content_binding`, `content_hash` or
`content_hash_version`. Editing is `applyEdit()` in the model: the old approval
becomes `invalidated` / `nonce_used = true` and a **new** approval with a new
nonce and new hash is created. Future execution must use
`approval.contentBinding` verbatim — never a rebuilt action derived from a
mutable customer, job or message record.

## Server-authoritative decision

`prae_decide_approval(_approval_id uuid, _nonce text, _decision text)` — the
`_content_hash` parameter is gone (old overload revoked and dropped). Inside the
locked transaction the server loads the approval, recomputes the hash from its
immutable binding with the same canonical version, compares it constant-time to
the stored hash and invalidates the approval on any difference. Nonce digest,
expiry, pending state, division, role and single-use enforcement are unchanged.

## Authorization ordering

`prae_decide_approval` checks `auth.uid()` and `is_admin_or_owner` **first** —
before reading approval state, before reading the emergency stop and before any
audit insert. An authenticated non-owner/non-admin receives
`role_not_permitted`, learns nothing about existence, division or state, reads
no emergency-stop value, writes no audit row and never locks or updates a row.
The pure model mirrors this exactly (role check first, no audit entry appended).

## Privilege matrix (verified from `pg_proc`)

| Function | anon | authenticated | service_role |
| --- | --- | --- | --- |
| `prae_create_approval(jsonb,text,integer,boolean)` | – | EXECUTE | EXECUTE |
| `prae_decide_approval(uuid,text,text)` | – | EXECUTE | EXECUTE |
| `prae_canonical_action(jsonb)` | – | – | EXECUTE |
| `prae_canonical_objects(jsonb)` | – | – | EXECUTE |
| `prae_canonical_emails(jsonb)` | – | – | EXECUTE |
| `prae_content_hash(jsonb)` | – | – | EXECUTE |
| `prae_sha256_hex(text)` | – | – | EXECUTE |
| `prae_constant_time_eq(text,text)` | – | – | EXECUTE |
| `prae_division_allowed(uuid,text)` | – | – | EXECUTE |
| `prae_audit_append_only()` / `prae_approvals_bound_fields_immutable()` | – | – | EXECUTE |

Tables stay read-only for browsers (SELECT only; audit append-only trigger).

## Existing synthetic row

Preserved, together with its audit history, and made permanently unusable:
`state = 'invalidated'`, `nonce_used = true`, an explicit synthetic legacy
binding, a hash recomputed from that binding, and a new audit entry recording
the security migration. Nothing was deleted.

## Canonicalisation parity

`supabase/functions/_shared/prae/canonicalFixtures.ts` holds four shared
fixtures (email with/without attachments, SMS with/without media, quotes, tabs,
CRLF, non-ASCII, backslashes) with the canonical string and hash produced by the
database. `src/test/praeCanonicalParity.test.ts` asserts the TypeScript
canonicaliser produces byte-identical output and identical hashes.

## Files changed

- migration `phase 1e.2 server-authoritative approval binding`
- `supabase/functions/_shared/prae/approvalModel.ts` — `validateBinding`,
  `BindingError`, `contentBinding` on `ApprovalRequest`, `applyEdit`,
  authorization-first decision, recompute-from-binding
- `supabase/functions/_shared/prae/canonicalFixtures.ts` — new
- `src/test/praeCanonicalParity.test.ts` — new
- `src/test/praeDbSecurity.test.ts` — old-overload and internal-helper tests
- `src/test/praeApproval.test.ts` — unauthorized role now asserts zero audit rows
- this document

## Rollback

1. Revert the listed source files.
2. `DROP TRIGGER prae_approvals_bound_fields_immutable ON public.prae_approvals;`
   `DROP FUNCTION public.prae_approvals_bound_fields_immutable();`
3. `ALTER TABLE public.prae_approvals DROP CONSTRAINT prae_approvals_hash_version_supported, ALTER COLUMN content_binding DROP NOT NULL;`
4. `DROP FUNCTION public.prae_decide_approval(uuid,text,text);`
   `DROP FUNCTION public.prae_create_approval(jsonb,text,integer,boolean);`
   `DROP FUNCTION public.prae_content_hash(jsonb);`
   `DROP FUNCTION public.prae_canonical_action(jsonb);`
   `DROP FUNCTION public.prae_canonical_objects(jsonb);`
   `DROP FUNCTION public.prae_canonical_emails(jsonb);`
5. Recreate the Phase 1E.1 RPC bodies from
   `docs/specs/phase-1e1-approval-security.md` if the previous behaviour is
   required. The synthetic row's pre-1E.2 hash is intentionally not restored.

## Pre-existing AI endpoint (unchanged)

`summarize-meeting` is untouched and remains the only active AI-gateway caller.
