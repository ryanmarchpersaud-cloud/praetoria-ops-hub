// Phase 1C.1 — READ-ONLY IMAP folder discovery for the staging mailbox.
//
// Guarantees:
//  * POST only. Authorized either by the dedicated COMMS_SCHEDULER_SECRET
//    header (server-to-server) or by an owner/admin session (manual run).
//  * Issues CAPABILITY and LIST only. Never CREATE / RENAME / SUBSCRIBE /
//    DELETE / APPEND / STORE, never selects a mailbox, never sends mail.
//  * The Sent folder is taken from the server's \Sent SPECIAL-USE attribute.
//    Zero or multiple candidates fail closed and require owner selection.
//  * Targets the active pilot mailbox (production when the pilot is enabled).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  authorizeSchedulerRequest,
  imapQuote,
  readUntil,
  withDeadline,
} from "../_shared/comms/imapNet.ts";
import {
  buildListCommand,
  discoverSentFolder,
  parseListResponse,
  serverSupportsSpecialUse,
} from "../_shared/comms/folderDiscovery.ts";
import { corsHeaders, requireAuth, requireRole } from "../_shared/auth.ts";
import { credentialEnvNames, selectTargetMailbox } from "../_shared/comms/mailboxTarget.ts";

const enc = new TextEncoder();
const CONNECT_TIMEOUT_MS = 10_000;
const AUTH_TIMEOUT_MS = 15_000;
const COMMAND_TIMEOUT_MS = 20_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gate = authorizeSchedulerRequest(
    req.method,
    req.headers.get("x-comms-scheduler-secret"),
    Deno.env.get("COMMS_SCHEDULER_SECRET_CRON") ?? Deno.env.get("COMMS_SCHEDULER_SECRET"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
  if (!gate.ok) {
    // Fall back to an authenticated owner/admin session for manual runs.
    const auth = await requireAuth(req);
    if (!auth.ok) return json({ error: "Unauthorized" }, 401);
    const roleGate = await requireRole(auth, ["admin", "owner"]);
    if (!roleGate.ok) return json({ error: "Forbidden" }, 403);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: settings } = await supabase
    .from("comms_settings").select("production_pilot_enabled").eq("id", true).maybeSingle();
  const { data: mailboxRows } = await supabase
    .from("comms_mailboxes").select("*").eq("is_active", true);
  const target = selectTargetMailbox(mailboxRows ?? [], settings?.production_pilot_enabled === true);
  if (!target.ok) return json({ error: target.reason }, 404);
  const mailbox = target.mailbox;

  const envNames = credentialEnvNames(mailbox.credential_secret_prefix);
  if (!envNames.ok) return json({ error: envNames.reason }, 500);
  const user = Deno.env.get(envNames.userVar);
  const pass = Deno.env.get(envNames.passVar);
  if (!user || !pass) return json({ error: "Mailbox secrets not configured" }, 500);

  const audit = (event: string, detail?: string, metadata?: Record<string, unknown>) =>
    supabase.from("comms_audit_log").insert({ mailbox_id: mailbox.id, event, detail, metadata });

  let conn: Deno.TlsConn | null = null;
  try {
    conn = await withDeadline(
      Deno.connectTls({ hostname: mailbox.imap_host, port: mailbox.imap_port }),
      CONNECT_TIMEOUT_MS,
      "connect",
    );
    await readUntil(conn, (b) => b.includes("\r\n"), CONNECT_TIMEOUT_MS, "greeting");

    let tagN = 0;
    const cmd = async (line: string, timeoutMs = COMMAND_TIMEOUT_MS, stage = "command") => {
      const tag = `d${++tagN}`;
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

    await cmd(`LOGIN ${imapQuote(user)} ${imapQuote(pass)}`, AUTH_TIMEOUT_MS, "auth");
    const capability = await cmd("CAPABILITY");
    const listRes = await cmd(buildListCommand(serverSupportsSpecialUse(capability)));
    try { await cmd("LOGOUT", 5000, "logout"); } catch { /* ignore */ }

    const entries = parseListResponse(listRes);
    const result = discoverSentFolder(entries);
    const snapshot = entries.map((e) => ({ name: e.name, attributes: e.attributes, delimiter: e.delimiter }));

    if (!result.ok) {
      await supabase.from("comms_mailboxes").update({
        sent_folder: null,
        sent_folder_source: null,
        sent_folder_verified_at: null,
        sent_folder_selection_required: true,
        sent_folder_candidates: result.candidates,
        folder_list_snapshot: snapshot,
      }).eq("id", mailbox.id);
      await audit("sent_folder_discovery_failed", result.reason, { candidates: result.candidates });
      return json({ ok: false, reason: result.reason, candidates: result.candidates, folders: snapshot }, 409);
    }

    await supabase.from("comms_mailboxes").update({
      sent_folder: result.name,
      sent_folder_source: "special_use",
      sent_folder_verified_at: new Date().toISOString(),
      sent_folder_selection_required: false,
      sent_folder_candidates: [result.name],
      folder_list_snapshot: snapshot,
    }).eq("id", mailbox.id);
    await audit("sent_folder_discovered", result.name, { raw: result.entry.raw });

    return json({
      ok: true,
      sent_folder: result.name,
      source: "special_use",
      list_line: result.entry.raw,
      folders: snapshot,
    });
  } catch (e) {
    const msg = String(e).replaceAll(pass, "<REDACTED>").replaceAll(user, "<REDACTED>");
    await audit("sent_folder_discovery_error", msg);
    return json({ error: msg }, 500);
  } finally {
    try { conn?.close(); } catch { /* closed */ }
  }
});
