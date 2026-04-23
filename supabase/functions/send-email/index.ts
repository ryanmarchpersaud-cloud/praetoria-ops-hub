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

const SENDER = "Praetoria Group <noreply@praetoriagroup.ca>";

// ── Email routing config (mirrors src/lib/emailConfig.ts) ─────────
const EMAIL_CONFIG = {
  opsInbox: "ops@praetoriagroup.ca",
  supportInbox: "support@praetoriagroup.ca",
  adminInbox: "admin@praetoriagroup.ca",
  serviceInboxes: {
    snow_ice: "info@praetoriasnowandice.ca",
    landscaping: "landscaping@praetoriagroup.ca",
    junk_removal: "junk@praetoriagroup.ca",
    property_maintenance: "maintenance@praetoriagroup.ca",
    cleaning: "cleaning@praetoriagroup.ca",
    power_washing: "powerwashing@praetoriagroup.ca",
  } as Record<string, string>,
};

const CATEGORY_TO_KEY: Record<string, string> = {
  "Snow & Ice": "snow_ice",
  "Landscaping & Grounds": "landscaping",
  "Junk Removal": "junk_removal",
  "Property Care & Maintenance": "property_maintenance",
  "Cleaning Services": "cleaning",
  "Power Washing": "power_washing",
};

function resolveReplyTo(serviceCategory?: string, context: "operational" | "general" = "operational"): string {
  if (serviceCategory) {
    const key = CATEGORY_TO_KEY[serviceCategory];
    if (key && EMAIL_CONFIG.serviceInboxes[key]) {
      return EMAIL_CONFIG.serviceInboxes[key];
    }
  }
  return context === "operational" ? EMAIL_CONFIG.opsInbox : EMAIL_CONFIG.supportInbox;
}

function resolveOpsRecipients(serviceCategory?: string): string[] {
  const recipients = [EMAIL_CONFIG.opsInbox];
  if (serviceCategory) {
    const key = CATEGORY_TO_KEY[serviceCategory];
    if (key && EMAIL_CONFIG.serviceInboxes[key]) {
      const serviceInbox = EMAIL_CONFIG.serviceInboxes[key];
      if (!recipients.includes(serviceInbox)) {
        recipients.push(serviceInbox);
      }
    }
  }
  return recipients;
}

// ── Supabase client ───────────────────────────────────────────────
function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Integration logging ──────────────────────────────────────────
interface IntegrationEntry {
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
}

async function logIntegration(entry: IntegrationEntry) {
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

// ── n8n Event Handoff ────────────────────────────────────────────
const N8N_NOTIFY_EVENTS = new Set([
  "email.request_confirmation",
  "email.ops_notification",
  "email.quote_sent",
  "email.invoice_sent",
  "email.visit_completed",
  "email.incident_report",
  "email.emergency_sos",
]);

async function notifyN8n(entry: IntegrationEntry) {
  if (!N8N_NOTIFY_EVENTS.has(entry.event_name)) return;
  const url = Deno.env.get("N8N_WEBHOOK_URL");
  if (!url) return;

  const payload = {
    event: entry.event_name,
    provider: entry.provider,
    channel: entry.channel || "email",
    status: entry.status,
    recipient: entry.recipient,
    record_type: entry.record_type,
    record_id: entry.record_id,
    provider_response_id: entry.provider_response_id,
    environment: entry.environment || "production",
    metadata: entry.metadata || {},
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await logIntegration({
      provider: "n8n",
      event_name: `n8n.handoff.${entry.event_name}`,
      channel: "webhook",
      status: res.ok ? "success" : "failed",
      record_type: entry.record_type,
      record_id: entry.record_id,
      error_message: res.ok ? undefined : `n8n responded ${res.status}`,
      environment: entry.environment || "production",
      metadata: { upstream_event: entry.event_name },
    });
  } catch (e) {
    console.error("n8n handoff failed:", e);
    await logIntegration({
      provider: "n8n",
      event_name: `n8n.handoff.${entry.event_name}`,
      channel: "webhook",
      status: "failed",
      error_message: e instanceof Error ? e.message : "Unknown error",
      environment: entry.environment || "production",
      metadata: { upstream_event: entry.event_name },
    });
  }
}

// ── Resend sender ────────────────────────────────────────────────
interface EmailAttachment {
  filename: string;
  content: string; // base64
  content_type?: string;
}

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  reply_to?: string;
  attachments?: EmailAttachment[];
}

