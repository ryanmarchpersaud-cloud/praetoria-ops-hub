// Phase 1A — bounded, READ-ONLY IONOS IMAP poller (staging mailbox only).
//
// Guarantees:
//  * Global pause switch: comms_settings.polling_enabled must be true.
//  * Overlap protection: a lock row with expiry in comms_sync_state.
//  * Read-only: EXAMINE + BODY.PEEK only. Never sets flags, moves, appends or deletes.
//  * Never sends mail. No AI. No production mailbox.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const enc = new TextEncoder();
const dec = new TextDecoder();
const LOCK_SECONDS = 240;

async function readUntil(conn: Deno.Conn, match: (b: string) => boolean, timeoutMs = 20000) {
  const buf = new Uint8Array(65536);
  let acc = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const n = await conn.read(buf);
    if (n === null) break;
    acc += dec.decode(buf.subarray(0, n));
    if (match(acc)) return acc;
  }
  return acc;
}

function headerValue(block: string, name: string): string | null {
  const re = new RegExp(`^${name}:\\s*(.*(?:\\r\\n[ \\t].*)*)`, "im");
  const m = block.match(re);
  return m ? m[1].replace(/\r\n[ \t]+/g, " ").trim() : null;
}

function parseFrom(raw: string | null) {
  if (!raw) return { name: null as string | null, address: null as string | null };
  const m = raw.match(/^(.*?)<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/["']/g, "").trim() || null, address: m[2].trim().toLowerCase() };
  return { name: null, address: raw.trim().toLowerCase() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // 1. Global pause switch
  const { data: settings } = await supabase.from("comms_settings").select("*").eq("id", true).maybeSingle();
  if (!settings?.polling_enabled) {
    return json({ skipped: true, reason: "polling_disabled" });
  }
  const maxMessages = Math.min(settings.max_messages_per_run ?? 25, 100);

  const user = Deno.env.get("IONOS_STAGING_EMAIL_USER");
  const pass = Deno.env.get("IONOS_STAGING_EMAIL_PASSWORD");
  if (!user || !pass) return json({ error: "Staging mailbox secrets not configured" }, 500);

  // 2. Resolve (or self-register) the single staging mailbox
  let { data: mailbox } = await supabase
    .from("comms_mailboxes")
    .select("*")
    .eq("environment", "staging")
    .eq("is_active", true)
    .maybeSingle();

  if (!mailbox) {
    const { data: created, error } = await supabase
      .from("comms_mailboxes")
      .insert({
        label: "IONOS Staging Mailbox",
        email_address: user,
        credential_secret_prefix: "IONOS_STAGING_EMAIL",
        environment: "staging",
        division: "staging",
      })
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    mailbox = created;
  }

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
  try {
    conn = await Deno.connectTls({ hostname: mailbox.imap_host, port: mailbox.imap_port });
    await readUntil(conn, (b) => b.includes("\r\n"));

    let tagN = 0;
    const cmd = async (line: string) => {
      const tag = `p${++tagN}`;
      await conn!.write(enc.encode(`${tag} ${line}\r\n`));
      const res = await readUntil(conn!, (b) => new RegExp(`^${tag} (OK|NO|BAD)`, "m").test(b));
      if (new RegExp(`^${tag} (NO|BAD)`, "m").test(res)) {
        throw new Error(res.split("\r\n").find((l) => l.startsWith(tag)) ?? "IMAP command failed");
      }
      return res;
    };

    await cmd(`LOGIN "${user}" "${pass}"`);
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

    for (const uid of uids) {
      const res = await cmd(
        `UID FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)] BODY.PEEK[TEXT]<0.4000>)`,
      );
      const headerBlock = res.split("\r\n\r\n")[1] ?? "";
      const bodyStart = res.indexOf("BODY[TEXT]");
      let bodyText = bodyStart > -1 ? res.slice(res.indexOf("}", bodyStart) + 3) : "";
      bodyText = bodyText.replace(/\r\n\)?\r\np\d+ OK[\s\S]*$/m, "").slice(0, 4000);

      const from = parseFrom(headerValue(headerBlock, "From"));
      const dateRaw = headerValue(headerBlock, "Date");
      const sentAt = dateRaw ? new Date(dateRaw) : null;

      const { error } = await supabase.from("comms_messages").insert({
        mailbox_id: mailbox.id,
        folder: "INBOX",
        imap_uid: uid,
        uid_validity: uidValidity,
        message_id_header: headerValue(headerBlock, "Message-ID"),
        direction: "inbound",
        from_address: from.address,
        from_name: from.name,
        to_addresses: headerValue(headerBlock, "To"),
        cc_addresses: headerValue(headerBlock, "Cc"),
        subject: headerValue(headerBlock, "Subject"),
        sent_at: sentAt && !isNaN(sentAt.getTime()) ? sentAt.toISOString() : null,
        snippet: bodyText.replace(/\s+/g, " ").trim().slice(0, 200),
        body_text: bodyText,
        division: mailbox.division,
        assigned_rep_user_id: mailbox.assigned_rep_user_id,
      });

      if (!error) {
        imported++;
        await audit("message_imported", `uid ${uid}`);
      } else if (!error.message.includes("duplicate")) {
        await audit("message_import_error", error.message, { uid });
      }
      lastUid = Math.max(lastUid, uid);
    }

    try {
      await cmd("LOGOUT");
    } catch { /* ignore */ }

    await release("ok", undefined, { last_seen_uid: lastUid, uid_validity: uidValidity });
    await audit("poll_finished", `${imported} imported`, { imported, scanned: uids.length });
    return json({ ok: true, imported, scanned: uids.length, last_seen_uid: lastUid });
  } catch (e) {
    const msg = String(e).replace(pass, "<REDACTED>").replace(user, "<REDACTED>");
    await release("error", msg);
    await audit("poll_error", msg);
    return json({ error: msg }, 500);
  } finally {
    try { conn?.close(); } catch { /* already closed */ }
  }
});
