import { describe, it, expect } from 'vitest';
import {
  parseMessage,
  decodeMimeWords,
  parseAddress,
  htmlToPlainText,
  threadChain,
  MAX_BODY_CHARS,
} from '../../supabase/functions/_shared/comms/mime.ts';
import { sanitizeEmailHtml } from '../../supabase/functions/_shared/comms/htmlSanitize.ts';

/** Phase 1C — synthetic fixtures only. No real customer mail. */

const CRLF = '\r\n';
const msg = (lines: string[]) => lines.join(CRLF);

describe('encoded subjects and sender names', () => {
  it('decodes UTF-8 Base64 encoded words', () => {
    expect(decodeMimeWords('=?UTF-8?B?w4l0w6kgLSBEw6luZWlnZW1lbnQ=?=')).toBe('Été - Déneigement');
  });

  it('decodes quoted-printable encoded words with underscores as spaces', () => {
    expect(decodeMimeWords('=?utf-8?Q?Snow_=26_Ice_R=C3=A9port?=')).toBe('Snow & Ice Réport');
  });

  it('leaves plain ASCII subjects untouched', () => {
    expect(decodeMimeWords('Quote request')).toBe('Quote request');
  });

  it('decodes an encoded display name in a From header', () => {
    const a = parseAddress('=?UTF-8?B?SsOpcsO0bWUgVHJlbWJsYXk=?= <Jerome@Example.COM>');
    expect(a.name).toBe('Jérôme Tremblay');
    expect(a.address).toBe('jerome@example.com');
  });

  it('handles a bare address with no display name', () => {
    expect(parseAddress('someone@example.com')).toEqual({ name: null, address: 'someone@example.com' });
  });
});

describe('transfer encodings', () => {
  it('decodes a quoted-printable body', () => {
    const raw = msg([
      'From: a@example.com',
      'Subject: QP',
      'Content-Type: text/plain; charset="utf-8"',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      'Cost is 250=2E00 =E2=80=94 fin=',
      'al.',
    ]);
    expect(parseMessage(raw).text).toBe('Cost is 250.00 — final.');
  });

  it('decodes a Base64 body', () => {
    const b64 = btoa(unescape(encodeURIComponent('Bonjour — accepté')));
    const raw = msg([
      'From: a@example.com',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64,
    ]);
    expect(parseMessage(raw).text).toBe('Bonjour — accepté');
  });
});

describe('multipart and nested MIME', () => {
  const multipart = msg([
    'From: Client <client@example.com>',
    'To: staging@praetoriagroup.ca',
    'Subject: =?UTF-8?Q?Multipart_test?=',
    'Message-ID: <m1@example.com>',
    'Content-Type: multipart/alternative; boundary="BB"',
    '',
    '--BB',
    'Content-Type: text/plain; charset=utf-8',
    '',
    'Plain version.',
    '--BB',
    'Content-Type: text/html; charset=utf-8',
    '',
    '<p>HTML version.</p>',
    '--BB--',
    '',
  ]);

  it('extracts both plain-text and HTML alternatives', () => {
    const p = parseMessage(multipart);
    expect(p.text).toBe('Plain version.');
    expect(p.html).toContain('HTML version.');
    expect(p.malformed).toBe(false);
  });

  it('prefers plain text for display', () => {
    const p = parseMessage(multipart);
    const displayed = p.text ?? htmlToPlainText(p.html ?? '');
    expect(displayed).toBe('Plain version.');
  });

  it('falls back to derived plain text when only HTML exists', () => {
    const raw = msg([
      'From: a@example.com',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<div>Line one<br>Line two</div>',
    ]);
    const p = parseMessage(raw);
    expect(p.text).toBeNull();
    expect(htmlToPlainText(p.html!)).toBe('Line one\nLine two');
  });

  it('parses a nested message/rfc822 forward', () => {
    const raw = msg([
      'From: fwd@example.com',
      'Subject: Fwd: original',
      'Content-Type: multipart/mixed; boundary="OUT"',
      '',
      '--OUT',
      'Content-Type: text/plain',
      '',
      'See attached original.',
      '--OUT',
      'Content-Type: message/rfc822',
      '',
      'From: orig@example.com',
      'Subject: original',
      'Content-Type: text/plain',
      '',
      'Inner body text.',
      '--OUT--',
      '',
    ]);
    const p = parseMessage(raw);
    expect(p.notes).toContain('nested_rfc822');
    expect(p.text).toContain('See attached original.');
    expect(p.text).toContain('Inner body text.');
  });

  it('records attachments without decoding or opening them', () => {
    const raw = msg([
      'From: a@example.com',
      'Content-Type: multipart/mixed; boundary="MM"',
      '',
      '--MM',
      'Content-Type: text/plain',
      '',
      'Body.',
      '--MM',
      'Content-Type: application/pdf; name="quote.pdf"',
      'Content-Disposition: attachment; filename="quote.pdf"',
      'Content-Transfer-Encoding: base64',
      '',
      btoa('%PDF-1.4 fake'),
      '--MM--',
      '',
    ]);
    const p = parseMessage(raw);
    expect(p.attachments).toHaveLength(1);
    expect(p.attachments[0]).toMatchObject({ filename: 'quote.pdf', mimeType: 'application/pdf' });
    expect(p.text).toBe('Body.');
  });
});

