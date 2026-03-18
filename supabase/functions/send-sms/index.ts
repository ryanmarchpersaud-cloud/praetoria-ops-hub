import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function logIntegration(entry: {
  provider: string;
  event_name: string;
  channel?: string;
  status: string;
  recipient?: string;
  record_type?: string;
  record_id?: string;
  provider_response_id?: string;
  error_message?: string;
  environment?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const sb = getServiceClient();
    await sb.from("integration_logs").insert({
      ...entry,
      environment: entry.environment || "production",
      metadata: entry.metadata || {},
    });
  } catch (e) {
    console.error("Failed to log integration event:", e);
  }
}

function validatePhone(phone: string): { valid: boolean; cleaned: string; error?: string } {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (!E164_REGEX.test(cleaned)) {
    return { valid: false, cleaned, error: `Invalid E.164 phone: ${phone}. Must start with + and country code.` };
  }
  return { valid: true, cleaned };
}

const sendLog = new Map<string, { count: number; windowStart: number }>();
const MAX_SMS_PER_PHONE_PER_HOUR = 5;

function checkRateLimit(phone: string): boolean {
  const now = Date.now();
  const entry = sendLog.get(phone);
  if (!entry || now - entry.windowStart > 3600_000) {
    sendLog.set(phone, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_SMS_PER_PHONE_PER_HOUR) return false;
  entry.count++;
  return true;
}

interface SmsPayload {
  to: string;
  body: string;
  from?: string;
}

async function sendViaTwilio(payload: SmsPayload): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { ok: false, error: "LOVABLE_API_KEY not configured" };

  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!TWILIO_API_KEY) return { ok: false, error: "TWILIO_API_KEY not configured" };

  const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!TWILIO_PHONE && !payload.from) return { ok: false, error: "TWILIO_PHONE_NUMBER not configured" };

  const fromNumber = payload.from || TWILIO_PHONE!;

  const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: payload.to,
      From: fromNumber,
      Body: payload.body,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return { ok: false, error: `Twilio API error [${response.status}]: ${data.message || JSON.stringify(data)}` };
  }
  return { ok: true, sid: data.sid };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (action === "health") {
      const hasLovableKey = !!Deno.env.get("LOVABLE_API_KEY");
      const hasTwilioKey = !!Deno.env.get("TWILIO_API_KEY");
      const hasPhone = !!Deno.env.get("TWILIO_PHONE_NUMBER");
      return json({ ok: true, twilio_configured: hasLovableKey && hasTwilioKey, phone_configured: hasPhone });
    }

    if (action === "test") {
      const { to } = params;
      if (!to) return json({ error: "Missing 'to' phone number" }, 400);
      const phone = validatePhone(to);
      if (!phone.valid) return json({ error: phone.error }, 400);
      if (!checkRateLimit(phone.cleaned)) return json({ error: "Rate limit exceeded. Max 5 SMS per phone per hour." }, 429);

      const result = await sendViaTwilio({
        to: phone.cleaned,
        body: `[Praetoria Ops] Test SMS — your Twilio integration is working. ${new Date().toISOString()}`,
      });
      await logIntegration({
        provider: "twilio",
        event_name: "sms.admin_test",
        channel: "sms",
        status: result.ok ? "success" : "failed",
        recipient: phone.cleaned,
        provider_response_id: result.sid,
        error_message: result.error,
      });
      return json(result);
    }

    if (action === "request_confirmation") {
      const { to, customer_name, request_subject, request_id } = params;
      if (!to) return json({ error: "Missing 'to' phone number" }, 400);
      const phone = validatePhone(to);
      if (!phone.valid) return json({ error: phone.error }, 400);
      if (!checkRateLimit(phone.cleaned)) return json({ error: "Rate limit exceeded" }, 429);

      const name = customer_name || "there";
      const subject = request_subject || "your service request";
      const result = await sendViaTwilio({
        to: phone.cleaned,
        body: `Hi ${name}, we received ${subject}. Our team will follow up shortly. — Praetoria Group`,
      });
      await logIntegration({
        provider: "twilio",
        event_name: "sms.request_confirmation",
        channel: "sms",
        status: result.ok ? "success" : "failed",
        recipient: phone.cleaned,
        record_type: "service_request",
        record_id: request_id,
        provider_response_id: result.sid,
        error_message: result.error,
        metadata: { customer_name },
      });
      return json({ ...result, action: "request_confirmation" });
    }

    if (action === "ops_alert") {
      const { to, message } = params;
      if (!to) return json({ error: "Missing 'to' phone number" }, 400);
      if (!message) return json({ error: "Missing 'message'" }, 400);
      const phone = validatePhone(to);
      if (!phone.valid) return json({ error: phone.error }, 400);
      if (!checkRateLimit(phone.cleaned)) return json({ error: "Rate limit exceeded" }, 429);

      const result = await sendViaTwilio({
        to: phone.cleaned,
        body: `[Praetoria Ops Alert] ${message}`,
      });
      await logIntegration({
        provider: "twilio",
        event_name: "sms.ops_alert",
        channel: "sms",
        status: result.ok ? "success" : "failed",
        recipient: phone.cleaned,
        provider_response_id: result.sid,
        error_message: result.error,
        metadata: { message },
      });
      return json({ ...result, action: "ops_alert" });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
