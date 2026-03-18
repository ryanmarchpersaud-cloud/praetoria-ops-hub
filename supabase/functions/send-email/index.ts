import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SENDER = "Praetoria Ops <noreply@praetoriagroup.ca>";

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

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  reply_to?: string;
}

async function sendViaResend(payload: EmailPayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: SENDER,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.reply_to,
    }),
  });

  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.message || `Resend API error [${res.status}]` };
  return { ok: true, id: data.id };
}

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .header { background: #1a1a2e; padding: 24px 32px; }
  .header h1 { margin: 0; color: #ffffff; font-size: 18px; font-weight: 600; }
  .body { padding: 32px; color: #27272a; line-height: 1.6; font-size: 15px; }
  .footer { padding: 16px 32px; background: #fafafa; color: #71717a; font-size: 12px; text-align: center; border-top: 1px solid #e4e4e7; }
  h2 { font-size: 16px; margin: 0 0 16px; }
  p { margin: 0 0 12px; }
  .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 13px; font-weight: 500; }
</style>
</head><body>
<div class="container">
  <div class="header"><h1>Praetoria Group</h1></div>
  <div class="body">
    <h2>${title}</h2>
    ${body}
  </div>
  <div class="footer">Praetoria Group &bull; praetoriagroup.ca</div>
</div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    if (action === "test") {
      const { to } = params;
      if (!to) return json({ error: "Missing 'to' email address" }, 400);
      const result = await sendViaResend({
        to,
        subject: "Praetoria Ops — Resend Test Email",
        html: wrapHtml("Test Email", `
          <p>This is a test email sent from <strong>Praetoria Ops</strong> via Resend.</p>
          <p>If you received this, your email integration is working correctly.</p>
          <p style="color:#71717a;font-size:13px;">Sent at ${new Date().toISOString()}</p>
        `),
      });
      await logIntegration({
        provider: "resend",
        event_name: "email.admin_test",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: to,
        provider_response_id: result.id,
        error_message: result.error,
      });
      return json(result);
    }

    if (action === "request_confirmation") {
      const { customer_email, customer_name, request_subject, service_type, request_id } = params;
      if (!customer_email) return json({ error: "Missing customer_email" }, 400);
      const result = await sendViaResend({
        to: customer_email,
        subject: `Request Received: ${request_subject || "Service Request"}`,
        html: wrapHtml("We Received Your Request", `
          <p>Hi ${customer_name || "there"},</p>
          <p>Thank you for submitting a service request. Here's a summary:</p>
          <p><strong>Subject:</strong> ${request_subject || "N/A"}</p>
          <p><strong>Service:</strong> <span class="badge">${service_type || "General"}</span></p>
          <p>Our team will review your request and follow up shortly. You can track the status of your request in your <a href="https://praetoria-ops-hub.lovable.app/portal/requests">customer portal</a>.</p>
          <p>Thank you,<br/>The Praetoria Team</p>
        `),
        reply_to: "ops@praetoriagroup.ca",
      });
      await logIntegration({
        provider: "resend",
        event_name: "email.request_confirmation",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: customer_email,
        record_type: "service_request",
        record_id: request_id,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { customer_name, service_type },
      });
      return json({ ...result, action: "request_confirmation" });
    }

    if (action === "ops_notification") {
      const { subject, body_html, to_addresses } = params;
      if (!subject) return json({ error: "Missing subject" }, 400);
      const recipients = to_addresses || ["ops@praetoriagroup.ca"];
      const result = await sendViaResend({
        to: recipients,
        subject: `[Praetoria Ops] ${subject}`,
        html: wrapHtml("Internal Notification", body_html || `<p>${subject}</p>`),
      });
      await logIntegration({
        provider: "resend",
        event_name: "email.ops_notification",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: Array.isArray(recipients) ? recipients.join(", ") : recipients,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { subject },
      });
      return json({ ...result, action: "ops_notification" });
    }

    if (action === "health") {
      const hasKey = !!Deno.env.get("RESEND_API_KEY");
      return json({ ok: true, resend_configured: hasKey });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
