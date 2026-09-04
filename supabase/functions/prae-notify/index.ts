// Phase 1G — content-free approval alert to authorised phones.
//
// Rules enforced here:
//  * caller must be a signed-in owner/admin (the approval is read under RLS
//    with the caller's own token — no service-role read of content),
//  * one alert per approval (notified_at + unique idempotency key),
//  * per-number hourly cap and opt-out check,
//  * the SMS carries no customer name, address, amount, subject or nonce —
//    only a count, the division and an app link that needs a login.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const APP_URL = "https://praetoriagroup.ca";
const MAX_PER_NUMBER_PER_HOUR = 6;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Never log or return a full destination number. */
function maskNumber(e164: string) {
  return `${e164.slice(0, 5)}•••${e164.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "not_authenticated" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asCaller = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(url, service);

  const { data: userData } = await asCaller.auth.getUser();
  if (!userData?.user) return json({ error: "not_authenticated" }, 401);

  let body: { approval_id?: string; dry_run?: boolean; connectivity_test?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  // Owner-authorised, content-free channel test. Sends one fixed sentence with
  // no link, no customer data and no approval attached.
  if (body.connectivity_test) {
    const { data: isOwner } = await asCaller.rpc("is_admin_or_owner", {
      _user_id: userData.user.id,
    });
    if (isOwner !== true) return json({ error: "role_not_permitted" }, 403);

    const { data: phones } = await admin
      .from("prae_authorized_phones")
      .select("e164, active, opted_out_at, verified_at");
    const targets = (phones ?? []).filter((p) =>
      p.active && !p.opted_out_at && p.verified_at
    );
    if (targets.length !== 1) {
      return json({ error: "expected_exactly_one_verified_phone", found: targets.length }, 400);
    }
    const target = targets[0];
    const testText =
      "Prae test: Mobile notifications are connected. " +
      "No customer information is included and no action is required.";

    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ??
      Deno.env.get("TWILIO_FROM_NUMBER");
    const lovableKeyT = Deno.env.get("LOVABLE_API_KEY");
    const twilioKeyT = Deno.env.get("TWILIO_API_KEY");

    if (body.dry_run) {
      return json({
        dry_run: true,
        connectivity_test: true,
        to: maskNumber(target.e164),
        from: fromNumber ? maskNumber(fromNumber) : null,
        message: testText,
        configured: !!(lovableKeyT && twilioKeyT && fromNumber),
      });
    }

    if (!lovableKeyT || !twilioKeyT || !fromNumber) {
      return json({ error: "sms_channel_not_configured" }, 503);
    }

    const key = `prae-connectivity-test-${target.e164}`;
    const { error: claimErr } = await admin.from("prae_sms_log").insert({
      direction: "outbound",
      e164: target.e164,
      idempotency_key: key,
      kind: "connectivity_test",
      status: "queued",
    });
    if (claimErr) return json({ skipped: "already_tested" });

    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKeyT}`,
        "X-Connection-Api-Key": twilioKeyT,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: target.e164, From: fromNumber, Body: testText }),
    });
    const payloadT = await res.text();
    if (!res.ok) {
      console.error(`Twilio test send failed [${res.status}]: ${payloadT}`);
      await admin.from("prae_sms_log").update({ status: "failed", detail: `${res.status}` })
        .eq("idempotency_key", key);
      return json({ error: "provider_request_failed", status: res.status, details: payloadT }, res.status);
    }
    const parsed = JSON.parse(payloadT) as { sid?: string; status?: string };
    await admin.from("prae_sms_log")
      .update({ status: "sent", message_sid: parsed.sid ?? null })
      .eq("idempotency_key", key);
    return json({
      connectivity_test: true,
      to: maskNumber(target.e164),
      from: maskNumber(fromNumber),
      sid: parsed.sid ?? null,
      provider_status: parsed.status ?? null,
    });
  }

  const approvalId = body.approval_id;
  if (!approvalId) return json({ error: "approval_id_required" }, 400);


  // Read under the caller's own RLS — a non-owner simply sees nothing.
  const { data: approval, error: readErr } = await asCaller
    .from("prae_approvals")
    .select("id, division, state, action_type, urgent, notified_at, expires_at")
    .eq("id", approvalId)
    .maybeSingle();
  if (readErr) return json({ error: "read_failed", details: readErr.message }, 400);
  if (!approval) return json({ error: "role_not_permitted" }, 403);
  if (approval.state !== "pending") return json({ skipped: "not_pending" });
  if (approval.notified_at) return json({ skipped: "already_notified" });

  const { data: phones } = await admin
    .from("prae_authorized_phones")
    .select("e164, divisions, active, opted_out_at, verified_at");

  const targets = (phones ?? []).filter((p) =>
    p.active &&
    !p.opted_out_at &&
    p.verified_at &&
    (p.divisions.length === 0 || p.divisions.includes(approval.division))
  );
  if (targets.length === 0) return json({ skipped: "no_authorized_phones" });

  const link = `${APP_URL}/prae/approvals/${approval.id}`;
  const text =
    `Praetoria Ops: 1 item needs approval (${approval.division}). ` +
    `Open: ${link} Reply STOP to opt out.`;

  if (body.dry_run) {
    return json({
      dry_run: true,
      recipients: targets.map((t) => maskNumber(t.e164)),
      message: text,
    });
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!lovableKey || !twilioKey || !from) {
    return json({ error: "sms_channel_not_configured" }, 503);
  }

  const results: Array<{ to: string; status: string; detail?: string }> = [];
  let firstSid: string | null = null;

  for (const target of targets) {
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin
      .from("prae_sms_log")
      .select("id", { count: "exact", head: true })
      .eq("e164", target.e164)
      .eq("direction", "outbound")
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_NUMBER_PER_HOUR) {
      results.push({ to: maskNumber(target.e164), status: "rate_limited" });
      continue;
    }

    const idempotencyKey = `prae-notify-${approval.id}-${target.e164}`;
    const { error: claimErr } = await admin.from("prae_sms_log").insert({
      direction: "outbound",
      e164: target.e164,
      idempotency_key: idempotencyKey,
      approval_id: approval.id,
      kind: "approval_alert",
      status: "queued",
    });
    if (claimErr) {
      results.push({ to: maskNumber(target.e164), status: "duplicate_skipped" });
      continue;
    }

    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": twilioKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: target.e164, From: from, Body: text }),
    });
    const payload = await res.text();
    if (!res.ok) {
      console.error(`Twilio send failed [${res.status}]: ${payload}`);
      await admin
        .from("prae_sms_log")
        .update({ status: "failed", detail: `${res.status}` })
        .eq("idempotency_key", idempotencyKey);
      results.push({ to: maskNumber(target.e164), status: "failed", detail: `${res.status}` });
      continue;
    }
    let sid: string | null = null;
    try {
      sid = (JSON.parse(payload) as { sid?: string }).sid ?? null;
    } catch {
      sid = null;
    }
    firstSid ??= sid;
    await admin
      .from("prae_sms_log")
      .update({ status: "sent", message_sid: sid })
      .eq("idempotency_key", idempotencyKey);
    results.push({ to: maskNumber(target.e164), status: "sent" });
  }

  if (results.some((r) => r.status === "sent")) {
    await admin
      .from("prae_approvals")
      .update({ notified_at: new Date().toISOString(), notify_message_sid: firstSid })
      .eq("id", approval.id);
    await admin.from("prae_approval_audit").insert({
      approval_id: approval.id,
      event: "notified",
      detail: "content-free approval alert sent to authorised phone(s)",
    });
  }

  return json({ approval_id: approval.id, results });
});
