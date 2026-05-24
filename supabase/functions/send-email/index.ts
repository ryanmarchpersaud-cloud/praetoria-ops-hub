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

// ── Security helpers ──────────────────────────────────────────────
// Allowed origins for any URL fetched server-side (SSRF guard) or rendered as href
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const ALLOWED_FETCH_PREFIXES = [
  SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/` : "",
  "https://praetoria-ops-hub.lovable.app/",
  "https://praetoriagroup.ca/",
  "https://www.praetoriagroup.ca/",
].filter(Boolean);

function isAllowedHttpsUrl(u: unknown): u is string {
  if (typeof u !== "string" || !u) return false;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_FETCH_PREFIXES.some((p) => u.startsWith(p));
  } catch {
    return false;
  }
}

function encodeAttr(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Strip <script>/<style>/<iframe>/<object>/<embed> blocks and on*= handlers
// and javascript:/data: URLs. Not a full sanitizer, but blocks the common
// HTML-injection vectors for emails composed via this endpoint.
function sanitizeEmailHtml(input: unknown): string {
  if (typeof input !== "string" || !input) return "";
  let s = input;
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*"(?:[^"\\]|\\.)*"/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*'(?:[^'\\]|\\.)*'/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  s = s.replace(/(href|src)\s*=\s*"\s*(javascript|data|vbscript):[^"]*"/gi, '$1="#"');
  s = s.replace(/(href|src)\s*=\s*'\s*(javascript|data|vbscript):[^']*'/gi, "$1='#'");
  return s;
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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value: unknown): string {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizePdfText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function pdfText(value: unknown): string {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildPdf(pages: string[]): string {
  const encoder = new TextEncoder();
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  pages.forEach((content, i) => {
    const contentObject = 4 + i * 2;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return bytesToBase64(encoder.encode(pdf));
}

function generateQuotePdfBase64(quote: Record<string, unknown>, client: Record<string, unknown> | null, lineItems: Record<string, unknown>[]): string {
  const pages: string[] = [];
  let ops = "";
  let y = 744;
  const left = 48;
  const right = 564;

  const newPage = () => {
    pages.push(ops);
    ops = "";
    y = 744;
  };
  const ensureSpace = (height = 24) => {
    if (y - height < 62) newPage();
  };
  const text = (value: unknown, x = left, size = 10, font: "F1" | "F2" = "F1") => {
    ensureSpace(size + 8);
    ops += `BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET\n`;
    y -= size + 6;
  };
  const line = () => {
    ensureSpace(12);
    ops += `0.82 0.84 0.87 RG ${left} ${y} m ${right} ${y} l S\n`;
    y -= 14;
  };
  const wrapped = (value: unknown, x = left, size = 10, maxChars = 88) => {
    const words = normalizePdfText(value).split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        text(current, x, size);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) text(current, x, size);
  };

  ops += "0.10 0.10 0.18 rg 48 760 516 4 re f\n";
  text("PRAETORIA GROUP", left, 18, "F2");
  text("Property Services & Maintenance | Regina, Saskatchewan", left, 9);
  text("support@praetoriagroup.ca | (306) 737-6269", left, 9);
  y = 710;
  text("QUOTATION", 398, 24, "F2");
  text(quote.quote_number || "", 398, 12, "F2");
  y = 674;
  line();

  text("Prepared For", left, 9, "F2");
  text(`${client?.first_name || ""} ${client?.last_name || ""}`.trim() || client?.company_name || "Valued Customer", left, 12, "F2");
  if (client?.company_name) text(client.company_name, left, 10);
  if (client?.address_line_1) text(client.address_line_1, left, 9);
  const location = [client?.city, client?.province, client?.postal_code].filter(Boolean).join(", ");
  if (location) text(location, left, 9);
  if (client?.email) text(client.email, left, 9);

  y += 92;
  text("Service Category", 360, 9, "F2");
  text(quote.service_category || "Property Services", 360, 11, "F2");
  text("Total", 360, 9, "F2");
  text(`$${formatMoney(quote.total)} CAD`, 360, 16, "F2");
  y -= 26;
  line();

  if (quote.scope_of_work) {
    text("Scope of Work", left, 10, "F2");
    wrapped(quote.scope_of_work, left, 10, 92);
    y -= 8;
  }

  text("Line Items", left, 10, "F2");
  line();
  text("Item", left, 9, "F2");
  y += 15;
  text("Qty", 344, 9, "F2");
  y += 15;
  text("Unit", 404, 9, "F2");
  y += 15;
  text("Total", 488, 9, "F2");
  line();

  lineItems.forEach((item) => {
    ensureSpace(44);
    text(item.item_name || "Service", left, 10, "F2");
    if (item.description) wrapped(item.description, left + 12, 8, 58);
    y += item.description ? 31 : 15;
    text(String(Number(item.quantity || 0)), 344, 9);
    y += 15;
    text(`$${formatMoney(item.unit_price)}`, 404, 9);
    y += 15;
    text(`$${formatMoney(item.line_total)}`, 488, 9, "F2");
    y -= item.description ? 16 : 0;
    line();
  });

  y -= 4;
  text(`Subtotal: $${formatMoney(quote.subtotal)}`, 392, 10);
  text(`Tax (${(Number(quote.tax_rate || 0.13) * 100).toFixed(0)}%): $${formatMoney(quote.tax)}`, 392, 10);
  text(`Total (CAD): $${formatMoney(quote.total)}`, 392, 13, "F2");

  y -= 20;
  text("Terms & Conditions", left, 10, "F2");
  wrapped("This quote is valid for 30 days from the issued date. Payment terms are Net 30 from project completion unless otherwise agreed. Prices do not include additional scope changes unless separately quoted.", left, 9, 92);
  y -= 16;
  text("Praetoria Group", left, 10, "F2");
  text("Ryan Steven Persaud - Authorized Representative", left, 9);

  pages.push(ops);
  return buildPdf(pages);
}

// ── Main handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require either a valid user JWT or an internal service-role token
  const { requireAuthOrServiceRole } = await import("../_shared/auth.ts");
  const auth = await requireAuthOrServiceRole(req);
  if (!auth.ok) return auth.response;

  // ── Role-based action gating ──────────────────────────────────
  // Only ops staff may invoke arbitrary outbound email actions.
  // Field roles (worker/subcontractor) are limited to a small
  // allow-list of legitimately field-triggered actions.
  const OPS_ONLY_BYPASS_ACTIONS = new Set([
    "test",
    "health",
    "request_confirmation",
  ]);
  const FIELD_ALLOWED_ACTIONS = new Set([
    "emergency_sos",
    "incident_report",
    "incident_share",
  ]);
  const OPS_ROLES = new Set([
    "owner", "admin", "ops_manager", "manager", "accountant", "hr_admin", "dispatcher", "supervisor",
  ]);
  const FIELD_ROLES = new Set([
    "staff", "lead_worker", "supervisor", "dispatcher", "subcontractor",
  ]);

  try {
    const { action, ...params } = await req.json();

    if (!auth.isServiceRole && !OPS_ONLY_BYPASS_ACTIONS.has(action)) {
      const { data: roleRows } = await auth.adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.userId);
      const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
      const isOps = roles.some((r) => OPS_ROLES.has(r));
      const isField = roles.some((r) => FIELD_ROLES.has(r));
      const allowed = isOps || (isField && FIELD_ALLOWED_ACTIONS.has(action));
      if (!allowed) {
        return json({ error: "Forbidden" }, 403);
      }
    }


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
      const sb = getServiceClient();
      let quoteRecord: Record<string, unknown> = { quote_number, service_category, total, id: quote_id };
      let clientRecord: Record<string, unknown> | null = null;
      let quoteLineItems: Record<string, unknown>[] = [];

      if (quote_id) {
        const { data: dbQuote, error: dbQuoteError } = await sb
          .from("quotes")
          .select("*, customers(*), leads(*)")
          .eq("id", quote_id)
          .maybeSingle();
        if (dbQuoteError) return json({ error: dbQuoteError.message }, 500);
        if (dbQuote) {
          quoteRecord = dbQuote as Record<string, unknown>;
          clientRecord = ((dbQuote as Record<string, unknown>).customers || (dbQuote as Record<string, unknown>).leads || null) as Record<string, unknown> | null;
        }

        const { data: dbItems, error: itemsError } = await sb
          .from("quote_line_items")
          .select("item_name, description, quantity, unit_price, line_total, sort_order")
          .eq("quote_id", quote_id)
          .order("sort_order");
        if (itemsError) return json({ error: itemsError.message }, 500);
        quoteLineItems = (dbItems || []) as Record<string, unknown>[];
      }

      const resolvedEmail = String(customer_email || clientRecord?.email || "");
      if (!resolvedEmail) return json({ error: "Missing customer_email" }, 400);

      const resolvedName = String(
        customer_name ||
          [clientRecord?.first_name, clientRecord?.last_name].filter(Boolean).join(" ").trim() ||
          clientRecord?.company_name ||
          "Valued Customer"
      );
      const resolvedQuoteNumber = String(quoteRecord.quote_number || quote_number || "");
      const resolvedCategory = String(quoteRecord.service_category || service_category || "Property Services");
      const subtotalFromItems = quoteLineItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
      const taxRate = Number(quoteRecord.tax_rate || 0.13);
      const resolvedSubtotal = Number(quoteRecord.subtotal || subtotalFromItems || 0);
      const resolvedTax = Number(quoteRecord.tax || (resolvedSubtotal * taxRate) || 0);
      const resolvedTotal = Number(quoteRecord.total || total || (resolvedSubtotal + resolvedTax) || 0);
      const pdfBase64 = generateQuotePdfBase64(
        { ...quoteRecord, subtotal: resolvedSubtotal, tax: resolvedTax, total: resolvedTotal, tax_rate: taxRate, service_category: resolvedCategory, quote_number: resolvedQuoteNumber },
        clientRecord,
        quoteLineItems,
      );

      const replyTo = resolveReplyTo(resolvedCategory, "operational");
      const itemsHtml = quoteLineItems.length > 0
        ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            ${quoteLineItems.map((item) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;"><strong>${escapeHtml(item.item_name)}</strong>${item.description ? `<br/><span style="color:#71717a;font-size:12px;">${escapeHtml(item.description)}</span>` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">$${formatMoney(item.line_total)}</td></tr>`).join("")}
          </table>`
        : "";

      const result = await sendViaResend({
        to: resolvedEmail,
        subject: `Quote ${resolvedQuoteNumber} — ${resolvedCategory} — $${formatMoney(resolvedTotal)} CAD`,
        html: wrapHtml("Your Quote is Ready", `
          <p>Dear ${escapeHtml(resolvedName)},</p>
          <p>Your attached PDF quotation <strong>${escapeHtml(resolvedQuoteNumber)}</strong> is for <strong>${escapeHtml(resolvedCategory)}</strong>, totalling <strong>$${formatMoney(resolvedTotal)} CAD</strong> (incl. tax).</p>
          ${itemsHtml}
          ${quoteRecord.scope_of_work ? `<p><strong>Scope of work:</strong><br/>${escapeHtml(quoteRecord.scope_of_work).replace(/\n/g, "<br/>")}</p>` : ""}
          ${custom_message ? `<p style="background:#f0f9ff;padding:12px;border-radius:6px;font-style:italic;">${escapeHtml(custom_message)}</p>` : ""}
          <p>The full customer-ready quotation PDF is attached to this email. This quote is valid for 30 days from the issued date. Please reply to this email or call us to proceed.</p>
          <p>You can also view your quotes in your <a href="https://praetoria-ops-hub.lovable.app/portal/quotes">customer portal</a>.</p>
          <p>Best regards,<br/>Praetoria Group</p>
        `),
        reply_to: replyTo,
        attachments: [{ filename: `${resolvedQuoteNumber || "quote"}.pdf`, content: pdfBase64, content_type: "application/pdf" }],
      });

      const logEntry: IntegrationEntry = {
        provider: "resend",
        event_name: "email.quote_sent",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: resolvedEmail,
        record_type: "quote",
        record_id: String(quote_id || quoteRecord.id || ""),
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { quote_number: resolvedQuoteNumber, service_category: resolvedCategory, total: formatMoney(resolvedTotal), reply_to: replyTo, pdf_attached: true, line_item_count: quoteLineItems.length },
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

      // Build attachment links HTML — only allow trusted https URLs
      let attachmentHtml = "";
      if (isAllowedHttpsUrl(invoice_pdf_url)) {
        attachmentHtml += `<p style="margin:16px 0 8px;"><a href="${encodeAttr(invoice_pdf_url)}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;font-size:14px;">📄 View / Download Invoice PDF</a></p>`;
      }
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const safe = attachments.filter((url: unknown) => isAllowedHttpsUrl(url)) as string[];
        if (safe.length > 0) {
          const links = safe.map((url: string) => {
            const name = encodeAttr(decodeURIComponent(url.split("/").pop() || "Attachment"));
            return `<a href="${encodeAttr(url)}" style="color:#1a56db;text-decoration:underline;">${name}</a>`;
          }).join("<br/>");
          attachmentHtml += `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>
            <p style="font-weight:600;margin-bottom:8px;">Attachments:</p>${links}`;
        }
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
        html: wrapHtml("Internal Notification", sanitizeEmailHtml(body_html) || `<p>${encodeAttr(String(subject))}</p>`),
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
          <p><strong>Report:</strong> ${escapeHtml(report_number || "N/A")}</p>
          <p><strong>Type:</strong> ${escapeHtml(incident_type || "N/A")}</p>
          <p><strong>Severity:</strong> <span class="badge" style="${severity === "critical" ? "background:#fef2f2;color:#dc2626;" : ""}">${escapeHtml(severity || "Unknown")}</span></p>
          <p><strong>Reported by:</strong> ${escapeHtml(reporter_name || "N/A")}</p>
          ${description ? `<p><strong>Description:</strong> ${escapeHtml(description)}</p>` : ""}
          <p><a href="https://praetoria-ops-hub.lovable.app/admin/incidents/${encodeURIComponent(incident_id || "")}">View Incident →</a></p>
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
        subject: `🚨 [EMERGENCY SOS] ${String(reporter_name || "Unknown").slice(0, 80)} — Immediate Attention Required`,
        html: wrapHtml("🚨 Emergency SOS Triggered", `
          <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:16px;">
            <p style="color:#dc2626;font-weight:700;font-size:16px;margin:0 0 8px;">EMERGENCY — Immediate Response Required</p>
            <p><strong>Person:</strong> ${escapeHtml(reporter_name || "Unknown")}</p>
            <p><strong>Role:</strong> ${escapeHtml(reporter_role || "N/A")}</p>
            ${location ? `<p><strong>Location:</strong> ${escapeHtml(location)}</p>` : ""}
            ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ""}
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
        html: sanitizeEmailHtml(html) || "<p>Incident report attached.</p>",
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
      if (!isAllowedHttpsUrl(signing_url)) {
        return json({ error: "signing_url must be an allowed https URL on a Praetoria domain" }, 400);
      }
      if (portal_url && !isAllowedHttpsUrl(portal_url)) {
        return json({ error: "portal_url must be an allowed https URL on a Praetoria domain" }, 400);
      }
      const safeSigningUrl = encodeAttr(signing_url);
      const safePortalUrl = portal_url ? encodeAttr(portal_url) : "";

      const result = await sendViaResend({
        to,
        subject: `${is_reminder ? "Reminder: " : ""}${String(agreement_title || "Agreement").slice(0, 160)} — Signature Requested`,
        html: wrapHtml(is_reminder ? "Agreement Reminder" : "Agreement Ready for Signature", `
          <p>Dear ${escapeHtml(recipient_name || "Valued Recipient")},</p>
          <p>Please review and sign <strong>${escapeHtml(agreement_title || "your agreement")}</strong>.</p>
          ${internal_reference ? `<p><strong>Reference:</strong> ${escapeHtml(internal_reference)}</p>` : ""}
          ${agreement_category ? `<p><strong>Category:</strong> <span class="badge">${escapeHtml(agreement_category)}</span></p>` : ""}
          ${attachment_present ? `<p>A PDF version of the agreement is available inside the secure signing page below.</p>` : ""}
          <p style="margin:24px 0;">
            <a href="${safeSigningUrl}" style="display:inline-block;background:#1a1a2e;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Review &amp; Sign Agreement</a>
          </p>
          <p>If the button does not open, copy and paste this secure link into your browser:</p>
          <p style="word-break:break-all;"><a href="${safeSigningUrl}">${escapeHtml(signing_url)}</a></p>
          ${safePortalUrl ? `<p>If you already have portal access, you can also find this agreement in your portal:<br/><a href="${safePortalUrl}">${escapeHtml(portal_url)}</a></p>` : ""}

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
        const links = attachments
          .filter((url: unknown) => isAllowedHttpsUrl(url))
          .map((url: string) => {
            const name = url.split("/").pop() || "Attachment";
            return `<a href="${encodeAttr(url)}" style="color:#1a56db;text-decoration:underline;">${escapeHtml(name)}</a>`;
          }).join("<br/>");
        if (links) {
          attachmentHtml = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
            <p style="font-weight:600;margin-bottom:8px;">Attachments:</p>${links}`;
        }
      }

      // messageBody is plain text from admin; render as escaped text preserving newlines
      const safeBody = escapeHtml(messageBody).replace(/\r?\n/g, "<br/>");
      const html = wrapHtml(`Re: ${escapeHtml(subject || "Your Request")}`, `
        <h2 style="margin:0 0 16px;font-size:18px;">Message from Praetoria Group</h2>
        <div style="line-height:1.6;">${safeBody}</div>
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
      } else if (isAllowedHttpsUrl(stub_pdf_url)) {
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

    // ─── Subcontractor Invoice Submitted (notify ops/finance) ───
    if (action === "subcontractor_invoice_submitted") {
      const { company_name, contact_name, invoice_number, amount, invoice_date, attachment_url, is_resubmission } = params;
      const recipients = [EMAIL_CONFIG.opsInbox, EMAIL_CONFIG.adminInbox];
      const amountStr = amount != null ? Number(amount).toFixed(2) : "0.00";
      const verb = is_resubmission ? "resubmitted" : "submitted";
      const subjectPrefix = is_resubmission ? "Resubmitted" : "New";

      const safeAttachmentUrl = isAllowedHttpsUrl(attachment_url) ? encodeAttr(attachment_url) : "";
      const result = await sendViaResend({
        to: recipients,
        subject: `${subjectPrefix} Subcontractor Invoice ${String(invoice_number || "").slice(0, 60)} — ${String(company_name || "Subcontractor").slice(0, 80)} ($${amountStr})`,
        html: wrapHtml(`Subcontractor Invoice ${verb}`, `
          <p>A subcontractor invoice has been ${escapeHtml(verb)} for review.</p>
          <table style="border-collapse:collapse;margin:12px 0;">
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Invoice #</td><td style="padding:4px 0;"><strong>${escapeHtml(invoice_number || "—")}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Subcontractor</td><td style="padding:4px 0;">${escapeHtml(company_name || "—")}${contact_name ? ` (${escapeHtml(contact_name)})` : ""}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Amount</td><td style="padding:4px 0;"><strong>$${amountStr} CAD</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#64748b;">Invoice Date</td><td style="padding:4px 0;">${escapeHtml(invoice_date || "—")}</td></tr>
          </table>
          ${safeAttachmentUrl ? `<p><a href="${safeAttachmentUrl}" style="color:#2563eb;">View attached invoice PDF</a></p>` : ""}
          <p><a href="https://praetoria-ops-hub.lovable.app/subcontractors/invoices" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Review in Admin Portal</a></p>
        `),
        reply_to: EMAIL_CONFIG.opsInbox,
      });


      await logIntegration({
        provider: "resend",
        event_name: "email.subcontractor_invoice_submitted",
        channel: "email",
        status: result.ok ? "success" : "failed",
        recipient: recipients.join(", "),
        record_type: "subcontractor_invoice",
        provider_response_id: result.id,
        error_message: result.error,
        metadata: { invoice_number, amount, company_name, is_resubmission: !!is_resubmission },
      });
      return json({ ...result, action: "subcontractor_invoice_submitted" });
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
