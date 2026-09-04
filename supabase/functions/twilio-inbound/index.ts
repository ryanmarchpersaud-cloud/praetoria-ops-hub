// Same-number router for +1 651 899 2021.
//
// Order of operations, strictly:
//   1. POST only, small body cap
//   2. X-Twilio-Signature validated in constant time against the NEW url (mandatory)
//   3. Prae handling ONLY when sender == verified owner number AND body is an exact
//      supported command. Everything else is forwarded verbatim to the existing
//      customer-messaging webhook with a signature recomputed for the OLD url.
//
// Nothing here can approve, send, edit or release the emergency stop.
// Customer message bodies, media URLs and raw phone numbers are never stored or logged.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = "https://praetoriagroup.ca";
const LEGACY_WEBHOOK_URL = "https://tdsrgyvrcgzbyhjqchzj.supabase.co/functions/v1/twilio-webhook";
const MAX_BODY_BYTES = 8_192;
const INBOUND_WINDOW_MS = 5 * 60_000;
const INBOUND_WINDOW_MAX = 10;

const OPT_OUT_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
const OPT_IN_WORDS = ["START", "UNSTOP"];
const PRAE_COMMANDS = new Set([
  "STATUS",
  "WHAT NEEDS APPROVAL?",
  "WHAT NEEDS APPROVAL",
  "URGENT",
  "PAUSE",
  "HELP",
  "APPROVE",
  "APPROVED",
  "YES",
  ...OPT_OUT_WORDS,
  ...OPT_IN_WORDS,
]);

function maskNumber(e164: string) {
  return e164.length >= 9 ? `${e164.slice(0, 5)}•••${e164.slice(-4)}` : "•••";
}

