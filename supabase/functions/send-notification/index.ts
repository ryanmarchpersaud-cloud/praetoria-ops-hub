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

function renderTemplate(template: string, vars: Record<string, string>): string {
  // Replace merge variables; missing ones render as empty string (never raw {{placeholder}})
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

const APP_BASE_URL = "https://praetoriagroup.ca";

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function categoryColor(category?: string | null): string {
  const c = (category || "").toLowerCase();
  if (c.includes("snow") || c.includes("ice")) return "#2563eb";
  if (c.includes("landscap") || c.includes("ground") || c.includes("lawn")) return "#16a34a";
  if (c.includes("maintenance") || c.includes("property care")) return "#ca8a04";
  if (c.includes("junk") || c.includes("removal") || c.includes("haul")) return "#ea580c";
  if (c.includes("clean")) return "#0891b2";
  if (c.includes("power") || c.includes("pressure") || c.includes("wash")) return "#0ea5e9";
  if (c.includes("paint")) return "#7c3aed";
  return "#0F172A";
}

function fmtDate(d?: string | null): string {
  if (!d) return "";
  try {
    const dt = new Date(d.length <= 10 ? d + "T12:00:00" : d);
    return dt.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}

function fmtTime(d?: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

async function buildAssignmentEmail(
  supabase: any,
  record_type: string | undefined,
  record_id: string | undefined,
  audience: string,
  fallbackSubject: string,
): Promise<{ subject: string; html: string } | null> {
  if (!record_id || !record_type) return null;

  let job: any = null;
  let visit: any = null;
  let property: any = null;
  let customer: any = null;

  if (record_type === "visit") {
    const { data: v } = await supabase
      .from("visits")
      .select("id, visit_number, visit_type, service_date, arrival_time, completion_time, service_summary, crew_notes, job_id, property_id, customer_id, assigned_worker_id")
      .eq("id", record_id).maybeSingle();
    visit = v;
    if (v?.job_id) {
      const { data: j } = await supabase.from("jobs").select("*").eq("id", v.job_id).maybeSingle();
      job = j;
    }
    if (v?.property_id) {
      const { data: p } = await supabase.from("properties").select("*").eq("id", v.property_id).maybeSingle();
      property = p;
    }
    if (v?.customer_id) {
      const { data: c } = await supabase.from("customers").select("*").eq("id", v.customer_id).maybeSingle();
      customer = c;
    }
  } else if (record_type === "job") {
    const { data: j } = await supabase.from("jobs").select("*").eq("id", record_id).maybeSingle();
    job = j;
    if (j?.property_id) {
      const { data: p } = await supabase.from("properties").select("*").eq("id", j.property_id).maybeSingle();
      property = p;
    }
    if (j?.customer_id) {
      const { data: c } = await supabase.from("customers").select("*").eq("id", j.customer_id).maybeSingle();
      customer = c;
    }
  } else {
    return null;
  }

  if (!job && !visit) return null;

  const category = job?.service_category || visit?.visit_type || "";
  const color = categoryColor(category);
  const title = visit
    ? `New Visit Assigned${category ? ` — ${category}` : ""}`
    : `New Job Assigned${category ? ` — ${category}` : ""}`;
  const recordNumber = visit?.visit_number || job?.job_number || "";

  const customerName = customer
    ? (customer.company_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim())
    : "";
  const customerPhone = customer?.phone || "";
  const propertyName = property?.property_name || "";
  const addressParts = [property?.address_line_1, property?.address_line_2, property?.city, property?.province, property?.postal_code]
    .filter(Boolean).join(", ");
  const fullAddress = addressParts || propertyName || "";
  const mapsQuery = encodeURIComponent(fullAddress);
  const googleMaps = fullAddress ? `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}` : "";
  const appleMaps = fullAddress ? `https://maps.apple.com/?daddr=${mapsQuery}` : "";
  const wazeMaps = fullAddress ? `https://waze.com/ul?q=${mapsQuery}&navigate=yes` : "";

  const dateLabel = visit?.service_date ? fmtDate(visit.service_date) : (job?.scheduled_date ? fmtDate(job.scheduled_date) : "");
  const timeLabel = visit?.arrival_time ? fmtTime(visit.arrival_time) : "";

  const rawScope = job?.scope_of_work || "";
  // Strip any pricing/financial lines — workers & subcontractors must never see $$ in assignment emails
  const stripPricing = (text: string) => text
    .split("\n")
    .filter((line) => {
      const l = line.toLowerCase();
      if (/\$\s*\d/.test(line)) return false;
      if (/\b(gst|pst|hst|tax|subtotal|total|deposit|balance|amount\s*due|price|charge|fee|invoice\s*total|service\s*charge)\b\s*[:\-]/i.test(line)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const scope = (audience === "worker" || audience === "subcontractor") ? stripPricing(rawScope) : rawScope;
  const instructions = job?.service_instructions || "";
  const visitNotes = visit?.service_summary || visit?.crew_notes || "";

  const hazards: string[] = [];
  if (property?.high_risk_flag) hazards.push("⚠️ High-risk site — review hazards before arrival");
  if (property?.caution_notes) hazards.push(`⚠️ ${property.caution_notes}`);
  const accessLines: string[] = [];
  if (property?.gate_code) accessLines.push(`Gate code: <strong>${escapeHtml(property.gate_code)}</strong>`);
  if (property?.access_type) accessLines.push(`Access: ${escapeHtml(property.access_type)}`);
  if (property?.access_notes) accessLines.push(escapeHtml(property.access_notes));
  if (property?.house_number_location) accessLines.push(`House # location: ${escapeHtml(property.house_number_location)}`);
  if (property?.landmark_notes) accessLines.push(`Landmark: ${escapeHtml(property.landmark_notes)}`);

  const portalPath = audience === "subcontractor"
    ? (visit ? `/subcontractor/visit/${visit.id}` : `/subcontractor/home`)
    : audience === "worker"
      ? (visit ? `/worker/visit/${visit.id}` : `/worker/job/${job.id}`)
      : (visit ? `/visits/${visit.id}` : `/jobs/${job.id}`);
  const openUrl = `${APP_BASE_URL}${portalPath}`;

  const priorityBadge = job?.priority && job.priority !== "Normal" && job.priority !== "Medium"
    ? `<span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-left:8px;letter-spacing:0.5px;">${escapeHtml(job.priority)}</span>`
    : "";

  const subject = `${visit ? "New visit" : "New job"} assigned${category ? `: ${category}` : ""}${recordNumber ? ` (${recordNumber})` : ""}`;

  const row = (label: string, value: string) => value
    ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:130px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#0f172a;font-size:14px;vertical-align:top;">${value}</td></tr>`
    : "";

  const mapButtons = fullAddress
    ? `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;"><tr>
        <td style="padding-right:8px;"><a href="${googleMaps}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 14px;border-radius:6px;">📍 Google Maps</a></td>
        <td style="padding-right:8px;"><a href="${appleMaps}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 14px;border-radius:6px;">🍎 Apple Maps</a></td>
        <td><a href="${wazeMaps}" style="display:inline-block;background:#33ccff;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 14px;border-radius:6px;">🚗 Waze</a></td>
       </tr></table>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">

        <tr><td style="background:#0F172A;padding:20px 28px;">
          <table width="100%"><tr>
            <td style="color:#fff;font-size:18px;font-weight:700;letter-spacing:0.3px;">Praetoria Group</td>
            <td align="right" style="color:#94a3b8;font-size:12px;">${escapeHtml(recordNumber)}</td>
          </tr></table>
        </td></tr>

        <tr><td style="background:${color};height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="padding:28px 28px 8px 28px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${color};">${escapeHtml(category || "Assignment")}</div>
          <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${escapeHtml(visit ? "You've been assigned a visit" : "You've been assigned a job")}${priorityBadge}</h1>
          ${job?.job_title ? `<p style="margin:8px 0 0;font-size:15px;color:#475569;">${escapeHtml(job.job_title)}</p>` : ""}
        </td></tr>

        <tr><td style="padding:18px 28px 4px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0;">
            ${row("Customer", escapeHtml(customerName))}
            ${row("Phone", customerPhone ? `<a href="tel:${escapeHtml(customerPhone)}" style="color:#0f172a;text-decoration:none;font-weight:600;">📞 ${escapeHtml(customerPhone)}</a>` : "")}
            ${row("Date", escapeHtml(dateLabel))}
            ${row("Arrival", escapeHtml(timeLabel))}
            ${row("Property", escapeHtml(propertyName))}
            ${row("Address", escapeHtml(fullAddress))}
            ${row("Job #", escapeHtml(job?.job_number || ""))}
            ${row("Visit #", escapeHtml(visit?.visit_number || ""))}
          </table>
          ${mapButtons}
        </td></tr>

        ${hazards.length ? `<tr><td style="padding:16px 28px 4px;">
          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 14px;border-radius:6px;">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#991b1b;margin-bottom:6px;">Hazards & Cautions</div>
            ${hazards.map(h => `<div style="font-size:13px;color:#7f1d1d;line-height:1.5;">${escapeHtml(h)}</div>`).join("")}
          </div>
        </td></tr>` : ""}

        ${accessLines.length ? `<tr><td style="padding:14px 28px 4px;">
          <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 14px;border-radius:6px;">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#92400e;margin-bottom:6px;">🔑 Site Access</div>
            ${accessLines.map(l => `<div style="font-size:13px;color:#78350f;line-height:1.6;">${l}</div>`).join("")}
          </div>
        </td></tr>` : ""}

        ${scope ? `<tr><td style="padding:16px 28px 4px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#475569;margin-bottom:6px;">Scope of Work</div>
          <div style="font-size:14px;color:#0f172a;line-height:1.6;white-space:pre-wrap;">${escapeHtml(scope)}</div>
        </td></tr>` : ""}

        ${instructions ? `<tr><td style="padding:16px 28px 4px;">
          <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 14px;border-radius:6px;">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#1e40af;margin-bottom:6px;">📋 Service Instructions</div>
            <div style="font-size:13px;color:#1e3a8a;line-height:1.6;white-space:pre-wrap;">${escapeHtml(instructions)}</div>
          </div>
        </td></tr>` : ""}

        ${visitNotes ? `<tr><td style="padding:16px 28px 4px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#475569;margin-bottom:6px;">Visit Notes</div>
          <div style="font-size:14px;color:#0f172a;line-height:1.6;white-space:pre-wrap;">${escapeHtml(visitNotes)}</div>
        </td></tr>` : ""}

        <tr><td style="padding:24px 28px 28px;text-align:center;">
          <a href="${openUrl}" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">Open in app →</a>
          <div style="margin-top:10px;font-size:12px;color:#64748b;">Tap to view full details, photos, and check in on arrival.</div>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">
          <div style="font-size:12px;color:#64748b;line-height:1.6;">
            Praetoria Group &bull; <a href="${APP_BASE_URL}" style="color:#64748b;text-decoration:none;">praetoriagroup.ca</a><br/>
            Questions? <a href="mailto:support@praetoriagroup.ca" style="color:#64748b;">support@praetoriagroup.ca</a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject: subject || fallbackSubject, html };
}

// Resolve recipient email/phone from customer_id or recipient_id when not provided in variables
async function resolveRecipient(
  supabase: any,
  { customer_id, recipient_id, audience, variables }: {
    customer_id?: string;
    recipient_id?: string;
    audience: string;
    variables: Record<string, string>;
  }
): Promise<{ email?: string; phone?: string }> {
  // If already provided in variables, use them
  if (variables.to_email || variables.to_phone) {
    return { email: variables.to_email, phone: variables.to_phone };
  }

  // For customer audience, look up from customers table
  if (audience === "customer" && customer_id) {
    const { data: cust } = await supabase
      .from("customers")
      .select("email, phone")
      .eq("id", customer_id)
      .maybeSingle();
    if (cust) return { email: cust.email || undefined, phone: cust.phone || undefined };
  }

  // For worker/subcontractor audience, look up from profiles table via recipient_id
  if ((audience === "worker" || audience === "subcontractor") && recipient_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", recipient_id)
      .maybeSingle();

    // Try auth user email
    const { data: authData } = await supabase.auth.admin.getUserById(recipient_id);
    if (authData?.user) {
      return { email: authData.user.email || undefined, phone: authData.user.phone || undefined };
    }
  }

  // For admin audience, use ops inbox
  if (audience === "admin") {
    return { email: "ops@praetoriagroup.ca" };
  }

  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const {
      event,
      customer_id,
      recipient_id,
      record_type,
      record_id,
      variables = {},
      channels = ["in_app"],
      audience = "customer",
    } = body;

    if (!event) return json({ error: "Missing 'event' field" }, 400);

    const results: Record<string, unknown>[] = [];

    // Resolve recipient contact info for email/SMS channels
    const resolved = await resolveRecipient(supabase, {
      customer_id,
      recipient_id,
      audience,
      variables,
    });

    // Inject resolved contact info into variables for template rendering
    const enrichedVars = {
      ...variables,
      to_email: variables.to_email || resolved.email || "",
      to_phone: variables.to_phone || resolved.phone || "",
      company_name: variables.company_name || "Praetoria Group",
    };

    // Check customer notification preferences if customer audience
    let prefs: Record<string, boolean> | null = null;
    if (audience === "customer" && customer_id) {
      const { data: prefData } = await supabase
        .from("customer_notification_preferences")
        .select("email_enabled, sms_enabled, in_app_enabled")
        .eq("customer_id", customer_id)
        .eq("event", event)
        .maybeSingle();
      if (prefData) prefs = prefData;
    }

    for (const channel of channels as string[]) {
      // Check preference - default to enabled if no preference set
      if (prefs) {
        const key = `${channel}_enabled` as keyof typeof prefs;
        if (prefs[key] === false) {
          results.push({ channel, status: "skipped", reason: "disabled_by_preference" });
          continue;
        }
      }

      // Validate recipient before attempting email/SMS
      if (channel === "email" && !enrichedVars.to_email) {
        results.push({ channel, status: "skipped", reason: "no_recipient_email" });
        console.warn(`[send-notification] Skipping email for event=${event}: no recipient email found`);
        continue;
      }
      if (channel === "sms" && !enrichedVars.to_phone) {
        results.push({ channel, status: "skipped", reason: "no_recipient_phone" });
        console.warn(`[send-notification] Skipping SMS for event=${event}: no recipient phone found`);
        continue;
      }

      // Fetch template
      const { data: template } = await supabase
        .from("notification_templates")
        .select("subject_template, body_template, is_active")
        .eq("event", event)
        .eq("audience", audience)
        .eq("channel", channel)
        .maybeSingle();

      // If template is explicitly inactive, skip
      if (template && !template.is_active) {
        results.push({ channel, status: "skipped", reason: "template_inactive" });
        continue;
      }

      const subject = template?.is_active
        ? renderTemplate(template.subject_template, enrichedVars)
        : enrichedVars.subject || event.replace(/_/g, " ");
      const notifBody = template?.is_active
        ? renderTemplate(template.body_template, enrichedVars)
        : enrichedVars.body || "";

      // Create notification record
      const { data: notif, error: notifErr } = await supabase
        .from("notifications")
        .insert({
          event,
          channel,
          audience,
          recipient_id: recipient_id || null,
          customer_id: customer_id || null,
          record_type: record_type || null,
          record_id: record_id || null,
          subject,
          body: notifBody,
          metadata: enrichedVars,
          status: channel === "in_app" ? "sent" : "pending",
          sent_at: channel === "in_app" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (notifErr) {
        results.push({ channel, status: "error", error: notifErr.message });
        continue;
      }

      // ── Email delivery via Resend ──
      if (channel === "email") {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (RESEND_API_KEY && enrichedVars.to_email) {
          try {
            // For worker_assigned events, build a rich, branded email server-side
            // using authoritative job/visit data instead of caller-supplied placeholders.
            let finalSubject = subject;
            let finalHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}.container{max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);}.header{background:#1a1a2e;padding:24px 32px;}.header h1{margin:0;color:#fff;font-size:18px;font-weight:600;}.body{padding:32px;color:#27272a;line-height:1.6;font-size:15px;}h2{font-size:16px;margin:0 0 16px;}p{margin:0 0 12px;}.footer{padding:16px 32px;background:#fafafa;color:#71717a;font-size:12px;text-align:center;border-top:1px solid #e4e4e7;}</style></head><body><div class="container"><div class="header"><h1>Praetoria Group</h1></div><div class="body"><h2>${subject}</h2><div>${notifBody}</div></div><div class="footer">Praetoria Group &bull; praetoriagroup.ca</div></div></body></html>`;

            if (event === "worker_assigned" && (audience === "worker" || audience === "subcontractor")) {
              const rich = await buildAssignmentEmail(supabase, record_type, record_id, audience, subject);
              if (rich) {
                finalSubject = rich.subject;
                finalHtml = rich.html;
              }
            }

            const emailRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Praetoria Group <noreply@praetoriagroup.ca>",
                to: [enrichedVars.to_email],
                subject: finalSubject,
                html: finalHtml,
                reply_to: enrichedVars.reply_to || "ops@praetoriagroup.ca",
              }),
            });
            const emailData = await emailRes.json();
            if (emailRes.ok) {
              await supabase.from("notifications").update({ status: "sent", sent_at: new Date().toISOString(), subject: finalSubject }).eq("id", notif.id);
              results.push({ channel, status: "sent", notification_id: notif.id, resend_id: emailData.id });
            } else {
              await supabase.from("notifications").update({ status: "failed" }).eq("id", notif.id);
              results.push({ channel, status: "failed", notification_id: notif.id, error: emailData.message });
              console.error(`[send-notification] Email failed for event=${event}: ${emailData.message}`);
            }
          } catch (emailErr: any) {
            await supabase.from("notifications").update({ status: "failed" }).eq("id", notif.id);
            results.push({ channel, status: "failed", notification_id: notif.id, error: emailErr.message });
            console.error(`[send-notification] Email exception for event=${event}: ${emailErr.message}`);
          }
        } else {
          results.push({
            channel,
            status: "skipped",
            notification_id: notif.id,
            reason: !RESEND_API_KEY ? "RESEND_API_KEY_missing" : "no_recipient_email",
          });
        }
      }

      // ── SMS delivery via Twilio ──
      else if (channel === "sms") {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
        const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER");
        if (LOVABLE_API_KEY && TWILIO_API_KEY && TWILIO_PHONE && enrichedVars.to_phone) {
          try {
            const smsBody = `${subject}: ${notifBody}`.substring(0, 1600);
            const smsRes = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": TWILIO_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: enrichedVars.to_phone,
                From: TWILIO_PHONE,
                Body: smsBody,
              }),
            });
            const smsData = await smsRes.json();
            if (smsRes.ok) {
              await supabase.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", notif.id);
              results.push({ channel, status: "sent", notification_id: notif.id, twilio_sid: smsData.sid });
            } else {
              await supabase.from("notifications").update({ status: "failed" }).eq("id", notif.id);
              results.push({ channel, status: "failed", notification_id: notif.id, error: smsData.message || JSON.stringify(smsData) });
              console.error(`[send-notification] SMS failed for event=${event}: ${smsData.message || JSON.stringify(smsData)}`);
            }
          } catch (smsErr: any) {
            await supabase.from("notifications").update({ status: "failed" }).eq("id", notif.id);
            results.push({ channel, status: "failed", notification_id: notif.id, error: smsErr.message });
            console.error(`[send-notification] SMS exception for event=${event}: ${smsErr.message}`);
          }
        } else {
          results.push({
            channel,
            status: "skipped",
            notification_id: notif.id,
            reason: !enrichedVars.to_phone ? "no_recipient_phone" : "twilio_keys_missing",
          });
        }
      }

      // ── In-app (already marked sent on insert) ──
      else {
        results.push({ channel, status: "sent", notification_id: notif.id });
      }
    }

    // Log activity
    await supabase.from("activities").insert({
      action_name: `Notification: ${event.replace(/_/g, " ")}`,
      workflow_name: "notifications",
      record_type: record_type || null,
      record_id: record_id || null,
      status: "completed",
      payload_summary: { event, audience, channels, customer_id, results_summary: results.map(r => `${r.channel}:${r.status}`) },
    });

    return json({ success: true, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[send-notification] Unhandled error: ${msg}`);
    return json({ error: msg }, 500);
  }
});
