# Phase 1E — Specification only: Ops Hub notifications, secure deep links, Twilio SMS alerts

**Status: written specification. Nothing in this document is built, deployed or enabled.**
No Twilio webhook exists, no message has been sent, no notification permission is requested,
and no mobile/Capacitor configuration was touched.

## 1. Ops Hub phone notifications

- Reuse the existing in-app notification pipeline (`notifications` table, `send-notification`
  edge function, `notification_templates`) rather than building a second system.
- Add notification events `prae_needs_approval` and `prae_needs_attention` to the existing
  `notification_event` enum, audience `admin`.
- Delivery on phone = the existing PWA/TWA install. Web Push would be a separate opt-in step:
  permission is requested only from a user gesture inside Settings, never on load.
- Notification payload carries **no** message body, customer name, address or amount — only
  "1 item needs approval", the division, and the deep link. Sensitive content is fetched only
  after an authenticated session renders the approval screen.

## 2. Secure deep links into the approval screen

- Format: `https://<app-domain>/prae/approvals/<approval_id>` — an application route, not a
  token-bearing action URL.
- The link never contains the approval nonce, a bearer token, or any content.
- Opening the link requires an authenticated Ops Hub session; unauthenticated users hit the
  normal login and are returned to the same path afterwards.
- Server-side authorisation on load: role must be in `owner | admin | manager | ops_manager`
  and the approver's divisions must include the approval's division.
- The single-use nonce is issued to the rendered screen only, is bound to the content hash,
  and expires (default 15 minutes).

## 3. Twilio SMS alerts (outbound)

- Connect Twilio through the Lovable connector; call the API only through the connector
  gateway from an edge function. No credentials in browser code.
- Before any production traffic: enable SMS Pumping Protection and restrict SMS Geo
  Permissions to Canada.
- Alert text is content-free, e.g.
  `Praetoria Ops: 1 item needs approval (Snow & Ice). Open: <link> Reply STOP to opt out.`
- Alerts go only to numbers on the authorised list (below). Quiet hours and a per-hour cap
  apply. Alerts are never sent to customers.

## 4. Inbound commands

Supported words, all read-only:

| Command | Behaviour |
| --- | --- |
| `STATUS` | Counts only: pending approvals, items needing attention. No content. |
| `URGENT` | Count of items flagged high risk, plus a deep link. |
| `PAUSE` | Sets the global emergency stop (`prae_emergency_stop.stopped = true`). Never resumes by SMS — resuming is Ops Hub only. |
| `WHAT NEEDS APPROVAL?` | Count by division plus a deep link. No subject lines, no bodies. |
| `STOP` / `START` / `HELP` | Standard carrier opt-out handling (see §7). |

**Hard rule:** a reply such as `YES`, `OK` or `APPROVE` never approves anything. The only
response is a secure link to the Ops Hub approval screen. There is no SMS approval path.

## 5. Webhook signature validation

- Endpoint `twilio-inbound` (not deployed in this phase), `verify_jwt = false`, public by
  necessity, therefore signature validation is mandatory and runs before anything else:
  1. Read `X-Twilio-Signature`.
  2. Recompute HMAC-SHA1 over the full public URL + sorted POST params using the Twilio auth
     token, compare in constant time.
  3. Mismatch or missing header → `403`, log the attempt, no database read.
- Reject non-`POST`, reject bodies over a small size cap, and never echo request content into
  error responses.

## 6. Authorised phone numbers

- Table `prae_authorized_phones`: `user_id`, `e164`, `verified_at`, `active`, `divisions`.
- Numbers are added only in the Ops Hub by an owner/admin and verified by a one-time code.
- An unrecognised inbound number receives no data — either silence or a single generic
  "not recognised" reply, rate limited.
- Caller ID is treated as spoofable: an authorised number gains read-only counts and a link,
  nothing more. Every state change happens behind the authenticated session.

## 7. Opt-out handling

- `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT` → mark the number inactive
  immediately; suppress all outbound SMS to it. `START`/`UNSTOP` re-enables. `HELP` returns
  contact details.
- Opt-out state is stored locally as well as relied on at Twilio, and is checked before every
  send.

## 8. Rate limiting and duplicate protection

- Outbound: at most one alert per approval item; digest instead of per-item alerts above
  3 pending items in 15 minutes; hard cap per number per hour; quiet hours 21:00–07:00 local
  (Regina) except items flagged urgent.
- Inbound: per-number sliding window (e.g. 10 messages / 5 minutes); excess is dropped
  silently after logging.
- Duplicate protection: Twilio `MessageSid` is stored and unique-constrained; a replayed
  webhook is acknowledged with `200` and processed zero times.
- Outbound sends use an idempotency key per (approval_id, number, event).

## 9. Explicitly out of scope for this phase

Deploying the webhook, sending any message, requesting notification permission, modifying
Capacitor/mobile packaging, connecting Twilio, or wiring the approval foundation to any
send path. Each requires separate written approval.
