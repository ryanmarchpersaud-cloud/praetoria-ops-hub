import { describe, it, expect } from 'vitest';
import {
  parseListResponse,
  discoverSentFolder,
  encodeModifiedUtf7,
  decodeModifiedUtf7,
  quoteMailbox,
  isSafeMailboxName,
  buildListCommand,
  serverSupportsSpecialUse,
} from '../../supabase/functions/_shared/comms/folderDiscovery.ts';
import {
  appendDecision,
  appendOutcome,
  buildAppendCommand,
  buildDuplicateSearch,
  buildSentFolderExamine,
  requireVerifiedSentFolder,
  MAX_APPEND_ATTEMPTS,
} from '../../supabase/functions/_shared/comms/sentFolder.ts';

/** Phase 1C.1 — Sent-folder discovery. Synthetic LIST responses only. */

const ionos = [
  '* LIST (\\HasNoChildren \\Drafts) "/" "Drafts"',
  '* LIST (\\HasNoChildren) "/" "INBOX"',
  '* LIST (\\HasNoChildren \\Sent) "/" "Sent Items"',
  '* LIST (\\HasNoChildren \\Junk) "/" "Spam"',
  '* LIST (\\HasNoChildren \\Trash) "/" "Trash"',
  'd3 OK LIST completed',
].join('\r\n');

describe('LIST parsing and SPECIAL-USE discovery', () => {
  it('requests SPECIAL-USE only when advertised', () => {
    expect(serverSupportsSpecialUse('* CAPABILITY IMAP4rev1 SPECIAL-USE')).toBe(true);
    expect(buildListCommand(true)).toBe('LIST "" "*" RETURN (SPECIAL-USE)');
    expect(buildListCommand(false)).toBe('LIST "" "*"');
  });

  it('discovers "Sent Items" from the staging-style folder set', () => {
    const r = discoverSentFolder(parseListResponse(ionos));
    expect(r).toMatchObject({ ok: true, name: 'Sent Items', source: 'special_use' });
  });

  it('discovers a folder plainly named "Sent"', () => {
    const r = discoverSentFolder(parseListResponse('* LIST (\\Sent) "/" "Sent"'));
    expect(r).toMatchObject({ ok: true, name: 'Sent' });
  });

  it('handles folder names containing spaces and nesting', () => {
    const r = discoverSentFolder(parseListResponse('* LIST (\\Sent) "/" "INBOX/Sent Mail Archive"'));
    expect((r as { name: string }).name).toBe('INBOX/Sent Mail Archive');
    expect(buildAppendCommand({ name: 'INBOX/Sent Mail Archive', source: 'special_use', verifiedAt: 'x' }, 'a'))
      .toContain('"INBOX/Sent Mail Archive"');
  });

  it('fails closed when no folder claims \\Sent — never falls back to "Sent"', () => {
    const r = discoverSentFolder(parseListResponse('* LIST (\\HasNoChildren) "/" "INBOX"\r\n* LIST () "/" "Sent"'));
    expect(r).toMatchObject({ ok: false, reason: 'no_sent_folder' });
    expect(JSON.stringify(r)).not.toContain('"name"');
  });

  it('fails closed when multiple folders claim \\Sent', () => {
    const r = discoverSentFolder(parseListResponse(
      '* LIST (\\Sent) "/" "Sent"\r\n* LIST (\\Sent) "/" "Sent Items"',
    ));
    expect(r).toMatchObject({ ok: false, reason: 'multiple_sent_folders' });
    expect((r as { candidates: string[] }).candidates).toEqual(['Sent', 'Sent Items']);
  });

  it('rejects malformed / injection-style folder names', () => {
    expect(isSafeMailboxName('Sent"\r\nA001 DELETE INBOX')).toBe(false);
    expect(isSafeMailboxName('Sent\u0000')).toBe(false);
    expect(() => quoteMailbox('Sent\r\nA1 CREATE evil')).toThrow();
    const r = discoverSentFolder([
      { attributes: ['\\Sent'], delimiter: '/', name: 'Sent\r\nA1 DELETE INBOX', raw: 'x' },
    ]);
    expect(r).toMatchObject({ ok: false, reason: 'unsafe_folder_name' });
  });

  it('ignores non-LIST noise lines', () => {
    expect(parseListResponse('* OK hi\r\nd1 OK done')).toHaveLength(0);
  });
});