async function sendViaResend(payload: EmailPayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY not configured" };

  const body: Record<string, unknown> = {
    from: SENDER,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    reply_to: payload.reply_to,
  };
  if (payload.attachments && payload.attachments.length > 0) {
    body.attachments = payload.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.content_type,
    }));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.message || `Resend API error [${res.status}]` };
  return { ok: true, id: data.id };
}

// ── HTML wrapper ─────────────────────────────────────────────────
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

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    // ─── Test email ───
    if (action === "test") {
      const { to } = params;
      if (!to) return json({ error: "Missing 'to' email address" }, 400);
      const result = await sendViaResend({
        to,
        subject: "Praetoria Group — Resend Test Email",
        html: wrapHtml("Test Email", `
          <p>This is a test email sent from <strong>Praetoria Group</strong> via Resend.</p>
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

    // ─── Request Confirmation (customer-facing) ───
    if (action === "request_confirmation") {
      const { customer_email, customer_name, request_subject, service_type, request_id } = params;
      if (!customer_email) return json({ error: "Missing customer_email" }, 400);

      const replyTo = resolveReplyTo(service_type, "operational");

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
        reply_to: replyTo,
      });
      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.request_confirmation",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: customer_email,
        record_type: "service_request",
        record_id: request_id,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { customer_name, service_type, reply_to: replyTo },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);

      // Also send internal ops notification
      const opsRecipients = resolveOpsRecipients(service_type);
      const opsResult = await sendViaResend({
        to: opsRecipients,
        subject: `[New Request] ${request_subject || "Service Request"} — ${service_type || "General"}`,
        html: wrapHtml("New Service Request", `
          <p>A new service request has been submitted:</p>
          <p><strong>Customer:</strong> ${customer_name || "Unknown"} (${customer_email})</p>
          <p><strong>Subject:</strong> ${request_subject || "N/A"}</p>
          <p><strong>Service:</strong> <span class="badge">${service_type || "General"}</span></p>
          <p><a href="https://praetoria-ops-hub.lovable.app/requests/${request_id || ""}">View Request →</a></p>
        `),
      });
      await logIntegration({
        provider: "resend",
        event_name: "email.ops_notification",
        channel: "email",
        status: opsResult.ok ? "success" : "failed",
        recipient: opsRecipients.join(", "),
        record_type: "service_request",
        record_id: request_id,
        provider_response_id: opsResult.id,
        error_message: opsResult.error,
        metadata: { trigger: "request_confirmation", service_type },
      });

      return json({ ...result, action: "request_confirmation" });
    }

    // ─── Quote Sent (customer-facing) ───
    if (action === "quote_sent") {
      const { customer_email, customer_name, quote_number, service_category, total, quote_id, custom_message } = params;
      if (!customer_email) return json({ error: "Missing customer_email" }, 400);

      const replyTo = resolveReplyTo(service_category, "operational");

      const result = await sendViaResend({
        to: customer_email,
        subject: `Quote ${quote_number || ""} — ${service_category || "Service"} — $${total || "0.00"} CAD`,
        html: wrapHtml("Your Quote is Ready", `
          <p>Dear ${customer_name || "Valued Customer"},</p>
          <p>Please find your quote <strong>${quote_number || ""}</strong> for <strong>${service_category || "services"}</strong>, totalling <strong>$${total || "0.00"} CAD</strong> (incl. tax).</p>
          ${custom_message ? `<p style="background:#f0f9ff;padding:12px;border-radius:6px;font-style:italic;">${custom_message}</p>` : ""}
          <p>This quote is valid for 30 days from the issued date. Please reply to this email or call us to proceed.</p>
          <p>You can also view your quotes in your <a href="https://praetoria-ops-hub.lovable.app/portal/quotes">customer portal</a>.</p>
          <p>Best regards,<br/>Praetoria Group</p>
        `),
        reply_to: replyTo,
      });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.quote_sent",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: customer_email,
        record_type: "quote",
        record_id: quote_id,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { quote_number, service_category, total, reply_to: replyTo },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);
      return json({ ...result, action: "quote_sent" });
    }

    // ─── Invoice Sent (customer-facing) ───
    if (action === "invoice_sent") {
      const { customer_email, customer_name, invoice_number, service_category, total, balance_due, due_date, invoice_id, invoice_pdf_url, attachments } = params;
      if (!customer_email) return json({ error: "Missing customer_email" }, 400);

      const replyTo = resolveReplyTo(service_category, "operational");

      // Build attachment links HTML
      let attachmentHtml = "";
      if (invoice_pdf_url) {
        attachmentHtml += `<p style="margin:16px 0 8px;"><a href="${invoice_pdf_url}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:14px;">📄 View / Download Invoice PDF</a></p>`;
      }
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const links = attachments.map((url: string) => {
          const name = decodeURIComponent(url.split("/").pop() || "Attachment");
          return `<a href="${url}" style="color:#1a56db;text-decoration:underline;">${name}</a>`;
        }).join("<br/>");
        attachmentHtml += `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
          <p style="font-weight:600;margin-bottom:8px;">Attachments:</p>${links}`;
      }

      const result = await sendViaResend({
        to: customer_email,
        subject: `Invoice ${invoice_number || ""} — $${balance_due || total || "0.00"} CAD Due ${due_date || ""}`,
        html: wrapHtml("Invoice from Praetoria Group", `
          <p>Dear ${customer_name || "Valued Customer"},</p>
          <p>Please find your invoice <strong>${invoice_number || ""}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:6px 0;color:#71717a;">Total</td><td style="padding:6px 0;text-align:right;font-weight:600;">$${total || "0.00"} CAD</td></tr>
            <tr><td style="padding:6px 0;color:#71717a;">Balance Due</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#dc2626;">$${balance_due || total || "0.00"} CAD</td></tr>
            <tr><td style="padding:6px 0;color:#71717a;">Due Date</td><td style="padding:6px 0;text-align:right;font-weight:600;">${due_date || "Upon receipt"}</td></tr>
          </table>
          ${attachmentHtml}
          <p>You can view and pay this invoice in your <a href="https://praetoria-ops-hub.lovable.app/portal/billing">customer portal</a>.</p>
          <p>Thank you for your business,<br/>Praetoria Group</p>
        `),
        reply_to: replyTo,
      });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.invoice_sent",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: customer_email,
        record_type: "invoice",
        record_id: invoice_id,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { invoice_number, service_category, total, balance_due, due_date, reply_to: replyTo },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);
      return json({ ...result, action: "invoice_sent" });
    }

    // ─── Internal Ops Notification (generic) ───
    if (action === "ops_notification") {
      const { subject, body_html, to_addresses, service_category } = params;
      if (!subject) return json({ error: "Missing subject" }, 400);

      const recipients = to_addresses || resolveOpsRecipients(service_category);
      const result = await sendViaResend({
        to: recipients,
        subject: `[Praetoria Group] ${subject}`,
        html: wrapHtml("Internal Notification", body_html || `<p>${subject}</p>`),
      });
      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.ops_notification",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: Array.isArray(recipients) ? recipients.join(", ") : recipients,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { subject, service_category },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);
      return json({ ...result, action: "ops_notification" });
    }

    // ─── Visit Completed (internal ops) ───
    if (action === "visit_completed") {
      const { visit_number, job_title, property_name, worker_name, service_category, visit_id, completed_at } = params;

      const recipients = resolveOpsRecipients(service_category);
      const result = await sendViaResend({
        to: recipients,
        subject: `[Visit Completed] ${visit_number || "Visit"} — ${property_name || ""}`,
        html: wrapHtml("Visit Completed", `
          <p>A visit has been completed:</p>
          <p><strong>Visit:</strong> ${visit_number || "N/A"}</p>
          <p><strong>Job:</strong> ${job_title || "N/A"}</p>
          <p><strong>Property:</strong> ${property_name || "N/A"}</p>
          <p><strong>Completed by:</strong> ${worker_name || "N/A"}</p>
          <p><strong>Service:</strong> <span class="badge">${service_category || "General"}</span></p>
          <p><strong>Completed at:</strong> ${completed_at || new Date().toISOString()}</p>
          <p><a href="https://praetoria-ops-hub.lovable.app/visits/${visit_id || ""}">View Visit →</a></p>
        `),
      });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.visit_completed",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: recipients.join(", "),
        record_type: "visit",
        record_id: visit_id,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { visit_number, service_category, worker_name },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);
      return json({ ...result, action: "visit_completed" });
    }

    // ─── Incident Report (internal ops + admin) ───
    if (action === "incident_report") {
      const { report_number, incident_type, severity, description, reporter_name, service_category, incident_id } = params;

      const recipients = [...resolveOpsRecipients(service_category)];
      // High severity also notifies admin
      if (severity === "critical" || severity === "high") {
        if (!recipients.includes(EMAIL_CONFIG.adminInbox)) {
          recipients.push(EMAIL_CONFIG.adminInbox);
        }
      }

      const result = await sendViaResend({
        to: recipients,
        subject: `[Incident ${report_number || ""}] ${severity?.toUpperCase() || "ALERT"} — ${incident_type || "Incident"}`,
        html: wrapHtml("Incident Report Filed", `
          <p>An incident report has been filed:</p>
          <p><strong>Report:</strong> ${report_number || "N/A"}</p>
          <p><strong>Type:</strong> ${incident_type || "N/A"}</p>
          <p><strong>Severity:</strong> <span class="badge" style="${severity === "critical" ? "background:#fef2f2;color:#dc2626;" : ""}">${severity || "Unknown"}</span></p>
          <p><strong>Reported by:</strong> ${reporter_name || "N/A"}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ""}
          <p><a href="https://praetoria-ops-hub.lovable.app/admin/incidents/${incident_id || ""}">View Incident →</a></p>
        `),
      });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.incident_report",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: recipients.join(", "),
        record_type: "incident_report",
        record_id: incident_id,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { report_number, incident_type, severity, service_category },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);
      return json({ ...result, action: "incident_report" });
    }

    // ─── Emergency SOS (ops + admin always) ───
    if (action === "emergency_sos") {
      const { reporter_name, reporter_role, location, message, service_category } = params;

      const recipients = [EMAIL_CONFIG.opsInbox, EMAIL_CONFIG.adminInbox];
      // Also add service inbox if known
      if (service_category) {
        const key = CATEGORY_TO_KEY[service_category];
        if (key && EMAIL_CONFIG.serviceInboxes[key]) {
          recipients.push(EMAIL_CONFIG.serviceInboxes[key]);
        }
      }

      const result = await sendViaResend({
        to: [...new Set(recipients)],
        subject: `🚨 [EMERGENCY SOS] ${reporter_name || "Unknown"} — Immediate Attention Required`,
        html: wrapHtml("🚨 Emergency SOS Triggered", `
          <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:16px;">
            <p style="color:#dc2626;font-weight:700;font-size:16px;margin:0 0 8px;">EMERGENCY — Immediate Response Required</p>
            <p><strong>Person:</strong> ${reporter_name || "Unknown"}</p>
            <p><strong>Role:</strong> ${reporter_role || "N/A"}</p>
            ${location ? `<p><strong>Location:</strong> ${location}</p>` : ""}
            ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>
          <p>This SOS was triggered from the Praetoria Group platform. Please respond immediately.</p>
        `),
      });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.emergency_sos",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: recipients.join(", "),
        record_type: "emergency_sos",
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { reporter_name, reporter_role, location, service_category },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);
      return json({ ...result, action: "emergency_sos" });
    }

    // ─── Incident Report Share (external forward) ───
    if (action === "incident_share") {
      const { to, subject, html, reply_to } = params;
      if (!to) return json({ error: "Missing 'to' email address" }, 400);

      const result = await sendViaResend({
        to,
        subject: subject || "Incident Report — Praetoria Group",
        html: html || "<p>Incident report attached.</p>",
        reply_to: reply_to || EMAIL_CONFIG.opsInbox,
      });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.incident_report",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: Array.isArray(to) ? to.join(", ") : to,
        record_type: "incident_report",
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { subject },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);
      return json({ ...result, action: "incident_share" });
    }

    // ─── Agreement Sent / Reminder (recipient-facing) ───
    if (action === "agreement_sent") {
      const {
        to,
        recipient_name,
        agreement_title,
        agreement_id,
        agreement_category,
        internal_reference,
        signing_url,
        portal_url,
        attachment_present,
        is_reminder,
      } = params;

      if (!to) return json({ error: "Missing 'to' email address" }, 400);
      if (!signing_url) return json({ error: "Missing signing_url" }, 400);

      const result = await sendViaResend({
        to,
        subject: `${is_reminder ? "Reminder: " : ""}${agreement_title || "Agreement"} — Signature Requested`,
        html: wrapHtml(is_reminder ? "Agreement Reminder" : "Agreement Ready for Signature", `
          <p>Dear ${recipient_name || "Valued Recipient"},</p>
          <p>Please review and sign <strong>${agreement_title || "your agreement"}</strong>.</p>
          ${internal_reference ? `<p><strong>Reference:</strong> ${internal_reference}</p>` : ""}
          ${agreement_category ? `<p><strong>Category:</strong> <span class="badge">${agreement_category}</span></p>` : ""}
          ${attachment_present ? `<p>A PDF version of the agreement is available inside the secure signing page below.</p>` : ""}
          <p style="margin:24px 0;">
            <a href="${signing_url}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Review &amp; Sign Agreement</a>
          </p>
          <p>If the button does not open, copy and paste this secure link into your browser:</p>
          <p style="word-break:break-all;"><a href="${signing_url}">${signing_url}</a></p>
          ${portal_url ? `<p>If you already have portal access, you can also find this agreement in your portal:<br/><a href="${portal_url}">${portal_url}</a></p>` : ""}
          <p>If you have any questions, simply reply to this email and our team will help.</p>
          <p>Best regards,<br/>Praetoria Group</p>
        `),
        reply_to: EMAIL_CONFIG.opsInbox,
      });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.agreement_sent",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: Array.isArray(to) ? to.join(", ") : to,
        record_type: "agreement",
        record_id: agreement_id,
        provider_response_id: result.id,
        error_message: result.error,
        metadata: {
          agreement_title,
          agreement_category,
          internal_reference,
          attachment_present: !!attachment_present,
          is_reminder: !!is_reminder,
        },
      };
      await logIntegration(logEntry);
      await notifyN8n(logEntry);
      return json({ ...result, action: "agreement_sent" });
    }

    // ─── Request Reply (admin → customer) ───
    if (action === "request_reply") {
      const { to, subject, body: messageBody, attachments, request_id } = params;
      if (!to || !messageBody) return json({ error: "to and body are required" }, 400);

      let attachmentHtml = "";
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const links = attachments.map((url: string) => {
          const name = url.split("/").pop() || "Attachment";
          return `<a href="${url}" style="color:#1a56db;text-decoration:underline;">${name}</a>`;
        }).join("<br/>");
        attachmentHtml = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
          <p style="font-weight:600;margin-bottom:8px;">Attachments:</p>${links}`;
      }

      const html = wrapHtml(`Re: ${subject || "Your Request"}`, `
        <h2 style="margin:0 0 16px;font-size:18px;">Message from Praetoria Group</h2>
        <div style="white-space:pre-wrap;line-height:1.6;">${messageBody}</div>
        ${attachmentHtml}
        <p style="margin-top:24px;font-size:13px;color:#6b7280;">If you have questions, simply reply to this email.</p>
      `);

      const replyTo = resolveReplyTo(undefined, "operational");
      const result = await sendViaResend({ to, subject: subject || "Update on your request", html, reply_to: replyTo });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.request_reply",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: to,
        record_type: "service_request",
        record_id: request_id,
        provider_response_id: result.id,
        error_message: result.error,
      };
      await logIntegration(logEntry);
      return json({ ...result, action: "request_reply" });
    }

    // ─── Subcontractor Payment Receipt ───
    if (action === "subcontractor_payment_receipt") {
      const { to, contact_name, company_name, invoice_number, amount, payment_date, payment_method, reference_number } = params;
      if (!to) return json({ error: "Missing 'to' email" }, 400);

      const fmtAmount = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(amount || 0));
      const fmtDate = payment_date || new Date().toISOString().split("T")[0];

      const html = wrapHtml("Payment Receipt", `
        <p>Hi ${contact_name || "there"},</p>
        <p>This confirms that payment has been processed for your invoice.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="border-bottom:1px solid #e4e4e7;">
            <td style="padding:8px 0;color:#71717a;font-size:13px;">Invoice</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;">${invoice_number || "—"}</td>
          </tr>
          <tr style="border-bottom:1px solid #e4e4e7;">
            <td style="padding:8px 0;color:#71717a;font-size:13px;">Amount Paid</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#059669;">${fmtAmount}</td>
          </tr>
          <tr style="border-bottom:1px solid #e4e4e7;">
            <td style="padding:8px 0;color:#71717a;font-size:13px;">Payment Date</td>
            <td style="padding:8px 0;text-align:right;">${fmtDate}</td>
          </tr>
          ${payment_method ? `<tr style="border-bottom:1px solid #e4e4e7;"><td style="padding:8px 0;color:#71717a;font-size:13px;">Method</td><td style="padding:8px 0;text-align:right;">${payment_method}</td></tr>` : ""}
          ${reference_number ? `<tr><td style="padding:8px 0;color:#71717a;font-size:13px;">Reference</td><td style="padding:8px 0;text-align:right;font-family:monospace;font-size:13px;">${reference_number}</td></tr>` : ""}
        </table>
        <p style="font-size:13px;color:#71717a;">If you have questions about this payment, please contact us at <a href="mailto:support@praetoriagroup.ca" style="color:#0369a1;">support@praetoriagroup.ca</a>.</p>
        <p>Thank you for your work,<br><strong>Praetoria Group</strong></p>
      `);

      const result = await sendViaResend({ to, subject: `Payment Receipt — ${invoice_number || "Invoice"}`, html, reply_to: EMAIL_CONFIG.supportInbox });
      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.subcontractor_payment_receipt",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: typeof to === "string" ? to : to[0],
        record_type: "subcontractor_invoice",
        provider_response_id: result.id,
        error_message: result.error,
      };
      await logIntegration(logEntry);
      return json({ ...result, action: "subcontractor_payment_receipt" });
    }

    // ─── Pay Stub Email (employee) ───
    if (action === "pay_stub_email") {
      const {
        to,
        employee_name,
        pay_date,
        pay_period_start,
        pay_period_end,
        net_pay,
        stub_pdf_url,
        stub_pdf_base64,
        stub_pdf_filename,
      } = params;
      if (!to) return json({ error: "Missing 'to' email address" }, 400);

      let attachment: EmailAttachment | null = null;
      const filename = stub_pdf_filename || `pay-stub-${pay_date || "latest"}.pdf`;

      if (stub_pdf_base64 && typeof stub_pdf_base64 === "string") {
        attachment = { filename, content: stub_pdf_base64, content_type: "application/pdf" };
      } else if (stub_pdf_url && typeof stub_pdf_url === "string") {
        try {
          const pdfRes = await fetch(stub_pdf_url);
          if (pdfRes.ok) {
            const buf = new Uint8Array(await pdfRes.arrayBuffer());
            // base64-encode in chunks to avoid stack overflow on large PDFs
            let binary = "";
            const chunk = 0x8000;
            for (let i = 0; i < buf.length; i += chunk) {
              binary += String.fromCharCode(...buf.subarray(i, i + chunk));
            }
            attachment = { filename, content: btoa(binary), content_type: "application/pdf" };
          }
        } catch {
          // fall through — we'll send without attachment but warn caller
        }
      }

      if (!attachment) {
        return json({
          ok: false,
          error: "No PDF attachment available. Use 'Upload to Portal' first to generate a PDF, or provide stub_pdf_base64.",
        }, 400);
      }

      const periodLabel = pay_period_start && pay_period_end
        ? `${pay_period_start} \u2013 ${pay_period_end}`
        : pay_date || "";

      const result = await sendViaResend({
        to,
        subject: `Pay Stub \u2013 ${pay_date || ""} \u2013 Praetoria Group`,
        html: wrapHtml("Your Pay Stub", `
          <p>Hi ${employee_name || "there"},</p>
          <p>Your pay stub for the period <strong>${periodLabel}</strong> is attached as a PDF.</p>
          ${net_pay ? `<p><strong>Net Pay:</strong> $${Number(net_pay).toFixed(2)} CAD</p>` : ""}
          <p>If you have any questions about your pay, please contact <a href="mailto:support@praetoriagroup.ca" style="color:#0369a1;">support@praetoriagroup.ca</a>.</p>
          <p>Thank you,<br/><strong>Praetoria Group Payroll</strong></p>
        `),
        reply_to: EMAIL_CONFIG.supportInbox,
        attachments: [attachment],
      });

      await logIntegration({
        provider: "resend",
        event_name: "email.pay_stub",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: typeof to === "string" ? to : to[0],
        record_type: "pay_stub",
        provider_response_id: result.id,
        error_message: result.error,
      });
      return json({ ...result, action: "pay_stub_email" });
    }

    // ─── Subcontractor Invoice Rejected ───
    if (action === "subcontractor_invoice_rejected") {
      const { to, contact_name, company_name, invoice_number, amount, reason } = params;
      if (!to) return json({ error: "Missing 'to' email address" }, 400);

      const amountStr = amount != null ? Number(amount).toFixed(2) : "0.00";
      const result = await sendViaResend({
        to,
        subject: `Action Required: Invoice ${invoice_number || ""} needs revision`,
        html: wrapHtml("Invoice Requires Revision", `
          <p>Hi ${contact_name || company_name || "there"},</p>
          <p>Your submitted invoice <strong>${invoice_number || ""}</strong> ($${amountStr} CAD) has been reviewed and requires changes before we can process payment.</p>
          <p style="background:#fef2f2;border-left:3px solid #dc2626;padding:12px;border-radius:4px;">
            <strong>Reason:</strong><br/>${(reason || "").replace(/\n/g, "<br/>")}
          </p>
          <p>Please log in to your <a href="https://praetoria-ops-hub.lovable.app/subcontractor/invoices">subcontractor portal</a> to edit and resubmit this invoice.</p>
          <p>If you have questions, reply to this email or contact <a href="mailto:${EMAIL_CONFIG.adminInbox}">${EMAIL_CONFIG.adminInbox}</a>.</p>
          <p>Thank you,<br/>Praetoria Group</p>
        `),
        reply_to: EMAIL_CONFIG.adminInbox,
      });

      await logIntegration({
        provider: "resend",
        event_name: "email.subcontractor_invoice_rejected",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: to,
        record_type: "subcontractor_invoice",
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { invoice_number, amount, company_name },
      });
      return json({ ...result, action: "subcontractor_invoice_rejected" });
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
