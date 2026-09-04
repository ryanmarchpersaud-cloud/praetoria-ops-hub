// Phase 1G — inbound SMS commands. Read-only by design.
//
// Nothing here can approve, send, edit or release the emergency stop.
// The only state change an SMS can cause is engaging the stop (PAUSE) and
// opt-out/opt-in for the sender's own number.
//
// Order of checks, all before any database read of Prae content:
//   1. POST only, small body cap
//   2. X-Twilio-Signature validated in constant time (mandatory)
//   3. sender must be an authorised, active phone
//   4. MessageSid replay protection + per-number sliding-window rate limit
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const APP_URL = "https://praetoriagroup.ca";
const MAX_BODY_BYTES = 8_192;
const INBOUND_WINDOW_MS = 5 * 60_000;
const INBOUND_WINDOW_MAX = 10;

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

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const from = params.From ?? "";
  const sid = params.MessageSid ?? params.SmsMessageSid ?? "";
  const text = (params.Body ?? "").trim();
  const upper = text.toUpperCase();

  // Replay protection — a repeated MessageSid is acknowledged and ignored.
  if (sid) {
    const { error: dupErr } = await admin.from("prae_sms_log").insert({
      direction: "inbound",
      e164: from,
      message_sid: sid,
      kind: "command",
      status: "received",
    });
    if (dupErr) return twiml();
  }

  const { data: phone } = await admin
    .from("prae_authorized_phones")
    .select("id, e164, active, opted_out_at, divisions")
    .eq("e164", from)
    .maybeSingle();

  // Carrier opt-out words are honoured even for unknown numbers.
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(upper)) {
    if (phone) {
      await admin
        .from("prae_authorized_phones")
        .update({ opted_out_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString() })
        .eq("id", phone.id);
    }
    return twiml("Praetoria Ops: you will receive no further alerts. Reply START to re-enable.");
  }
  if (["START", "UNSTOP", "YES TO ALERTS"].includes(upper)) {
    if (phone) {
      await admin
        .from("prae_authorized_phones")
        .update({ opted_out_at: null, active: true, updated_at: new Date().toISOString() })
        .eq("id", phone.id);
    }
    return twiml("Praetoria Ops alerts re-enabled. Reply STOP to opt out.");
  }
  if (upper === "HELP" || upper === "INFO") {
    return twiml("Praetoria Ops alerts. Commands: STATUS, URGENT, WHAT NEEDS APPROVAL, PAUSE. Support: support@praetoriagroup.ca. Reply STOP to opt out.");
  }

  if (!phone || !phone.active || phone.opted_out_at) {
    return twiml("Praetoria Ops: number not recognised.");
  }

  // Sliding-window rate limit.
  const since = new Date(Date.now() - INBOUND_WINDOW_MS).toISOString();
  const { count } = await admin
    .from("prae_sms_log")
    .select("id", { count: "exact", head: true })
    .eq("e164", from)
    .eq("direction", "inbound")
    .gte("created_at", since);
  if ((count ?? 0) > INBOUND_WINDOW_MAX) return twiml();

  const link = `${APP_URL}/prae/approvals`;

  // A reply can never approve anything.
  if (/^(YES|Y|OK|OKAY|APPROVE|APPROVED|SEND|GO)\b/.test(upper)) {
    return twiml(`Praetoria Ops: replies cannot approve anything. Open ${link} and approve there.`);
  }

  if (upper === "PAUSE") {
    await admin.rpc("prae_engage_emergency_stop", { _reason: "PAUSE received by SMS" });
    return twiml("Praetoria Ops: emergency stop engaged. Nothing will send. Resume in the Ops Hub only.");
  }

  const divisionFilter = (q: ReturnType<typeof admin.from>) => q;
  void divisionFilter;

  if (upper === "STATUS") {
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

  if (upper === "URGENT") {
    const { count: urgent } = await admin
      .from("prae_approvals")
      .select("id", { count: "exact", head: true })
      .eq("state", "pending")
      .eq("urgent", true);
    return twiml(`Praetoria Ops: ${urgent ?? 0} urgent item(s). ${link}`);
  }

  if (upper.replace(/[?.!]/g, "").trim() === "WHAT NEEDS APPROVAL") {
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