describe('non-ASCII mailbox names (modified UTF-7)', () => {
  it('round-trips accented and CJK names', () => {
    for (const name of ['Éléments envoyés', '已发送', 'Gesendet & Archiv']) {
      expect(decodeModifiedUtf7(encodeModifiedUtf7(name))).toBe(name);
    }
  });

  it('decodes a server-encoded LIST name and re-encodes it for commands', () => {
    const line = '* LIST (\\Sent) "/" "&AMk-l&AOk-ments envoy&AOk-s"';
    const r = discoverSentFolder(parseListResponse(line));
    expect((r as { name: string }).name).toBe('Éléments envoyés');
    expect(quoteMailbox('Éléments envoyés')).toBe('"&AMk-l&AOk-ments envoy&AOk-s"');
  });

  it('escapes a literal ampersand', () => {
    expect(encodeModifiedUtf7('Sent & Saved')).toBe('Sent &- Saved');
    expect(decodeModifiedUtf7('Sent &- Saved')).toBe('Sent & Saved');
  });
});

describe('Sent-copy always uses the verified per-mailbox folder', () => {
  const verified = { name: 'Sent Items', source: 'special_use' as const, verifiedAt: '2026-09-03T00:00:00Z' };

  it('refuses an unverified mailbox instead of defaulting to "Sent"', () => {
    expect(() => requireVerifiedSentFolder({ sent_folder: null })).toThrow('sent_folder_not_verified');
    expect(() => requireVerifiedSentFolder({
      sent_folder: 'Sent', sent_folder_source: null, sent_folder_verified_at: null,
    })).toThrow('sent_folder_not_verified');
    expect(requireVerifiedSentFolder({
      sent_folder: 'Sent Items', sent_folder_source: 'special_use', sent_folder_verified_at: 'x',
    }).name).toBe('Sent Items');
  });

  it('skips the append when the folder is unverified', () => {
    const d = appendDecision({
      sendState: 'sent', sentCopyEnabled: true, messageIdHeader: '<a@b>',
      existsInSentFolder: false, attempts: 0, sentFolder: null,
    });
    expect(d).toEqual({ action: 'skip', status: 'failed', reason: 'sent_folder_not_verified' });
  });

  it('examines and searches the discovered folder', () => {
    expect(buildSentFolderExamine(verified)).toBe('EXAMINE "Sent Items"');
    expect(buildDuplicateSearch(verified, '<m1@praetoriagroup.ca>'))
      .toBe('UID SEARCH HEADER "Message-ID" "<m1@praetoriagroup.ca>"');
  });

  it('treats a duplicate Message-ID as skipped, not appended', () => {
    const d = appendDecision({
      sendState: 'sent', sentCopyEnabled: true, messageIdHeader: '<dup@x>',
      existsInSentFolder: true, attempts: 0, sentFolder: verified,
    });
    expect(d).toEqual({ action: 'skip', status: 'skipped_duplicate', reason: 'duplicate_message_id' });
  });

  it('preserves the exact accepted RFC822 octet count', () => {
    const rfc822 = 'Subject: Ünicode\r\nMessage-ID: <a@b>\r\n\r\nbody\r\n';
    const octets = new TextEncoder().encode(rfc822).length;
    expect(buildAppendCommand(verified, rfc822)).toBe(`APPEND "Sent Items" (\\Seen) {${octets}}`);
  });

  it('never resends the email when APPEND fails', () => {
    const first = appendOutcome(false, 1);
    expect(first).toMatchObject({ sent_copy_status: 'sent_copy_pending', retry_append_only: true, resend_email: false });
    const last = appendOutcome(false, MAX_APPEND_ATTEMPTS);
    expect(last).toMatchObject({ sent_copy_status: 'failed', retry_append_only: false, resend_email: false });
  });
});