function normalizeE164(raw: string) {
  const digits = (raw ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function twiml(message?: string, status = 200) {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(body, { status, headers: { "Content-Type": "text/xml" } });
}

function constantTimeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function twilioSignature(authToken: string, url: string, params: Record<string, string>) {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Forward the untouched Twilio form body to the legacy handler, re-signed for that URL. */
async function forwardToLegacy(
  authToken: string,
  rawBody: string,
  params: Record<string, string>,
): Promise<Response> {
  const signature = await twilioSignature(authToken, LEGACY_WEBHOOK_URL, params);
  const upstream = await fetch(LEGACY_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": signature,
      "User-Agent": "TwilioProxy/1.1",
    },
    body: rawBody,
  });
  const text = await upstream.text();
  const headers: Record<string, string> = {
    "Content-Type": upstream.headers.get("Content-Type") ?? "text/xml",
  };
  return new Response(text, { status: upstream.status, headers });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) {
    console.error("twilio-inbound: TWILIO_AUTH_TOKEN not configured — refusing all inbound");
    return new Response("not_configured", { status: 503 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new Response("too_large", { status: 413 });

  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw)) params[k] = v;

  const publicUrl = Deno.env.get("TWILIO_WEBHOOK_URL") ?? req.url;
  const provided = req.headers.get("X-Twilio-Signature") ?? "";
  const expected = await twilioSignature(authToken, publicUrl, params);
  if (!provided || !constantTimeEq(provided, expected)) {
    console.error("twilio-inbound: signature mismatch — rejected");
    return new Response("forbidden", { status: 403 });
  }

  const from = normalizeE164(params.From ?? "");
  const sid = params.MessageSid ?? params.SmsMessageSid ?? "";
  const command = (params.Body ?? "").trim().toUpperCase().replace(/\s+/g, " ");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Is the sender the verified owner number? Only that number can talk to Prae.
  const { data: phone } = from
    ? await admin
        .from("prae_authorized_phones")
        .select("id, e164, active, opted_out_at, verified_at, divisions")
        .eq("e164", from)
        .maybeSingle()
    : { data: null as any };

  const isOwner = !!phone && !!phone.verified_at;
  const isCommand = PRAE_COMMANDS.has(command);

  // Everything that is not an exact command from the verified owner number goes
  // straight to the existing customer-messaging webhook. No body, media URL or
  // phone number is stored here.
  if (!isOwner || !isCommand) {
    console.log(
      `twilio-inbound: forwarded to legacy handler (owner=${isOwner}, command=${isCommand})`,
    );
    return await forwardToLegacy(authToken, raw, params);
  }

  // ---- Prae command path (owner only, routing metadata + masked number only) ----
  if (sid) {
    const { error: dupErr } = await admin.from("prae_sms_log").insert({
      direction: "inbound",
      e164: from,
      message_sid: sid,
      kind: "command",
      status: "received",
    });
    // Duplicate MessageSid → already processed, acknowledge and do nothing.
    if (dupErr) return twiml();
  }

  if (OPT_OUT_WORDS.includes(command)) {
    await admin
      .from("prae_authorized_phones")
      .update({ opted_out_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString() })
      .eq("id", phone.id);
    return twiml("Praetoria Ops: you will receive no further alerts. Reply START to re-enable.");
  }
  if (OPT_IN_WORDS.includes(command)) {
    await admin
      .from("prae_authorized_phones")
      .update({ opted_out_at: null, active: true, updated_at: new Date().toISOString() })
      .eq("id", phone.id);
    return twiml("Praetoria Ops alerts re-enabled. Reply STOP to opt out.");
  }
  if (command === "HELP") {
    return twiml("Praetoria Ops alerts. Commands: STATUS, URGENT, WHAT NEEDS APPROVAL?, PAUSE. Support: support@praetoriagroup.ca. Reply STOP to opt out.");
  }

  if (!phone.active || phone.opted_out_at) {
    return twiml("Praetoria Ops: alerts are paused for this number. Reply START to re-enable.");
  }

  // Sliding-window rate limit (masked number only in logs).
  const since = new Date(Date.now() - INBOUND_WINDOW_MS).toISOString();
  const { count } = await admin
    .from("prae_sms_log")
    .select("id", { count: "exact", head: true })
    .eq("e164", from)
    .eq("direction", "inbound")
    .gte("created_at", since);
  if ((count ?? 0) > INBOUND_WINDOW_MAX) {
    console.log(`twilio-inbound: rate limited ${maskNumber(from)}`);
    return twiml();
  }

  const link = `${APP_URL}/prae/approvals`;

  // A reply can never approve anything.
  if (command === "YES" || command === "APPROVE" || command === "APPROVED") {
    return twiml(`Praetoria Ops: replies cannot approve anything. Open ${link} and approve there.`);
  }

  if (command === "PAUSE") {
    await admin.rpc("prae_engage_emergency_stop", { _reason: "PAUSE received by SMS" });
    return twiml("Praetoria Ops: emergency stop engaged. Nothing will send. Resume in the Ops Hub only.");
  }

  if (command === "STATUS") {
    const { count: pending } = await admin
      .from("prae_approvals")
      .select("id", { count: "exact", head: true })
      .eq("state", "pending");
    const { count: attention } = await admin
      .from("prae_approvals")
      .select("id", { count: "exact", head: true })
      .eq("execution_state", "failed");
    return twiml(`Praetoria Ops: ${pending ?? 0} pending approval(s), ${attention ?? 0} needing attention. ${link}`);
  }

  if (command === "URGENT") {
    const { count: urgent } = await admin
      .from("prae_approvals")
      .select("id", { count: "exact", head: true })
      .eq("state", "pending")
      .eq("urgent", true);
    return twiml(`Praetoria Ops: ${urgent ?? 0} urgent item(s). ${link}`);
  }

  if (command === "WHAT NEEDS APPROVAL?" || command === "WHAT NEEDS APPROVAL") {
    const { data: rows } = await admin
      .from("prae_approvals")
      .select("division")
      .eq("state", "pending")
      .limit(200);
    const byDivision = new Map<string, number>();
    for (const r of rows ?? []) byDivision.set(r.division, (byDivision.get(r.division) ?? 0) + 1);
    const summary = byDivision.size
      ? [...byDivision.entries()].map(([d, n]) => `${d}: ${n}`).join(", ")
      : "none";
    return twiml(`Praetoria Ops pending by division — ${summary}. ${link}`);
  }

  return twiml("Praetoria Ops: unknown command. Reply HELP for the list.");
});
