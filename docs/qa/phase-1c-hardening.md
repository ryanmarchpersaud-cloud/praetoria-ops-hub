# Phase 1C — Staging hardening and production-mailbox preparation

Date: 2026-09-03 (UTC). No production mailbox was connected, authenticated, read from or sent through.

## 1. Safe initial synchronisation

Implemented in `supabase/functions/_shared/comms/initialSync.ts` and enforced in the database.

- `future_only` — establishes a baseline at the mailbox's current highest message id (`UIDNEXT - 1`)
  and searches `UID SEARCH UID <baseline+1>:*`. Nothing at or below the baseline is ever imported.
- `approved_backfill` — permitted only with a recorded owner approval **and** an explicit UID range
  or date range (`UID SEARCH UID a:b` / `UID SEARCH SINCE d1 BEFORE d2`).
- Every production mailbox defaults to `future_only`; a database trigger forces it on insert and
  additionally forces the row inactive with inbound and outbound disabled.
- A backfill without approval, or with approval but no range, returns `blocked` — the complete
  history of a mailbox can never be imported silently.
- `buildBackfillProposal()` returns the mailbox, mode, baseline, range and estimated message count,
  with `willImport = false` until approval is recorded. The Hub renders this before any backfill.

## 2. Production mailbox configuration structure

`public.comms_mailboxes` now holds: address, label/display name, division, assigned representative,
`inbound_enabled`, `outbound_enabled`, `environment` (staging|production), `credential_secret_prefix`
(secret-name reference only), `sync_start_mode`, baseline fields, approved backfill range and approval
record, `emergency_paused`, IMAP/SMTP host and port, sent folder, plus the existing sync state row.

- Passwords are never stored: a trigger rejects any `credential_secret_prefix` that is not a
  secret-name-shaped identifier.
- No production address or credential has been added. Placeholder capability only.

## 3. Inbound parsing (synthetic fixtures only)

`supabase/functions/_shared/comms/mime.ts` — RFC 2047 encoded words (UTF-8 B and Q), quoted-printable
and Base64 bodies, multipart/alternative and multipart/mixed, nested `message/rfc822`, reply and
forward headers, `Message-ID` / `In-Reply-To` / `References`, body truncation at 100k characters,
part and depth caps, and non-throwing handling of malformed MIME.

`supabase/functions/_shared/comms/htmlSanitize.ts` — plain text is the default rendering. HTML is
sanitised server-side: script/style/iframe/object/embed/form/svg/meta/link removed with content,
tag and attribute allow-lists, all `on*` handlers stripped, only `https:` and `mailto:` links kept
(with `rel="noopener noreferrer nofollow"`), remote image sources always removed and counted, and
1×1 or hidden tracking pixels dropped entirely. No script or active content is ever executed.

## 4. Attachment safety foundation (built, disabled)

`supabase/functions/_shared/comms/attachments.ts` + table `public.comms_attachments` + private
storage bucket `comms-attachments` (10 MB limit, no public policies, no client access — signed URLs
are minted server-side only).

- 10 MB per file, 10 files per message, 25 MB total.
- MIME allow-list plus extension/MIME agreement check; every extension in the name is inspected so
  `invoice.pdf.js` is blocked; executables, scripts, installers and macro-enabled office files blocked.
- Scan status `pending | clean | quarantined | blocked`; a file is never treated as clean by default.
- Downloads require the attachments switch to be on, a `clean` scan, and the same permission as the
  parent message (owner/admin or the assigned representative); links are signed and expire in 120 s.
- Invariants asserted in tests: no auto-open, no inline preview, never sent to AI, never public.

## 5. Sent-folder consistency (prepared, not executed)

`supabase/functions/_shared/comms/sentFolder.ts` and the new outbound columns
`sent_copy_status`, `sent_copy_attempts`, `sent_copy_last_error`, `sent_copy_appended_at`.

- Append is only considered when the send state is `sent` (SMTP already accepted).
- Deduplicated by `Message-ID` via an IMAP header search of the Sent folder before appending.
- On failure the record is set to `sent_copy_pending` and only the append is retried
  (exponential backoff, 5 attempts max). `resend_email` is hard-coded `false` — a failed append can
  never cause the email to be sent again.
- `sent_copy_enabled` is `false`, so nothing appends today.

## 6. Deliverability

Same-domain result recorded: SPF pass, DKIM pass, DMARC pass, reverse-IP pass, X-Spam-Flag NO,
message initially appeared in the IONOS Spam folder. No DNS changes authorised or made.
One external deliverability test is prepared but not sent; the recipient will be supplied separately.

## Gates still closed

