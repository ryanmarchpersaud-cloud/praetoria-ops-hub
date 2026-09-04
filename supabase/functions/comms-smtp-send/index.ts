// Phase 1B — manually approved, plain-text staging email sender (IONOS SMTP 587 + STARTTLS).
//
// Guarantees:
//  * Requires a valid signed-in user session; server-side owner/admin check.
//  * From address is always the authenticated IONOS staging mailbox (never client supplied).
//  * Recipient allow-list, single recipient, rate limit, idempotency key.
//  * Header-injection protection on every header value.
//  * STARTTLS on 587 with certificate verification (Deno default).
//  * Plain text only. No attachments, no HTML, no AI, no automatic sending.
//  * Secrets are never returned, logged or stored.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { corsHeaders, requireAuth, requireRole } from "../_shared/auth.ts";
import { toOutboundDto } from "../_shared/comms/outboundDto.ts";
import {
  buildMimeMessage,
  dotStuff,
  isValidIdempotencyKey,
  newMessageId,
  normalizeBody,
  rateLimitDecision,
  redactSmtp,
  SmtpError,
  threadHeaders,
  validateRecipient,
  validateRecipientForPolicy,
  validateSubject,
} from "./core.ts";
import { appendDecision, appendOutcome, requireVerifiedSentFolder, resolveSentCopyStatus, type SentCopyStatus } from "../_shared/comms/sentFolder.ts";
import { runSentCopy } from "../_shared/comms/sentCopyRunner.ts";
import { credentialEnvNames, recipientPolicy, selectTargetMailbox } from "../_shared/comms/mailboxTarget.ts";


const enc = new TextEncoder();
const dec = new TextDecoder();
const SMTP_HOST = "smtp.ionos.com";
const SMTP_PORT = 587;
const IO_TIMEOUT_MS = 20_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function withDeadline<T>(p: Promise<T>, ms: number, stage: string, onTimeout?: () => void): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => {
      try { onTimeout?.(); } catch { /* gone */ }
      reject(new SmtpError(stage, 0, `Timed out after ${ms}ms during ${stage}`));
    }, ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

type Conn = Deno.Conn | Deno.TlsConn;

async function readReply(conn: Conn, stage: string): Promise<string> {
  const buf = new Uint8Array(8192);
  let acc = "";
  for (;;) {
    const n = await withDeadline(conn.read(buf), IO_TIMEOUT_MS, stage, () => {
      try { conn.close(); } catch { /* gone */ }
    });
    if (n === null) break;
    acc += dec.decode(buf.subarray(0, n));
    // A complete reply ends with "<code><SP>text\r\n"
    if (/^\d{3} [^\r\n]*\r\n$/m.test(acc.split(/(?<=\r\n)/).slice(-1)[0] ?? "")) break;
  }
  return acc;
}

