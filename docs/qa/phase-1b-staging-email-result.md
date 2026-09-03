# Phase 1B — Staging Email Test Result

Date: 2026-09-03 (UTC)
Mailbox: IONOS staging (staging@praetoriagroup.ca)
Recipient: admin@praetoriagroup.ca
Subject: Praetoria staging mail test — Phase 1B
Message-ID: `<1172eabb-3611-4822-bd7a-9b2aa8900038@praetoriagroup.ca>`
SMTP queue id: 0MJRQT-1x0JYB3xHP-008FYT

## Results

| Check | Result |
| --- | --- |
| SMTP connection and authentication | passed |
| IONOS accepted the message for delivery | passed |
| Message received | passed |
| Inbox placement | failed — delivered to Spam |

## Status

Blocked pending raw message authentication headers (SPF, DKIM, DMARC) from the received
message. No further action taken.

Explicitly NOT done and remaining disabled:
- No additional test sends
- No production mailboxes connected
- No polling enabled (still off, no cron jobs)
- No DNS record changes
- No new phase started
