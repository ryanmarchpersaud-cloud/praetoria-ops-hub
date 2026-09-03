/**
 * Phase 1A.1 — comms-imap-poll security & reliability contract.
 *
 * Pure-unit coverage of the poller's endpoint authorization, UID checkpoint
 * rules, network deadlines and IMAP credential encoding. No network, no
 * mailbox, no database.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  authorizeSchedulerRequest,
  checkpointDecision,
  imapQuote,
  isUniqueViolation,
  processUidBatch,
  readUntil,
  TimeoutError,
  withDeadline,
  type ByteConn,
} from '../../supabase/functions/comms-imap-poll/core';

const SECRET = 'scheduler-secret-value-that-is-long-enough';

describe('endpoint authorization', () => {
  it('rejects an unauthenticated request with 401', () => {
    const r = authorizeSchedulerRequest('POST', null, SECRET);
    expect(r).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
  });

  it('rejects an incorrect secret with 401', () => {
    const r = authorizeSchedulerRequest('POST', 'wrong-secret-wrong-secret-wrong-x', SECRET);
    expect(r.ok).toBe(false);
    expect((r as { status: number }).status).toBe(401);
  });

  it('rejects an ordinary browser GET before any mailbox connection', () => {
    const r = authorizeSchedulerRequest('GET', SECRET, SECRET);
    expect((r as { status: number }).status).toBe(405);
  });

  it('rejects a browser CORS pre-flight (OPTIONS)', () => {
    const r = authorizeSchedulerRequest('OPTIONS', null, SECRET);
    expect((r as { status: number }).status).toBe(405);
  });

  it('refuses to run when the scheduler secret is unset', () => {
    const r = authorizeSchedulerRequest('POST', 'anything', undefined);
    expect((r as { status: number }).status).toBe(500);
  });

  it('refuses to accept the service-role key as the polling secret', () => {
    const r = authorizeSchedulerRequest('POST', SECRET, SECRET, SECRET);
    expect((r as { status: number }).status).toBe(500);
  });

  it('accepts a correct server-to-server POST', () => {
    expect(authorizeSchedulerRequest('POST', SECRET, SECRET, 'service-role-key')).toEqual({ ok: true });
  });
});

describe('UID checkpoint handling', () => {
  it('treats only PostgreSQL 23505 as a duplicate, never message wording', () => {
    expect(isUniqueViolation({ code: '23505', message: 'x' })).toBe(true);
    expect(isUniqueViolation({ code: '23503', message: 'duplicate key value' })).toBe(false);
    expect(isUniqueViolation({ message: 'duplicate' })).toBe(false);
  });

  it('advances on stored rows and real duplicates only', () => {
    expect(checkpointDecision(null)).toEqual({ outcome: 'stored', advance: true, halt: false });
    expect(checkpointDecision({ code: '23505' })).toEqual({ outcome: 'duplicate', advance: true, halt: false });
    expect(checkpointDecision({ code: '08006', message: 'connection failure' }))
      .toEqual({ outcome: 'failed', advance: false, halt: true });
  });

  it('retries the failed UID on the next run after a database insert failure', async () => {
    const stored = new Set<number>();
    const failOnce = new Set<number>([12]);
    const handle = async (uid: number) => {
      if (failOnce.has(uid)) {
        failOnce.delete(uid);
        return { error: { code: '53300', message: 'too many connections' } };
      }
      if (stored.has(uid)) return { error: { code: '23505', message: 'unique' } };
      stored.add(uid);
      return { error: null };
    };

    const first = await processUidBatch([11, 12, 13], 10, handle);
    expect(first.imported).toBe(1);
    expect(first.halted).toBe(true);
    expect(first.failedUid).toBe(12);
    expect(first.lastUid).toBe(11); // checkpoint stops before the failed UID
    expect(stored.has(12)).toBe(false);
    expect(stored.has(13)).toBe(false);

    // Next run resumes from the retained checkpoint and picks 12 up again.
    const second = await processUidBatch([12, 13], first.lastUid, handle);
    expect(second.halted).toBe(false);
    expect(second.imported).toBe(2);
    expect(second.lastUid).toBe(13);
    expect(stored.has(12)).toBe(true);
  });
});

describe('IMAP credential encoding', () => {
  it('escapes quotes and backslashes in passwords', () => {
    expect(imapQuote('pa"ss')).toBe('"pa\\"ss"');
    expect(imapQuote('pa\\ss')).toBe('"pa\\\\ss"');
    expect(imapQuote('p"a\\s s')).toBe('"p\\"a\\\\s s"');
  });

  it('produces a single well-formed LOGIN command', () => {
    const line = `LOGIN ${imapQuote('user@example.com')} ${imapQuote('a"b\\c')}`;
    expect(line).toBe('LOGIN "user@example.com" "a\\"b\\\\c"');
    expect(line.includes('\r')).toBe(false);
  });
});

/** A socket that never yields data, to simulate a stalled peer. */
function stalledConn() {
  let closed = false;
  const conn: ByteConn = {
    read: () => new Promise<number | null>(() => {}),
    write: async (p) => p.length,
    close: () => { closed = true; },
  };
  return { conn, isClosed: () => closed };
}

describe('network deadlines', () => {
  it('times out a stalled connect and reports the stage', async () => {
    await expect(
      withDeadline(new Promise(() => {}), 20, 'connect'),
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it('times out a stalled authentication response and closes the socket', async () => {
    const { conn, isClosed } = stalledConn();
    await expect(readUntil(conn, () => true, 20, 'auth')).rejects.toBeInstanceOf(TimeoutError);
    expect(isClosed()).toBe(true);
  });

  it('times out a stalled command response and closes the socket', async () => {
    const { conn, isClosed } = stalledConn();
    const err = await readUntil(conn, () => true, 20, 'command').catch((e) => e);
    expect(err).toBeInstanceOf(TimeoutError);
    expect(String(err)).toContain('command');
    expect(isClosed()).toBe(true);
  });

  it('returns normally when data arrives before the deadline', async () => {
    const enc = new TextEncoder();
    let sent = false;
    const conn: ByteConn = {
      read: async (p) => {
        if (sent) return null;
        sent = true;
        const b = enc.encode('p1 OK done\r\n');
        p.set(b);
        return b.length;
      },
      write: async (p) => p.length,
      close: vi.fn(),
    };
    const res = await readUntil(conn, (b) => b.includes('OK'), 1000, 'command');
    expect(res).toContain('p1 OK done');
  });
});
