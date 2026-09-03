# Phase 1B — Staging Email Test Result

Date: 2026-09-03 (UTC)
Mailbox: IONOS staging (staging@praetoriagroup.ca)
Recipient: admin@praetoriagroup.ca
Subject: Praetoria staging mail test — Phase 1B
Message-ID: `<1172eabb-3611-4822-bd7a-9b2aa8900038@praetoriagroup.ca>`
SMTP queue id: 0MJRQT-1x0JYB3xHP-008FYT

## Outbound results

| Check | Result |
| --- | --- |
| SMTP connection and authentication | passed |
| IONOS accepted the message for delivery | passed |
| Message received | passed |
| Inbox placement | failed — delivered to Spam |

## Authentication results (from the received message)

| Check | Result |
| --- | --- |
| SPF | pass |
| DKIM | pass |
| DMARC | pass |
| Reverse IP | pass |
| X-Spam-Flag | NO |

### Anomaly (open)

Inbox-placement anomaly: the message was filed in the IONOS Spam folder although
SPF, DKIM, DMARC and reverse-IP all passed and X-Spam-Flag was NO. Recorded for
later external deliverability testing (e.g. third-party seed/placement test).
No DNS records were changed and none are proposed.

## Phase 1B.1 — one-time controlled inbound synchronization

Date: 2026-09-03 (UTC). Manual, single run. No cron job created.

- Invoked server-to-server with the protected scheduler credential (POST +
  `x-comms-scheduler-secret`). The credential was rotated for this run.
- One-shot mode temporarily lifted the global pause switch and forced
  `comms_settings.polling_enabled = false` again in a `finally` cleanup block,
  which runs on success, failure and timeout alike.
- IMAP remained read-only: `EXAMINE` + `BODY.PEEK`. No flag changes, moves,
  deletes or appends.

| Check | Result |
| --- | --- |
| Reply imported | passed (UID 3, from admin@praetoriagroup.ca) |
| UID idempotency | passed (second run: 0 imported, 0 scanned) |
| Threading | passed (In-Reply-To/References matched the sent Message-ID) |
| Polling returned to off | passed (`polling_enabled = false`) |
| Scheduled jobs | none (0 cron jobs) |
| Additional email sent | none (outbound log still 1 record) |

Imported reply headers:

- Message-ID: `<1222295330.742466.1788473738077@email.ionos.com>`
- In-Reply-To: `<1172eabb-3611-4822-bd7a-9b2aa8900038@praetoriagroup.ca>`
- References: `<1172eabb-3611-4822-bd7a-9b2aa8900038@praetoriagroup.ca>`
- Linked outbound record: `8851d3d7-a383-43a1-825f-34ea94076064`

Still disabled: AI processing, attachments, HTML email, production mailboxes,
scheduled polling, Twilio/Resend/n8n involvement, DNS changes, new phases.
