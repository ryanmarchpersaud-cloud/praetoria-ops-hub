// Phase 1B — pure, runtime-agnostic helpers for the staging SMTP sender.
// No Deno APIs here so every rule is directly unit-testable.

export class SmtpError extends Error {
  constructor(public stage: string, public code: number, message: string) {
    super(message);
    this.name = "SmtpError";
  }
}

/** Reject anything that could smuggle a CR/LF (header injection) or control chars. */
export function isHeaderSafe(value: string): boolean {
  return !/[\r\n\u0000\u2028\u2029]/.test(value);
}

/** Collapse a header value to a single safe line, or throw. */
export function assertHeaderSafe(field: string, value: string): string {
  if (!isHeaderSafe(value)) {
    throw new Error(`Illegal characters in ${field}`);
  }
  return value.trim();
}

const EMAIL_RE = /^[^\s@<>",;]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim()) && isHeaderSafe(value);
}

export type RecipientDecision = { ok: true; address: string } | { ok: false; error: string };

/** Staging guard: single recipient, valid address, present on the allow-list. */
export function validateRecipient(raw: unknown, allowlist: string[]): RecipientDecision {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Recipient required" };
  const address = raw.trim().toLowerCase();
  if (address.includes(",") || address.includes(";")) {
    return { ok: false, error: "Only one recipient is allowed in staging mode" };
  }
  if (!isValidEmail(address)) return { ok: false, error: "Invalid recipient address" };
  const allowed = allowlist.map((a) => a.trim().toLowerCase());
  if (!allowed.includes(address)) {
    return { ok: false, error: "Recipient is not on the staging allow-list" };
  }
  return { ok: true, address };
}

/**
 * Recipient validation under an environment policy.
 * Staging always enforces its allow-list. Production enforces its allow-list
 * only when one is configured; otherwise any single valid address is allowed.
 */
export function validateRecipientForPolicy(
  raw: unknown,
  policy: { enforceAllowlist: boolean; allowlist: string[] },
): RecipientDecision {
  if (policy.enforceAllowlist) return validateRecipient(raw, policy.allowlist);
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Recipient required" };
  const address = raw.trim().toLowerCase();
  if (address.includes(",") || address.includes(";")) {
    return { ok: false, error: "Only one recipient is allowed" };
  }
  if (!isValidEmail(address)) return { ok: false, error: "Invalid recipient address" };
  return { ok: true, address };
}


export type BodyDecision = { ok: true; body: string } | { ok: false; error: string };

/** Plain text only, bounded, CRLF-normalised, dot-stuffed for SMTP DATA. */
export function normalizeBody(raw: unknown, maxChars = 20000): BodyDecision {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Message body required" };
  if (raw.length > maxChars) return { ok: false, error: "Message body is too long" };
  const body = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");
  return { ok: true, body };
}

export function dotStuff(body: string): string {
  return body.replace(/^\./gm, "..");
}

export function validateSubject(raw: unknown): { ok: true; subject: string } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Subject required" };
  if (raw.length > 200) return { ok: false, error: "Subject is too long" };
  if (!isHeaderSafe(raw)) return { ok: false, error: "Illegal characters in subject" };
  return { ok: true, subject: raw.trim() };
}

/** RFC 2047 encode a header value when it is not plain ASCII. */
export function encodeHeaderWord(value: string): string {
  // deno-lint-ignore no-control-regex
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const bytes = new TextEncoder().encode(value);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

export function newMessageId(domain: string, uuid: string): string {
  return `<${uuid}@${domain}>`;
}

/** Build In-Reply-To / References for a reply to an imported message. */
export function threadHeaders(
  parentMessageIdHeader: string | null | undefined,
  parentReferences?: string | null,
): { inReplyTo: string | null; references: string | null } {
  const parent = (parentMessageIdHeader ?? "").trim();
  if (!parent || !isHeaderSafe(parent)) return { inReplyTo: null, references: null };
  const prior = (parentReferences ?? "").trim();
  const refs = [prior, parent].filter(Boolean).join(" ").trim();
  return { inReplyTo: parent, references: refs || parent };
}

export type BuildInput = {
  fromAddress: string;
  fromName?: string | null;
  to: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string | null;
  date?: Date;
};

/** Assemble the complete RFC 5322 plain-text message. */
export function buildMimeMessage(input: BuildInput): string {
  const from = assertHeaderSafe("from", input.fromAddress);
  const to = assertHeaderSafe("to", input.to);
  const subject = encodeHeaderWord(assertHeaderSafe("subject", input.subject));
  const name = input.fromName ? encodeHeaderWord(assertHeaderSafe("from name", input.fromName)) : null;

  const headers: string[] = [
    `From: ${name ? `${name} <${from}>` : from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${(input.date ?? new Date()).toUTCString()}`,
    `Message-ID: ${assertHeaderSafe("message-id", input.messageId)}`,
  ];
  if (input.inReplyTo) headers.push(`In-Reply-To: ${assertHeaderSafe("in-reply-to", input.inReplyTo)}`);
  if (input.references) headers.push(`References: ${assertHeaderSafe("references", input.references)}`);
  headers.push("MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: 8bit");

  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

export type RateDecision = { ok: true } | { ok: false; error: string };

export function rateLimitDecision(sentInLastHour: number, maxPerHour: number): RateDecision {
  if (sentInLastHour >= maxPerHour) {
    return { ok: false, error: "Hourly staging send limit reached" };
  }
  return { ok: true };
}

/**
 * Redact anything credential-shaped out of an SMTP transcript before it is
 * stored or returned. Never log AUTH lines or base64 blobs.
 */
export function redactSmtp(transcript: string, secrets: string[] = []): string {
  let out = transcript
    .split(/\r?\n/)
    .map((line) => (/^\s*(AUTH|235|334)/i.test(line) ? line.replace(/\s.*$/, " [redacted]") : line))
    .join("\n");
  for (const s of secrets) {
    if (s && s.length > 3) out = out.split(s).join("[redacted]");
  }
  return out.slice(0, 2000);
}

/** Deterministic idempotency key validation — client supplies a UUID. */
export function isValidIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
