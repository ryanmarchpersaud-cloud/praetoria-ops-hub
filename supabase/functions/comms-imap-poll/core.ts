// Phase 1A.1 — pure, runtime-agnostic helpers for the staging IMAP poller.
// Kept free of Deno APIs so they can be unit-tested directly.

export class TimeoutError extends Error {
  constructor(stage: string, ms: number) {
    super(`Timed out after ${ms}ms during ${stage}`);
    this.name = "TimeoutError";
  }
}

/** Minimal socket surface used by the poller (satisfied by Deno.TlsConn). */
export interface ByteConn {
  read(p: Uint8Array): Promise<number | null>;
  write(p: Uint8Array): Promise<number>;
  close(): void;
}

export type AuthDecision = { ok: true } | { ok: false; status: number; error: string };

/**
 * Server-to-server authorization for the polling endpoint.
 * POST only, and a dedicated scheduler secret (never the service-role key)
 * supplied in the `x-comms-scheduler-secret` header.
 */
export function authorizeSchedulerRequest(
  method: string,
  headerSecret: string | null,
  expectedSecret: string | undefined | null | readonly (string | undefined | null)[],
  serviceRoleKey?: string | null,
): AuthDecision {
  if (method.toUpperCase() !== "POST") {
    return { ok: false, status: 405, error: "Method not allowed" };
  }
  const candidates = (Array.isArray(expectedSecret) ? expectedSecret : [expectedSecret])
    .filter((s): s is string => typeof s === "string" && s.length >= 24);
  if (candidates.length === 0) {
    return { ok: false, status: 500, error: "Scheduler secret not configured" };
  }
  if (serviceRoleKey && candidates.some((c) => c === serviceRoleKey)) {
    return { ok: false, status: 500, error: "Scheduler secret must not be the service-role key" };
  }
  if (!headerSecret || !candidates.some((c) => timingSafeEqual(headerSecret, c))) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}


/** Constant-time-ish string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True only for PostgreSQL unique_violation (23505) — never message-text matching. */
export function isUniqueViolation(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: string }).code === "23505";
}

/** Safely quote an IMAP astring (RFC 3501 §4.3): escape backslash and double quote. */
export function imapQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Await a promise with a hard deadline; on expiry run `onTimeout` and throw. */
export async function withDeadline<T>(
  promise: Promise<T>,
  ms: number,
  stage: string,
  onTimeout?: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try { onTimeout?.(); } catch { /* socket already gone */ }
      reject(new TimeoutError(stage, ms));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Read from the socket until `match` is satisfied. A stalled read is interrupted
 * at the deadline: the socket is closed and a TimeoutError is thrown.
 */
export async function readUntil(
  conn: ByteConn,
  match: (buffered: string) => boolean,
  timeoutMs: number,
  stage = "read",
): Promise<string> {
  const dec = new TextDecoder();
  const buf = new Uint8Array(65536);
  let acc = "";
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      try { conn.close(); } catch { /* already closed */ }
      throw new TimeoutError(stage, timeoutMs);
    }
    const n = await withDeadline(conn.read(buf), remaining, stage, () => {
      try { conn.close(); } catch { /* already closed */ }
    });
    if (n === null) return acc;
    acc += dec.decode(buf.subarray(0, n));
    if (match(acc)) return acc;
  }
}

/** Extract an IMAP literal for a given BODY[...] section. */
export function readLiteral(response: string, section: string): string {
  const marker = response.indexOf(`BODY[${section}`);
  if (marker === -1) return "";
  const braceOpen = response.indexOf("{", marker);
  const braceClose = response.indexOf("}", braceOpen);
  if (braceOpen === -1 || braceClose === -1) return "";
  const size = Number(response.slice(braceOpen + 1, braceClose));
  const start = response.indexOf("\r\n", braceClose) + 2;
  if (!Number.isFinite(size) || start < 2) return "";
  return response.slice(start, start + size);
}

export function decodeQP(s: string): string {
  return s
    .replace(/=\r\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Pull the first text/plain part out of a (possibly nested) MIME body. */
export function extractPlainText(raw: string): string {
  if (!raw) return "";
  const boundaries = [...raw.matchAll(/boundary="?([^"\r\n;]+)"?/gi)].map((m) => m[1]);
  if (boundaries.length === 0) return decodeQP(raw).trim();

  const segments = boundaries.reduce<string[]>(
    (acc, b) => acc.flatMap((s) => s.split(`--${b}`)),
    [raw],
  );

  for (const part of segments) {
    if (/Content-Type:\s*text\/plain/i.test(part)) {
      const body = part.split("\r\n\r\n").slice(1).join("\r\n\r\n");
      const decoded = /quoted-printable/i.test(part) ? decodeQP(body) : body;
      const cleaned = decoded.replace(/^--+\s*$/gm, "").trim();
      if (cleaned) return cleaned;
    }
  }
  return decodeQP(raw).trim();
}

export function headerValue(block: string, name: string): string | null {
  const re = new RegExp(`^${name}:\\s*(.*(?:\\r\\n[ \\t].*)*)`, "im");
  const m = block.match(re);
  return m ? m[1].replace(/\r\n[ \t]+/g, " ").trim() : null;
}

export function parseFrom(raw: string | null) {
  if (!raw) return { name: null as string | null, address: null as string | null };
  const m = raw.match(/^(.*?)<([^>]+)>\s*$/);
  if (m) {
    return { name: m[1].replace(/["']/g, "").trim() || null, address: m[2].trim().toLowerCase() };
  }
  return { name: null, address: raw.trim().toLowerCase() };
}

export type InsertOutcome = "stored" | "duplicate" | "failed";

/**
 * Decide whether the UID checkpoint may advance after an insert attempt.
 * Only a stored row or a genuine unique-violation (23505) advances the
 * checkpoint; anything else leaves the UID eligible for retry and halts the run.
 */
export function checkpointDecision(error: unknown): { outcome: InsertOutcome; advance: boolean; halt: boolean } {
  if (!error) return { outcome: "stored", advance: true, halt: false };
  if (isUniqueViolation(error)) return { outcome: "duplicate", advance: true, halt: false };
  return { outcome: "failed", advance: false, halt: true };
}

export type UidBatchResult = {
  lastUid: number;
  imported: number;
  duplicates: number;
  scanned: number;
  halted: boolean;
  failedUid: number | null;
};

/**
 * Walk UIDs in order, applying the checkpoint rule after each insert attempt.
 * The checkpoint never passes a UID whose row was not stored (or already
 * present), so a transient database failure leaves it eligible for retry.
 */
export async function processUidBatch(
  uids: number[],
  startUid: number,
  handle: (uid: number) => Promise<{ error: unknown }>,
): Promise<UidBatchResult> {
  const result: UidBatchResult = {
    lastUid: startUid,
    imported: 0,
    duplicates: 0,
    scanned: 0,
    halted: false,
    failedUid: null,
  };
  for (const uid of uids) {
    const { error } = await handle(uid);
    result.scanned++;
    const decision = checkpointDecision(error);
    if (decision.outcome === "stored") result.imported++;
    if (decision.outcome === "duplicate") result.duplicates++;
    if (decision.advance) result.lastUid = Math.max(result.lastUid, uid);
    if (decision.halt) {
      result.halted = true;
      result.failedUid = uid;
      break;
    }
  }
  return result;
}
