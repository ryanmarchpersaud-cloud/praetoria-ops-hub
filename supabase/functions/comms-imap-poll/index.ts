// Phase 1A.1 — bounded, READ-ONLY IONOS IMAP poller (staging mailbox only).
//
// Guarantees:
//  * Server-to-server only: POST + dedicated COMMS_SCHEDULER_SECRET header.
//    No CORS, no browser access, no OPTIONS pre-flight surface.
//  * Global pause switch: comms_settings.polling_enabled must be true.
//  * Overlap protection: a lock row with expiry in comms_sync_state.
//  * Read-only: EXAMINE + BODY.PEEK only. Never sets flags, moves, appends or deletes.
//  * UID checkpoint advances only on a stored row or PostgreSQL 23505.
//  * Hard network deadlines on connect, auth and every command response.
//  * Never sends mail. No AI. No production mailbox.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  authorizeSchedulerRequest,
  processUidBatch,
  extractPlainText,
  headerValue,
  imapQuote,
  parseFrom,
  readLiteral,
  readUntil,
  withDeadline,
} from "./core.ts";
import { credentialEnvNames, selectTargetMailbox } from "../_shared/comms/mailboxTarget.ts";

const enc = new TextEncoder();
const LOCK_SECONDS = 240;
const CONNECT_TIMEOUT_MS = 10_000;
const AUTH_TIMEOUT_MS = 15_000;
const COMMAND_TIMEOUT_MS = 20_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  // 0. Endpoint authorization — POST + scheduler secret. No browser path.
  const gate = authorizeSchedulerRequest(
    req.method,
    req.headers.get("x-comms-scheduler-secret"),
    [Deno.env.get("COMMS_SCHEDULER_SECRET"), Deno.env.get("COMMS_SCHEDULER_SECRET_CRON")],
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
  if (!gate.ok) return json({ error: gate.error }, gate.status);


  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* no body */ }
  const oneShot = body?.one_shot === true;

  // One-shot mode may temporarily lift the global pause switch. The switch is
  // ALWAYS forced back to false in the finally block, including on failure.
  let mustRestorePause = false;
  try {
    return await runPoll(supabase, oneShot, () => { mustRestorePause = true; });
  } finally {
    if (mustRestorePause) {
      try {
        await supabase.from("comms_settings")
          .update({ polling_enabled: false, updated_at: new Date().toISOString() })
          .eq("id", true);
      } catch { /* best effort — see cleanup verification below */ }
    }
  }
});

