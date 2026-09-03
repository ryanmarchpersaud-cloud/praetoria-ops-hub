// Phase 1C — Sent-folder copy executor (IMAP APPEND of an already-accepted message).
//
// Invariants:
//  * Runs ONLY after SMTP acceptance. It can never cause an email to be sent.
//  * The folder name must come from verified SPECIAL-USE discovery. No "Sent" fallback.
//  * Duplicate protection: the Message-ID is searched before and after the append.
//  * Read-only EXAMINE is used for searching; APPEND targets the folder by name.
import { readUntil, withDeadline, imapQuote } from "./imapNet.ts";
import {
  buildAppendCommand,
  buildDuplicateSearch,
  buildSentFolderExamine,
  parseAppendUid,
  parseSearchUids,
  type SentCopyStatus,
  type VerifiedSentFolder,
} from "./sentFolder.ts";

const enc = new TextEncoder();
const CONNECT_TIMEOUT_MS = 10_000;
const AUTH_TIMEOUT_MS = 15_000;
const COMMAND_TIMEOUT_MS = 20_000;

export type SentCopyResult = {
  status: SentCopyStatus;
  folder: string;
  matchesBefore: number;
  matchesAfter: number | null;
  appendUid: { uidValidity: number; uid: number } | null;
  octets: number;
  error: string | null;
};

export type SentCopyOptions = {
  host: string;
  port: number;
  user: string;
  pass: string;
  folder: VerifiedSentFolder;
  messageId: string;
  /** The canonical RFC822 message (NOT the dot-stuffed SMTP wire form). */
  rfc822: string;
  /** When false the append is skipped and only the duplicate search runs. */
  allowAppend?: boolean;
};

export async function runSentCopy(opts: SentCopyOptions): Promise<SentCopyResult> {
  const octets = enc.encode(opts.rfc822).length;
  const result: SentCopyResult = {
    status: "sent_copy_pending",
    folder: opts.folder.name,
    matchesBefore: 0,
    matchesAfter: null,
    appendUid: null,
    octets,
    error: null,
  };

  let conn: Deno.TlsConn | null = null;
  try {
    conn = await withDeadline(
      Deno.connectTls({ hostname: opts.host, port: opts.port }),
      CONNECT_TIMEOUT_MS,
      "connect",
    );
    await readUntil(conn, (b) => b.includes("\r\n"), CONNECT_TIMEOUT_MS, "greeting");

    let tagN = 0;
    const cmd = async (line: string, timeoutMs = COMMAND_TIMEOUT_MS, stage = "command") => {
      const tag = `s${++tagN}`;
      await withDeadline(conn!.write(enc.encode(`${tag} ${line}\r\n`)), timeoutMs, `${stage}-write`, () => {
        try { conn?.close(); } catch { /* closed */ }
      });
      const res = await readUntil(
        conn!,
        (b) => new RegExp(`^${tag} (OK|NO|BAD)`, "m").test(b),
        timeoutMs,
        stage,
      );
      if (new RegExp(`^${tag} (NO|BAD)`, "m").test(res)) {
        throw new Error(res.split("\r\n").find((l) => l.startsWith(tag)) ?? "IMAP command failed");
      }
      return res;
    };

    await cmd(`LOGIN ${imapQuote(opts.user)} ${imapQuote(opts.pass)}`, AUTH_TIMEOUT_MS, "auth");

    const search = async () => {
      await cmd(buildSentFolderExamine(opts.folder), COMMAND_TIMEOUT_MS, "examine");
      const res = await cmd(buildDuplicateSearch(opts.folder, opts.messageId), COMMAND_TIMEOUT_MS, "search");
      return parseSearchUids(res);
    };

    const before = await search();
    result.matchesBefore = before.length;

    if (before.length > 0) {
      result.status = "skipped_duplicate";
      result.matchesAfter = before.length;
      try { await cmd("LOGOUT", 5_000, "logout"); } catch { /* ignore */ }
      return result;
    }

    if (opts.allowAppend === false) {
      result.status = "sent_copy_pending";
      try { await cmd("LOGOUT", 5_000, "logout"); } catch { /* ignore */ }
      return result;
    }

    // APPEND with a synchronising literal: wait for the "+" continuation.
    const appendTag = `s${++tagN}`;
    const appendLine = buildAppendCommand(opts.folder, opts.rfc822);
    await withDeadline(
      conn.write(enc.encode(`${appendTag} ${appendLine}\r\n`)),
      COMMAND_TIMEOUT_MS,
      "append-write",
      () => { try { conn?.close(); } catch { /* closed */ } },
    );
    const cont = await readUntil(
      conn,
      (b) => b.includes("+ ") || new RegExp(`^${appendTag} (OK|NO|BAD)`, "m").test(b),
      COMMAND_TIMEOUT_MS,
      "append-continuation",
    );
    if (new RegExp(`^${appendTag} (NO|BAD)`, "m").test(cont)) {
      throw new Error(cont.split("\r\n").find((l) => l.startsWith(appendTag)) ?? "APPEND rejected");
    }
    await withDeadline(
      conn.write(enc.encode(`${opts.rfc822}\r\n`)),
      COMMAND_TIMEOUT_MS,
      "append-literal",
      () => { try { conn?.close(); } catch { /* closed */ } },
    );
    const appendRes = await readUntil(
      conn,
      (b) => new RegExp(`^${appendTag} (OK|NO|BAD)`, "m").test(b),
      COMMAND_TIMEOUT_MS,
      "append-final",
    );
    if (new RegExp(`^${appendTag} (NO|BAD)`, "m").test(appendRes)) {
      throw new Error(appendRes.split("\r\n").find((l) => l.startsWith(appendTag)) ?? "APPEND failed");
    }
    result.appendUid = parseAppendUid(appendRes);

    const after = await search();
    result.matchesAfter = after.length;
    result.status = "appended";

    try { await cmd("LOGOUT", 5_000, "logout"); } catch { /* ignore */ }
    return result;
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    result.error = raw.split(opts.pass).join("[redacted]").split(opts.user).join("[redacted]").slice(0, 500);
    result.status = "sent_copy_pending";
    return result;
  } finally {
    try { conn?.close(); } catch { /* closed */ }
  }
}
