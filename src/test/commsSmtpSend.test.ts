/**
 * Phase 1B — staging SMTP sender contract tests.
 *
 * Pure-rule tests run locally against the function's core helpers; the
 * authorization tests hit the deployed endpoint. Nothing here sends email.
 */
import { describe, it, expect } from 'vitest';
import {
  buildMimeMessage,
  dotStuff,
  isHeaderSafe,
  isValidEmail,
  isValidIdempotencyKey,
  newMessageId,
  normalizeBody,
  rateLimitDecision,
  redactSmtp,
  threadHeaders,
  validateRecipient,
  validateSubject,
} from '../../supabase/functions/comms-smtp-send/core';

const ALLOWLIST = ['admin@praetoriagroup.ca'];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/comms-smtp-send`;

describe('recipient restrictions', () => {
  it('accepts an allow-listed address', () => {
    expect(validateRecipient('admin@praetoriagroup.ca', ALLOWLIST)).toEqual({
      ok: true,
      address: 'admin@praetoriagroup.ca',
    });
  });

  it('rejects an address that is not allow-listed', () => {
    expect(validateRecipient('someone@example.com', ALLOWLIST).ok).toBe(false);
  });

  it('rejects multiple recipients', () => {
    expect(validateRecipient('admin@praetoriagroup.ca, x@y.ca', ALLOWLIST).ok).toBe(false);
  });

  it('rejects malformed addresses and empty input', () => {
    expect(validateRecipient('not-an-email', ALLOWLIST).ok).toBe(false);
    expect(validateRecipient('', ALLOWLIST).ok).toBe(false);
    expect(validateRecipient(undefined, ALLOWLIST).ok).toBe(false);
  });
});

describe('header-injection protection', () => {
  it('flags CR/LF and unicode line separators', () => {
    expect(isHeaderSafe('normal subject')).toBe(true);
    expect(isHeaderSafe('evil\r\nBcc: victim@example.com')).toBe(false);
    expect(isHeaderSafe('evil\u2028Bcc: x')).toBe(false);
  });

  it('rejects an injected subject', () => {
    expect(validateSubject('Hello\r\nBcc: victim@example.com').ok).toBe(false);
  });

  it('rejects an injected recipient', () => {
    expect(validateRecipient('admin@praetoriagroup.ca\r\nBcc: v@x.com', ALLOWLIST).ok).toBe(false);
    expect(isValidEmail('a@b.ca\nX: y')).toBe(false);
  });

  it('throws rather than emitting a forged header', () => {
    expect(() =>
      buildMimeMessage({
        fromAddress: 'staging@praetoriagroup.ca',
        to: 'admin@praetoriagroup.ca\r\nBcc: v@x.com',
        subject: 'hi',
        body: 'hi',
        messageId: '<a@b>',
      }),
    ).toThrow();
  });

  it('dot-stuffs body lines so DATA cannot be terminated early', () => {
    expect(dotStuff('.\r\nnope')).toBe('..\r\nnope');
  });
});

describe('message construction and threading', () => {
  const base = {
    fromAddress: 'staging@praetoriagroup.ca',
    to: 'admin@praetoriagroup.ca',
    subject: 'Staging test',
    body: 'Line one\r\nLine two',
    messageId: newMessageId('praetoriagroup.ca', '11111111-1111-4111-8111-111111111111'),
    date: new Date('2026-09-03T21:00:00Z'),
  };

  it('emits plain-text headers only', () => {
    const msg = buildMimeMessage(base);
    expect(msg).toContain('Content-Type: text/plain; charset="UTF-8"');
    expect(msg).not.toContain('text/html');
    expect(msg).toContain('From: staging@praetoriagroup.ca');
    expect(msg).toContain('To: admin@praetoriagroup.ca');
  });

  it('adds In-Reply-To and References when replying', () => {
    const t = threadHeaders('<parent@ionos.com>');
    const msg = buildMimeMessage({ ...base, inReplyTo: t.inReplyTo, references: t.references });
    expect(msg).toContain('In-Reply-To: <parent@ionos.com>');
    expect(msg).toContain('References: <parent@ionos.com>');
  });

  it('chains References through an existing chain', () => {
    expect(threadHeaders('<b@x>', '<a@x>').references).toBe('<a@x> <b@x>');
  });

  it('normalises the body to CRLF and enforces limits', () => {
    expect(normalizeBody('a\nb')).toEqual({ ok: true, body: 'a\r\nb' });
    expect(normalizeBody('').ok).toBe(false);
    expect(normalizeBody('x'.repeat(20001)).ok).toBe(false);
  });
});

describe('rate limiting and idempotency', () => {
  it('blocks once the hourly limit is reached', () => {
    expect(rateLimitDecision(9, 10).ok).toBe(true);
    expect(rateLimitDecision(10, 10).ok).toBe(false);
  });

  it('requires a UUID idempotency key', () => {
    expect(isValidIdempotencyKey('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isValidIdempotencyKey('abc')).toBe(false);
    expect(isValidIdempotencyKey(undefined)).toBe(false);
  });
});

describe('SMTP failure handling and secret redaction', () => {
  it('redacts credentials and AUTH lines from a transcript', () => {
    const transcript = '> EHLO ok\nAUTH PLAIN AGFiYwBzZWNyZXQ=\n235 2.7.0 Accepted\n> MAIL 250 ok';
    const safe = redactSmtp(transcript, ['sup3r-s3cret-password', 'staging@praetoriagroup.ca']);
    expect(safe).not.toContain('AGFiYwBzZWNyZXQ=');
    expect(safe).toContain('[redacted]');
  });

  it('never echoes a password embedded in an error string', () => {
    const safe = redactSmtp('535 auth failed for sup3r-s3cret-password', ['sup3r-s3cret-password']);
    expect(safe).not.toContain('sup3r-s3cret-password');
  });
});

describe('endpoint authorization (deployed)', () => {
  it('rejects an unauthenticated POST', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare' }),
    });
    await res.text();
    expect([401, 403]).toContain(res.status);
  });

  it('rejects an anon-key-only POST (no user session)', async () => {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ action: 'prepare', to: 'admin@praetoriagroup.ca' }),
    });
    await res.text();
    expect([401, 403]).toContain(res.status);
  });

  it('rejects GET', async () => {
    const res = await fetch(ENDPOINT, { method: 'GET' });
    await res.text();
    expect([401, 403, 405]).toContain(res.status);
  });
});