async function sendViaIonos(
  user: string,
  pass: string,
  from: string,
  to: string,
  message: string,
): Promise<{ transcript: string }> {
  let transcript = "";
  const say = (label: string, text: string) => {
    transcript += `${label} ${text.trim()}\n`;
  };

  let conn: Conn = await withDeadline(
    Deno.connect({ hostname: SMTP_HOST, port: SMTP_PORT }),
    IO_TIMEOUT_MS,
    "connect",
  );

  const cmd = async (line: string, stage: string, logLine = true) => {
    await withDeadline(conn.write(enc.encode(`${line}\r\n`)), IO_TIMEOUT_MS, `${stage}-write`, () => {
      try { conn.close(); } catch { /* gone */ }
    });
    const reply = await readReply(conn, stage);
    say(logLine ? `> ${line.split(" ")[0]}` : "> [redacted]", reply);
    const code = Number(reply.trim().slice(0, 3));
    if (!Number.isFinite(code) || code >= 400) {
      throw new SmtpError(stage, code || 0, reply.trim().slice(0, 200));
    }
    return reply;
  };

  try {
    say("< greeting", await readReply(conn, "greeting"));
    await cmd("EHLO praetoriagroup.ca", "ehlo");
    await cmd("STARTTLS", "starttls");
    // Certificate verification is on by default (no custom CA / no insecure flag).
    conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: SMTP_HOST });
    await cmd("EHLO praetoriagroup.ca", "ehlo-tls");

    const authBlob = btoa(`\u0000${user}\u0000${pass}`);
    await cmd(`AUTH PLAIN ${authBlob}`, "auth", false);

    await cmd(`MAIL FROM:<${from}>`, "mail-from");
    await cmd(`RCPT TO:<${to}>`, "rcpt-to");
    await cmd("DATA", "data");
    await withDeadline(
      conn.write(enc.encode(`${dotStuff(message)}\r\n.\r\n`)),
      IO_TIMEOUT_MS,
      "data-body",
      () => { try { conn.close(); } catch { /* gone */ } },
    );
    const finalReply = await readReply(conn, "data-final");
    say("> DATA", finalReply);
    const code = Number(finalReply.trim().slice(0, 3));
    if (!Number.isFinite(code) || code >= 400) {
      throw new SmtpError("data-final", code || 0, finalReply.trim().slice(0, 200));
    }
    await cmd("QUIT", "quit").catch(() => undefined);
    return { transcript };
  } finally {
    try { conn.close(); } catch { /* already closed */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  const gate = await requireRole(auth, ["admin", "owner"]);
  if (!gate.ok) return gate.response;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const action = String(payload.action ?? "prepare");

  const { data: settings } = await admin.from("comms_settings").select("*").eq("id", true).maybeSingle();
  if (!settings?.outbound_enabled) return json({ error: "Sending is disabled" }, 403);

  // Resolve the target mailbox: production pilot when enabled, staging otherwise.
  const productionPilot = settings.production_pilot_enabled === true;
  const { data: mailboxRows } = await admin.from("comms_mailboxes").select("*").eq("is_active", true);
  const target = selectTargetMailbox(mailboxRows ?? [], productionPilot);
  if (!target.ok) return json({ error: target.reason }, 400);
  const mailbox = target.mailbox;
  if (mailbox.outbound_enabled === false) return json({ error: "Mailbox sending is disabled" }, 403);
  const policy = recipientPolicy(target.environment, settings);

  const envNames = credentialEnvNames(mailbox.credential_secret_prefix);
  if (!envNames.ok) return json({ error: envNames.reason }, 500);
  const smtpUser = Deno.env.get(envNames.userVar);
  const smtpPass = Deno.env.get(envNames.passVar);
  if (!smtpUser || !smtpPass) return json({ error: "Mailbox secrets not configured" }, 500);

  const audit = (event: string, detail?: string, metadata?: Record<string, unknown>) =>
    admin.from("comms_audit_log").insert({ mailbox_id: mailbox.id, event, detail, metadata });



  /**
   * Append the canonical RFC822 message to the verified Sent folder.
   * Never sends email; only ever runs after SMTP acceptance.
   */
  const performSentCopy = async (
    record: Record<string, unknown>,
    sentCopyEnabled: boolean,
    allowAppend: boolean,
  ) => {
    let folder = null;
    try {
      folder = requireVerifiedSentFolder(mailbox);
    } catch (_e) {
      folder = null;
    }
    const decision = appendDecision({
      sendState: String(record.status ?? "draft") as "draft" | "sending" | "sent" | "failed",
      sentCopyEnabled,
      messageIdHeader: (record.message_id_header as string | null) ?? null,
      existsInSentFolder: false,
      sentFolder: folder,
      attempts: Number(record.sent_copy_attempts ?? 0),
    });
    if (decision.action === "skip") {
      await admin.from("comms_outbound_messages")
        .update({
          sent_copy_status: resolveSentCopyStatus(
            (record.sent_copy_status as SentCopyStatus | null) ?? null,
            decision.status,
          ).status,
          sent_copy_last_retry_outcome: decision.status,
          sent_copy_last_retry_at: new Date().toISOString(),
          sent_copy_last_error: decision.reason,
        })
        .eq("id", record.id as string);
      return { status: decision.status, reason: decision.reason, folder: folder?.name ?? null };
    }

    const rfc822 = record.rfc822_message as string | null;
    if (!rfc822) {
      await admin.from("comms_outbound_messages")
        .update({
          sent_copy_status: resolveSentCopyStatus(
            (record.sent_copy_status as SentCopyStatus | null) ?? null,
            "sent_copy_pending",
          ).status,
          sent_copy_last_retry_outcome: "sent_copy_pending",
          sent_copy_last_retry_at: new Date().toISOString(),
          sent_copy_last_error: "canonical_message_unavailable",
        })
        .eq("id", record.id as string);
      return { status: "sent_copy_pending", reason: "canonical_message_unavailable", folder: folder!.name };
    }

    const attempts = Number(record.sent_copy_attempts ?? 0) + 1;
    const result = await runSentCopy({
      host: mailbox.imap_host,
      port: mailbox.imap_port,
      user: smtpUser,
      pass: smtpPass,
      folder: folder!,
      messageId: record.message_id_header as string,
      rfc822,
      allowAppend,
    });

    const outcome = result.status === "appended" || result.status === "skipped_duplicate"
      ? result.status
      : appendOutcome(false, attempts).sent_copy_status;

    // Phase 1D — a successful append is terminal; retries never downgrade it.
    const resolved = resolveSentCopyStatus(
      (record.sent_copy_status as SentCopyStatus | null) ?? null,
      outcome,
    );

    await admin.from("comms_outbound_messages").update({
      sent_copy_status: resolved.status,
      sent_copy_last_retry_outcome: resolved.retryOutcome,
      sent_copy_last_retry_at: new Date().toISOString(),
      sent_copy_attempts: attempts,
      sent_copy_last_error: result.error,
      sent_copy_appended_at: result.status === "appended" ? new Date().toISOString() : record.sent_copy_appended_at ?? null,
    }).eq("id", record.id as string);

    await audit(`sent_copy_${resolved.retryOutcome}`, `folder=${result.folder}`, {
      outbound_id: record.id,
      final_status: resolved.status,
      retry_outcome: resolved.retryOutcome,
      terminal_status_preserved: resolved.preserved,
      matches_before: result.matchesBefore,
      matches_after: result.matchesAfter,
      append_uid: result.appendUid,
      octets: result.octets,
    });

    return {
      ...result,
      status: resolved.status,
      retry_outcome: resolved.retryOutcome,
      terminal_status_preserved: resolved.preserved,
      attempts,
      resend_email: false as const,
    };
  };

  // ------------------------------------------------------- execute_approval
  // Sends EXACTLY the immutable content bound to a server-side approved Prae
  // approval. The browser supplies only the approval id — never any content.
  if (action === "execute_approval") {
    if (settings.prae_execution_enabled !== true) {
      return json({ error: "Prae execution is disabled" }, 403);
    }
    const approvalId = payload.approval_id;
    if (typeof approvalId !== "string" || !approvalId) {
      return json({ error: "approval_id required" }, 400);
    }

    const { data: claim, error: claimError } = await admin.rpc("prae_claim_execution", {
      _approval_id: approvalId,
    });
    if (claimError) return json({ error: claimError.message }, 500);
    if (!claim?.ok) return json({ error: "not_executable", reason: claim?.reason ?? "unknown" }, 409);

    const fail = async (reason: string, status = 400) => {
      await admin.rpc("prae_complete_execution", {
        _approval_id: approvalId,
        _status: "failed",
        _receipt: { summary: reason },
      });
      return json({ error: reason }, status);
    };

    const binding = claim.content_binding as Record<string, unknown> | null;
    if (!binding || binding.channel !== "email") return await fail("unsupported_channel");
    const toList = Array.isArray(binding.to) ? binding.to : [];
    if (toList.length !== 1) return await fail("exactly_one_recipient_required");

    const recipient = validateRecipientForPolicy(toList[0], policy);
    if (!recipient.ok) return await fail(recipient.error);
    const subject = validateSubject(binding.subject);
    if (!subject.ok) return await fail(subject.error);
    const body = normalizeBody(binding.body);
    if (!body.ok) return await fail(body.error);

    const key = `prae-${approvalId}`;
    const { data: existing } = await admin
      .from("comms_outbound_messages").select("*").eq("idempotency_key", key).maybeSingle();
    if (existing?.status === "sent") {
      await admin.rpc("prae_complete_execution", {
        _approval_id: approvalId,
        _status: "complete",
        _receipt: { summary: "already_sent", outbound_id: existing.id, content_hash: claim.content_hash },
      });
      return json({ record: toOutboundDto(existing), duplicate: true });
    }

    const messageId = existing?.message_id_header ?? newMessageId("praetoriagroup.ca", crypto.randomUUID());
    let record = existing;
    if (!record) {
      const { data: created, error } = await admin.from("comms_outbound_messages").insert({
        mailbox_id: mailbox.id,
        requested_by: auth.userId,
        requested_by_email: auth.email,
        from_address: smtpUser,
        to_address: recipient.address,
        subject: subject.subject,
        body_text: body.body,
        idempotency_key: key,
        message_id_header: messageId,
        status: "sending",
        approved_at: new Date().toISOString(),
      }).select().single();
      if (error) return await fail(error.message, 500);
      record = created;
    } else {
      await admin.from("comms_outbound_messages")
        .update({ status: "sending", approved_at: new Date().toISOString() })
        .eq("id", record.id);
    }

    let message: string;
    try {
      message = buildMimeMessage({
        fromAddress: smtpUser,
        fromName: mailbox.display_name ?? mailbox.label ?? null,
        to: recipient.address,
        subject: subject.subject,
        body: body.body,
        messageId,
        inReplyTo: null,
        references: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Message build failed";
      await admin.from("comms_outbound_messages")
        .update({ status: "failed", failed_at: new Date().toISOString(), error_text: msg })
        .eq("id", record.id);
      return await fail(msg);
    }

    try {
      const { transcript } = await sendViaIonos(smtpUser, smtpPass, smtpUser, recipient.address, message);
      const safe = redactSmtp(transcript, [smtpPass, smtpUser]);
      const { data: sent } = await admin.from("comms_outbound_messages").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        smtp_result: safe,
        error_text: null,
        rfc822_message: message,
      }).eq("id", record.id).select().maybeSingle();
      await audit("prae_approved_send", `to=${recipient.address}`, {
        outbound_id: record.id, approval_id: approvalId, content_hash: claim.content_hash,
      });

      let sentCopy: Awaited<ReturnType<typeof performSentCopy>> | null = null;
      try {
        sentCopy = await performSentCopy(
          { ...(sent ?? record), rfc822_message: message },
          settings.sent_copy_enabled === true,
          true,
        );
      } catch { /* sent-copy failure never resends */ }

      await admin.rpc("prae_complete_execution", {
        _approval_id: approvalId,
        _status: "complete",
        _receipt: {
          summary: "sent",
          outbound_id: record.id,
          content_hash: claim.content_hash,
          message_id: messageId,
          sent_copy_status: (sentCopy as { status?: string } | null)?.status ?? null,
        },
      });
      return json({ record: toOutboundDto(sent ?? record), sent_copy: sentCopy, approval_id: approvalId });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "SMTP failure";
      const safe = redactSmtp(raw, [smtpPass, smtpUser]);
      await admin.from("comms_outbound_messages")
        .update({ status: "failed", failed_at: new Date().toISOString(), error_text: safe, smtp_result: safe })
        .eq("id", record.id);
      await admin.rpc("prae_complete_execution", {
        _approval_id: approvalId, _status: "failed", _receipt: { summary: "smtp_failure" },
      });
      return json({ error: "Send failed", detail: safe }, 502);
    }
  }


  // ---------------------------------------------------------------- prepare
  if (action === "prepare") {
    const key = payload.idempotency_key;
    if (!isValidIdempotencyKey(key)) return json({ error: "Invalid idempotency key" }, 400);

    const recipient = validateRecipientForPolicy(payload.to, policy);
    if (!recipient.ok) return json({ error: recipient.error }, 400);
    const subject = validateSubject(payload.subject);
    if (!subject.ok) return json({ error: subject.error }, 400);
    const body = normalizeBody(payload.body_text);
    if (!body.ok) return json({ error: body.error }, 400);

    // Idempotency: return the existing record instead of creating a second one.
    const { data: existing } = await admin
      .from("comms_outbound_messages")
      .select("*")
      .eq("idempotency_key", key)
      .maybeSingle();
    if (existing) return json({ record: toOutboundDto(existing), duplicate: true });

    let inReplyToId: string | null = null;
    let thread = { inReplyTo: null as string | null, references: null as string | null };
    if (typeof payload.in_reply_to_id === "string" && payload.in_reply_to_id) {
      const { data: parent } = await admin
        .from("comms_messages")
        .select("id, message_id_header")
        .eq("id", payload.in_reply_to_id)
        .maybeSingle();
      if (parent) {
        inReplyToId = parent.id;
        thread = threadHeaders(parent.message_id_header);
      }
    }

    const messageId = newMessageId("praetoriagroup.ca", crypto.randomUUID());
    const { data: record, error } = await admin
      .from("comms_outbound_messages")
      .insert({
        mailbox_id: mailbox.id,
        requested_by: auth.userId,
        requested_by_email: auth.email,
        from_address: smtpUser,
        to_address: recipient.address,
        subject: subject.subject,
        body_text: body.body,
        idempotency_key: key,
        in_reply_to_id: inReplyToId,
        message_id_header: messageId,
        in_reply_to_header: thread.inReplyTo,
        references_header: thread.references,
        status: "draft",
      })
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);

    await audit("outbound_draft_created", `to=${recipient.address}`, { outbound_id: record.id });
    return json({ record: toOutboundDto(record) });
  }

  // ------------------------------------------------------------------- send
  if (action === "send") {
    if (payload.confirm !== true) return json({ error: "Explicit confirmation required" }, 400);
    const id = payload.id;
    if (typeof id !== "string") return json({ error: "Draft id required" }, 400);

    const { data: record } = await admin
      .from("comms_outbound_messages")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!record) return json({ error: "Draft not found" }, 404);
    if (record.status === "sent") return json({ record: toOutboundDto(record), duplicate: true });
    if (record.status === "sending") return json({ error: "Send already in progress" }, 409);

    const sinceIso = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin
      .from("comms_outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", sinceIso);
    const rate = rateLimitDecision(count ?? 0, settings.max_sends_per_hour ?? 10);
    if (!rate.ok) return json({ error: rate.error }, 429);

    // Claim the draft — a double click loses the race and gets 409 above.
    const { data: claimed } = await admin
      .from("comms_outbound_messages")
      .update({ status: "sending", approved_at: new Date().toISOString() })
      .eq("id", record.id)
      .eq("status", "draft")
      .select()
      .maybeSingle();
    if (!claimed) return json({ error: "Send already in progress" }, 409);

    // Re-validate against the allow-list at send time.
    const recheck = validateRecipientForPolicy(claimed.to_address, policy);
    if (!recheck.ok) {
      await admin.from("comms_outbound_messages")
        .update({ status: "failed", failed_at: new Date().toISOString(), error_text: recheck.error })
        .eq("id", claimed.id);
      return json({ error: recheck.error }, 400);
    }

    let message: string;
    try {
      message = buildMimeMessage({
        fromAddress: smtpUser,
        fromName: mailbox.label ?? null,
        to: claimed.to_address,
        subject: claimed.subject,
        body: claimed.body_text,
        messageId: claimed.message_id_header,
        inReplyTo: claimed.in_reply_to_header,
        references: claimed.references_header,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Message build failed";
      await admin.from("comms_outbound_messages")
        .update({ status: "failed", failed_at: new Date().toISOString(), error_text: msg })
        .eq("id", claimed.id);
      return json({ error: msg }, 400);
    }

    try {
      const { transcript } = await sendViaIonos(smtpUser, smtpPass, smtpUser, claimed.to_address, message);
      const safe = redactSmtp(transcript, [smtpPass, smtpUser]);
      const { data: sent } = await admin
        .from("comms_outbound_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          smtp_result: safe,
          error_text: null,
          rfc822_message: message,
        })
        .eq("id", claimed.id)
        .select()
        .maybeSingle();
      await audit("outbound_sent", `to=${claimed.to_address}`, { outbound_id: claimed.id });

      // ------------------------------------------------ Sent-folder copy
      // Runs only AFTER SMTP acceptance. A failure here never resends the email.
      const temporaryWindow = payload.enable_sent_copy_for_this_send === true;
      let sentCopy: Awaited<ReturnType<typeof performSentCopy>> | null = null;
      try {
        if (temporaryWindow) {
          await admin.from("comms_settings").update({ sent_copy_enabled: true }).eq("id", true);
          await audit("sent_copy_window_opened", `outbound_id=${claimed.id}`);
        }
        const { data: liveSettings } = await admin
          .from("comms_settings").select("sent_copy_enabled").eq("id", true).maybeSingle();
        sentCopy = await performSentCopy(
          { ...(sent ?? claimed), rfc822_message: message },
          !!liveSettings?.sent_copy_enabled,
          true,
        );
      } finally {
        if (temporaryWindow) {
          await admin.from("comms_settings").update({ sent_copy_enabled: false }).eq("id", true);
          await audit("sent_copy_window_closed", `outbound_id=${claimed.id}`);
        }
      }

      const { data: finalRecord } = await admin
        .from("comms_outbound_messages").select("*").eq("id", claimed.id).maybeSingle();
      return json({ record: toOutboundDto(finalRecord ?? sent), sent_copy: sentCopy });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "SMTP failure";
      const safe = redactSmtp(raw, [smtpPass, smtpUser]);
      await admin.from("comms_outbound_messages")
        .update({ status: "failed", failed_at: new Date().toISOString(), error_text: safe, smtp_result: safe })
        .eq("id", claimed.id);
      await audit("outbound_failed", `to=${claimed.to_address}`, { outbound_id: claimed.id });
      return json({ error: "Send failed", detail: safe }, 502);
    }
  }

  // ------------------------------------------------------- sent_copy_retry
  // Append-only idempotency path. NEVER sends an email under any circumstance.
  if (action === "sent_copy_retry") {
    const id = payload.id;
    if (typeof id !== "string") return json({ error: "Outbound id required" }, 400);
    const { data: record } = await admin
      .from("comms_outbound_messages").select("*").eq("id", id).maybeSingle();
    if (!record) return json({ error: "Record not found" }, 404);

    const temporaryWindow = payload.enable_sent_copy_for_this_send === true;
    let outcome;
    try {
      if (temporaryWindow) {
        await admin.from("comms_settings").update({ sent_copy_enabled: true }).eq("id", true);
        await audit("sent_copy_window_opened", `retry outbound_id=${record.id}`);
      }
      const { data: liveSettings } = await admin
        .from("comms_settings").select("sent_copy_enabled").eq("id", true).maybeSingle();
      outcome = await performSentCopy(record, !!liveSettings?.sent_copy_enabled, true);
    } finally {
      if (temporaryWindow) {
        await admin.from("comms_settings").update({ sent_copy_enabled: false }).eq("id", true);
        await audit("sent_copy_window_closed", `retry outbound_id=${record.id}`);
      }
    }
    const { data: finalRecord } = await admin
      .from("comms_outbound_messages").select("*").eq("id", record.id).maybeSingle();
    return json({ record: toOutboundDto(finalRecord), sent_copy: outcome, email_sent: false });
  }

  return json({ error: "Unknown action" }, 400);
});