No production mailbox credentials or connections, no automatic or scheduled polling (0 cron jobs),
no additional email sent, no AI processing (`ai_processing_enabled = false`), no Twilio, Resend, n8n
or DNS changes. AI retention and data-handling approval remains unresolved.

## Phase 1C.1 — Sent-folder discovery (2026-09-03)

Read-only IMAP LIST/SPECIAL-USE discovery on the staging mailbox.

Redacted LIST response:

```
d3 LIST "" "*" RETURN (SPECIAL-USE)
* LIST (\Drafts) "/" "Drafts"
* LIST () "/" "INBOX"
* LIST (\Sent) "/" "Sent Items"      <-- unique \Sent mailbox
* LIST (\Junk) "/" "Spam"
* LIST (\Trash) "/" "Trash"
d3 OK LIST completed
```

Discovered Sent folder: `Sent Items` (source `special_use`, verified 2026-09-03T22:49:48Z).
Stored on the mailbox row with the full folder snapshot. No folder was created,
renamed, subscribed to or modified. No email sent, no APPEND issued.

Sent-copy operations now require `requireVerifiedSentFolder()`; there is no
fallback to a literal "Sent". Zero or multiple \Sent candidates set
`sent_folder_selection_required = true` and block appends until an owner selects.

Attachment handling remains disabled and is NOT production-ready: no operational
malware-scanning service is connected. The custom HTML rendering path stays off;
only sanitized plain text is displayed.

## Phase 1C.3 — controlled SMTP + Sent-copy staging test (2026-09-03)

- Pre-send read-only discovery: exactly one `\Sent` mailbox — `* LIST (\Sent) "/" "Sent Items"`.
- One email sent (IONOS SMTP 587/STARTTLS), Message-ID `<f0664fe1-...@praetoriagroup.ca>`, queue id `0Lg28r-1wVLLx0BAZ-00mJw6`.
- APPEND to `Sent Items` with `\Seen`, 652 octets of the canonical (non dot-stuffed) RFC822, `APPENDUID 1788469057 1`; post-append search = exactly 1 match.
- Append-only retry → `skipped_duplicate`, no send, no second append.
- `sent_copy_enabled` opened for the send and closed in a `finally` block; confirmed `false` afterwards.

## Phase 1D — status integrity, MIME security, Prae interface shell (2026-09-03)

### Sent-copy status integrity
`resolveSentCopyStatus()` makes `appended` terminal. Retries write their result to
`sent_copy_last_retry_outcome` / `sent_copy_last_retry_at` and to `comms_audit_log`,
never to `sent_copy_status`. The `sent_copy_retry` action still has no reachable
SMTP code path (no import of the SMTP client in that branch).

### rfc822_message retention proposal (NOT ACTIVATED — needs separate approval)
* Purpose: the canonical MIME body exists only so an append-only Sent-copy retry
  can file the byte-identical message. It has no other use.
* Proposed minimum retention: delete `rfc822_message` (set to NULL) as soon as
  `sent_copy_status = 'appended'`, or at **7 days** after `sent_at` for any other
  status — whichever comes first. Hard ceiling 30 days.
* Proposed safe deletion: `UPDATE ... SET rfc822_message = NULL` (never row
  deletion) executed by a service-role job, with one `comms_audit_log` entry per
  purge recording only the outbound id, byte length and timestamp.
* Existing Phase 1C test evidence is retained. No retention job, cron entry or
  trigger has been created.

## Phase 1D.1 — outbound response security hotfix (2026-09-03)

`redactRecord()` (blacklist) was replaced by `toOutboundDto()` in
`supabase/functions/_shared/comms/outboundDto.ts`, an explicit allow list of 26
safe columns. `rfc822_message`, `smtp_result` and any future/unknown column are
dropped by construction. Applied to all six record-response paths: prepared
draft, idempotency-key duplicate, already-sent duplicate, successful send,
failed/pending Sent-copy, and Sent-copy retry. No path returns a raw
service-role row.

### Corrected rollback procedure (supersedes the Phase 1D entry)
1. Code: revert the affected source files and redeploy `comms-smtp-send`.
2. **Never** restore `GRANT ALL` on `public.comms_outbound_messages` to `anon`
   or `authenticated`. The column-scoped `SELECT` grant for `authenticated`
   (excluding `rfc822_message` and `smtp_result`) and `service_role`-only full
   access are permanent and survive removal of the Prae interface or any later
   Phase 1D rollback.
3. Prae UI: deleting `src/components/prae/` and its two imports removes the
   interface; it touches no grants, policies or data.
4. Columns `sent_copy_last_retry_outcome` / `sent_copy_last_retry_at` may be
   dropped only together with the code that writes them.