describe('threading headers', () => {
  it('captures Message-ID, In-Reply-To and References', () => {
    const raw = msg([
      'From: admin@praetoriagroup.ca',
      'Subject: Re: Praetoria staging mail test',
      'Message-ID: <reply-2@praetoriagroup.ca>',
      'In-Reply-To: <orig-1@praetoriagroup.ca>',
      'References: <root-0@praetoriagroup.ca>',
      '\t<orig-1@praetoriagroup.ca>',
      '',
      'Reply body.',
    ]);
    const p = parseMessage(raw);
    expect(p.messageId).toBe('<reply-2@praetoriagroup.ca>');
    expect(p.inReplyTo).toBe('<orig-1@praetoriagroup.ca>');
    expect(p.references).toEqual(['<root-0@praetoriagroup.ca>', '<orig-1@praetoriagroup.ca>']);
    expect(threadChain(p)).toEqual(['<root-0@praetoriagroup.ca>', '<orig-1@praetoriagroup.ca>']);
  });
});

describe('long and malformed messages', () => {
  it('truncates a very long body and flags it', () => {
    const raw = msg([
      'From: a@example.com',
      'Content-Type: text/plain',
      '',
      'x'.repeat(MAX_BODY_CHARS + 5000),
    ]);
    const p = parseMessage(raw);
    expect(p.text!.length).toBe(MAX_BODY_CHARS);
    expect(p.truncated).toBe(true);
  });

  it('does not throw on a multipart declaration with a missing boundary', () => {
    const raw = msg(['From: a@example.com', 'Content-Type: multipart/mixed', '', 'orphan text']);
    const p = parseMessage(raw);
    expect(p.malformed).toBe(true);
    expect(p.text).toContain('orphan text');
  });

  it('does not throw on garbage input', () => {
    const p = parseMessage('\u0000\u0001 not an email at all');
    expect(p.malformed).toBe(true);
    expect(p.text).not.toBeUndefined();
  });

  it('does not throw on an empty message', () => {
    expect(() => parseMessage('')).not.toThrow();
  });
});

describe('server-side HTML sanitisation', () => {
  it('removes scripts and their content', () => {
    const r = sanitizeEmailHtml('<p>Hi</p><script>alert(1)</script>');
    expect(r.html).not.toContain('script');
    expect(r.html).toContain('<p>Hi</p>');
    expect(r.removedTags).toContain('script');
  });

  it('removes inline event handlers', () => {
    const r = sanitizeEmailHtml('<p onclick="steal()">Hi</p>');
    expect(r.html).not.toContain('onclick');
    expect(r.removedEventHandlers).toBe(1);
  });

  it('strips javascript: links', () => {
    const r = sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>');
    expect(r.html).not.toContain('javascript:');
  });

  it('keeps safe https links but adds rel protections', () => {
    const r = sanitizeEmailHtml('<a href="https://example.com">x</a>');
    expect(r.html).toContain('href="https://example.com"');
    expect(r.html).toContain('noopener');
  });

  it('blocks remote images by default', () => {
    const r = sanitizeEmailHtml('<img src="https://tracker.example.com/a.png" width="600" height="200">');
    expect(r.html).not.toContain('tracker.example.com');
    expect(r.blockedRemoteImages).toBe(1);
  });

  it('drops 1x1 tracking pixels entirely', () => {
    const r = sanitizeEmailHtml('<img src="https://t.example.com/p.gif" width="1" height="1">');
    expect(r.blockedTrackingPixels).toBe(1);
    expect(r.html).not.toContain('img');
  });

  it('removes iframes, objects and forms', () => {
    const r = sanitizeEmailHtml('<iframe src="x"></iframe><object></object><form></form>');
    expect(r.html).toBe('');
  });
});