async function runPoll(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  oneShot: boolean,
  markRestore: () => void,
): Promise<Response> {
  // 1. Global pause switch
  const { data: settings } = await supabase.from("comms_settings").select("*").eq("id", true).maybeSingle();
  if (!settings?.polling_enabled) {
    if (!oneShot) return json({ skipped: true, reason: "polling_disabled" });
    markRestore();
    await supabase.from("comms_settings")
      .update({ polling_enabled: true, updated_at: new Date().toISOString() })
      .eq("id", true);
  }
  const maxMessages = Math.min(settings?.max_messages_per_run ?? 25, 100);


  // 2. Resolve the target mailbox. Production pilot ON => the single active
  //    production mailbox, never a staging fallback. OFF => staging only.
  const productionPilot = settings?.production_pilot_enabled === true;
  const { data: mailboxRows, error: mailboxError } = await supabase
    .from("comms_mailboxes")
    .select("*")
    .eq("is_active", true);
  if (mailboxError) return json({ error: mailboxError.message }, 500);

  const target = selectTargetMailbox(mailboxRows ?? [], productionPilot);
  if (!target.ok) return json({ skipped: true, reason: target.reason });
  const mailbox = target.mailbox;
  if (mailbox.inbound_enabled === false) {
    return json({ skipped: true, reason: "inbound_disabled" });
  }

  const envNames = credentialEnvNames(mailbox.credential_secret_prefix);
  if (!envNames.ok) return json({ error: envNames.reason }, 500);
  const user = Deno.env.get(envNames.userVar);
  const pass = Deno.env.get(envNames.passVar);
  if (!user || !pass) return json({ error: "Mailbox secrets not configured" }, 500);


  await supabase.from("comms_sync_state").upsert(
    { mailbox_id: mailbox.id, folder: "INBOX" },
    { onConflict: "mailbox_id", ignoreDuplicates: true },
  );

  // 3. Overlap protection — claim the lock only if free or expired
  const nowIso = new Date().toISOString();
  const lockUntil = new Date(Date.now() + LOCK_SECONDS * 1000).toISOString();
  const { data: locked } = await supabase
    .from("comms_sync_state")
    .update({ is_running: true, lock_expires_at: lockUntil, updated_at: nowIso })
    .eq("mailbox_id", mailbox.id)
    .or(`is_running.eq.false,lock_expires_at.lt.${nowIso}`)
    .select()
    .maybeSingle();

  if (!locked) return json({ skipped: true, reason: "already_running" });

  const release = async (status: string, error?: string, patch: Record<string, unknown> = {}) => {
    await supabase
      .from("comms_sync_state")
      .update({
        is_running: false,
        lock_expires_at: null,
        last_run_at: new Date().toISOString(),
        last_run_status: status,
        last_error: error ?? null,
        updated_at: new Date().toISOString(),
        ...patch,
      })
      .eq("mailbox_id", mailbox!.id);
  };

  const audit = (event: string, detail?: string, metadata?: Record<string, unknown>) =>
    supabase.from("comms_audit_log").insert({ mailbox_id: mailbox!.id, event, detail, metadata });

  await audit("poll_started");

  let conn: Deno.TlsConn | null = null;
  let imported = 0;
  let halted = false;
  try {
    conn = await withDeadline(
      Deno.connectTls({ hostname: mailbox.imap_host, port: mailbox.imap_port }),
      CONNECT_TIMEOUT_MS,
      "connect",
    );
    await readUntil(conn, (b) => b.includes("\r\n"), CONNECT_TIMEOUT_MS, "greeting");

    let tagN = 0;
    const cmd = async (line: string, timeoutMs = COMMAND_TIMEOUT_MS, stage = "command") => {
      const tag = `p${++tagN}`;
      await withDeadline(conn!.write(enc.encode(`${tag} ${line}\r\n`)), timeoutMs, `${stage}-write`, () => {
        try { conn?.close(); } catch { /* already closed */ }
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

    // Credentials are quoted per RFC 3501 so quotes/backslashes are safe.
    await cmd(`LOGIN ${imapQuote(user)} ${imapQuote(pass)}`, AUTH_TIMEOUT_MS, "auth");
    const examine = await cmd("EXAMINE INBOX"); // read-only select

    const uidValidity = Number(examine.match(/UIDVALIDITY (\d+)/)?.[1] ?? 0);
    let lastUid = Number(locked.last_seen_uid ?? 0);
    if (locked.uid_validity && Number(locked.uid_validity) !== uidValidity) {
      lastUid = 0; // mailbox was recreated — restart cleanly
    }

    const search = await cmd(`UID SEARCH UID ${lastUid + 1}:*`);
    const uids = (search.match(/^\* SEARCH([\d ]*)/m)?.[1] ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter((u) => u > lastUid)
      .sort((a, b) => a - b)
      .slice(0, maxMessages);

    const batch = await processUidBatch(uids, lastUid, async (uid) => {
      const res = await cmd(
        `UID FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)] BODY.PEEK[TEXT]<0.4000>)`,
      );
      const headerBlock = readLiteral(res, "HEADER.FIELDS");
      const rawBody = readLiteral(res, "TEXT");
      const bodyText = extractPlainText(rawBody).slice(0, 4000);

      const from = parseFrom(headerValue(headerBlock, "From"));
      const dateRaw = headerValue(headerBlock, "Date");
      const sentAt = dateRaw ? new Date(dateRaw) : null;

      const inReplyTo = headerValue(headerBlock, "In-Reply-To");
      const references = headerValue(headerBlock, "References");

      // Thread association: match In-Reply-To / References against our sent Message-IDs.
      let replyToOutboundId: string | null = null;
      const candidates = [
        ...(inReplyTo?.match(/<[^>]+>/g) ?? []),
        ...(references?.match(/<[^>]+>/g) ?? []),
      ];
      if (candidates.length > 0) {
        const { data: parent } = await supabase
          .from("comms_outbound_messages")
          .select("id")
          .in("message_id_header", candidates)
          .order("sent_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        replyToOutboundId = parent?.id ?? null;
      }

      const { error } = await supabase.from("comms_messages").insert({
        mailbox_id: mailbox!.id,
        folder: "INBOX",
        imap_uid: uid,
        uid_validity: uidValidity,
        message_id_header: headerValue(headerBlock, "Message-ID"),
        in_reply_to_header: inReplyTo,
        references_header: references,
        reply_to_outbound_id: replyToOutboundId,
        direction: "inbound",
        from_address: from.address,
        from_name: from.name,
        to_addresses: headerValue(headerBlock, "To"),
        cc_addresses: headerValue(headerBlock, "Cc"),
        subject: headerValue(headerBlock, "Subject"),
        sent_at: sentAt && !isNaN(sentAt.getTime()) ? sentAt.toISOString() : null,
        snippet: bodyText.replace(/\s+/g, " ").trim().slice(0, 200),
        body_text: bodyText,
        division: mailbox!.division,
        assigned_rep_user_id: mailbox!.assigned_rep_user_id,
      });


      if (!error) await audit("message_imported", `uid ${uid}`);
      else if ((error as { code?: string }).code === "23505") await audit("message_duplicate", `uid ${uid}`);
      else await audit("message_import_error", error.message, { uid });

      return { error };
    });

    imported = batch.imported;
    halted = batch.halted;
    lastUid = batch.lastUid;
    const scanned = batch.scanned;


    try {
      await cmd("LOGOUT", 5000, "logout");
    } catch { /* ignore */ }

    const status = halted ? "partial_error" : "ok";
    await release(status, halted ? "insert_failed_uid_retained" : undefined, {
      last_seen_uid: lastUid,
      uid_validity: uidValidity,
    });
    await audit("poll_finished", `${imported} imported`, { imported, scanned, halted });
    return json({ ok: !halted, imported, scanned, last_seen_uid: lastUid, halted });
  } catch (e) {
    const msg = String(e).replaceAll(pass, "<REDACTED>").replaceAll(user, "<REDACTED>");
    await release("error", msg);
    await audit("poll_error", msg);
    return json({ error: msg }, 500);
  } finally {
    try { conn?.close(); } catch { /* already closed */ }
  }
}

