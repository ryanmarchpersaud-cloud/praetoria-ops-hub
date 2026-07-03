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

function renderTemplate(template: string, vars: Record<string, string>, opts: { escape?: boolean } = {}): string {
  // Replace merge variables; missing ones render as empty string (never raw {{placeholder}}).
  // When `escape` is true, HTML-escape variable values before substitution so caller-supplied
  // strings cannot inject markup or scripts into HTML emails.
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = vars[key] || "";
    return opts.escape ? escapeHtml(v) : v;
  });
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

// Build a rich, branded "new service request" notification email for ops/admin.
// Pulls authoritative data from service_requests + customers + properties so the
// email always includes contact info, location, and a direct admin link — even
// when the trigger call site only passes minimal variables.
async function buildServiceRequestEmail(
  supabase: any,
  record_id: string | undefined,
  customer_id: string | undefined,
  vars: Record<string, string>,
  fallbackSubject: string,
): Promise<{ subject: string; html: string; reply_to?: string } | null> {
  let request: any = null;
  let customer: any = null;
  let property: any = null;

  if (record_id) {
    const { data: r } = await supabase
      .from("service_requests")
      .select("id, subject, description, service_type, urgency, requested_timing, preferred_contact_method, area_of_property, access_notes, attachments, status, created_at, customer_id, property_id, user_id")
      .eq("id", record_id).maybeSingle();
    request = r;
  }

  const custId = customer_id || request?.customer_id;
  if (custId) {
    const { data: c } = await supabase
      .from("customers")
      .select("id, first_name, last_name, company_name, email, phone")
      .eq("id", custId).maybeSingle();
    customer = c;
  }

  const propId = request?.property_id;
  if (propId) {
    const { data: p } = await supabase
      .from("properties")
      .select("property_name, address_line_1, address_line_2, city, province, postal_code")
      .eq("id", propId).maybeSingle();
    property = p;
  }

  const FALLBACK = "Not provided";
  const NO_PHONE = "No phone provided";
  const NO_ADDRESS = "No address provided";
  const NO_MESSAGE = "No message provided";
  const NO_EMAIL = "No email provided";

  const customerName = customer
    ? (`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.company_name || vars.customer_name || "A customer")
    : (vars.customer_name || "A customer");
  const customerEmail = customer?.email || "";
  const customerPhone = customer?.phone || "";
  const companyName = customer?.company_name || "";

  const serviceType = request?.service_type || vars.service_type || "Service request";
  const subjectLine = request?.subject || vars.subject?.replace(/^New Request:\s*/i, "") || serviceType;
  const description = request?.description || vars.body || "";
  const urgency = request?.urgency || "";
  const requestedTiming = request?.requested_timing || "";
  const requestNumber = request?.id ? `REQ-${request.id.slice(0, 8).toUpperCase()}` : "";
  const createdAt = request?.created_at ? new Date(request.created_at) : new Date();
  const createdAtLabel = createdAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
  const status = request?.status || "New";

  // Source: caller may pass `source` in variables (portal / website / admin / worker / subcontractor).
  const source = vars.source || vars.audience_source || (request ? "Customer portal" : "Admin / staff");

  const addressParts = property
    ? [property.address_line_1, property.address_line_2, property.city, property.province, property.postal_code].filter(Boolean).join(", ")
    : "";
  const propertyLabel = property?.property_name || "";
  const fullAddress = addressParts || propertyLabel || "";

  const attachmentCount = Array.isArray(request?.attachments) ? request.attachments.length : 0;

  const adminPath = request?.id ? `/requests/${request.id}` : `/requests`;
  const openUrl = `${APP_BASE_URL}${adminPath}`;

  const replyTo = customerEmail || "ops@praetoriagroup.ca";

  // City fragment for subject
  const citySegment = property?.city || (addressParts ? addressParts.split(",").slice(-3, -2)[0]?.trim() : "");
  const subject = `New Request: ${serviceType}${customerName ? ` — ${customerName}` : ""}${citySegment ? ` — ${citySegment}` : ""}`;

  const color = categoryColor(serviceType);

  const row = (label: string, value: string, isFallback = false) =>
    `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:160px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;color:${isFallback ? "#94a3b8" : "#0f172a"};font-size:14px;vertical-align:top;font-style:${isFallback ? "italic" : "normal"};">${value}</td></tr>`;

  const emailCell = customerEmail
    ? `<a href="mailto:${escapeHtml(customerEmail)}" style="color:#0f172a;text-decoration:none;font-weight:600;">${escapeHtml(customerEmail)}</a>`
    : `<span>${NO_EMAIL}</span>`;
  const phoneCell = customerPhone
    ? `<a href="tel:${escapeHtml(customerPhone)}" style="color:#0f172a;text-decoration:none;font-weight:600;">📞 ${escapeHtml(customerPhone)}</a>`
    : `<span>${NO_PHONE}</span>`;
  const addressCell = fullAddress
    ? escapeHtml(fullAddress)
    : `<span>${NO_ADDRESS}</span>`;
  const descriptionBlock = description
    ? `<div style="font-size:14px;color:#0f172a;line-height:1.6;white-space:pre-wrap;">${escapeHtml(description)}</div>`
    : `<div style="font-size:14px;color:#94a3b8;font-style:italic;">${NO_MESSAGE}</div>`;

  const urgencyBadge = urgency
    ? `<span style="display:inline-block;background:${/urgent|high/i.test(urgency) ? "#fee2e2" : "#e0f2fe"};color:${/urgent|high/i.test(urgency) ? "#b91c1c" : "#075985"};font-size:11px;font-weight:700;text-transform:uppercase;padding:3px 8px;border-radius:4px;margin-left:8px;letter-spacing:0.5px;">${escapeHtml(urgency)}</span>`
    : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.08);">

        <tr><td style="background:#0F172A;padding:20px 28px;">
          <table width="100%"><tr>
            <td style="color:#fff;font-size:18px;font-weight:700;letter-spacing:0.3px;">Praetoria Group</td>
            <td align="right" style="color:#94a3b8;font-size:12px;">Request ${escapeHtml(requestNumber || "—")}</td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:28px 28px 8px 28px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${color};">${escapeHtml(serviceType)}</div>
          <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">New service request${urgencyBadge}</h1>
          <p style="margin:8px 0 0;font-size:15px;color:#475569;">${escapeHtml(subjectLine)}</p>
        </td></tr>

        <tr><td style="padding:18px 28px 4px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0;">
            ${row("Request #", escapeHtml(requestNumber || FALLBACK), !requestNumber)}
            ${row("Submitted", escapeHtml(createdAtLabel))}
            ${row("Customer", escapeHtml(customerName))}
            ${companyName ? row("Company", escapeHtml(companyName)) : ""}
            ${row("Email", emailCell, !customerEmail)}
            ${row("Phone", phoneCell, !customerPhone)}
            ${row("Service type", escapeHtml(serviceType))}
            ${row("Property", escapeHtml(propertyLabel || FALLBACK), !propertyLabel)}
            ${row("Address", addressCell, !fullAddress)}
            ${row("Priority", escapeHtml(urgency || FALLBACK), !urgency)}
            ${row("Preferred timing", escapeHtml(requestedTiming || FALLBACK), !requestedTiming)}
            ${row("Source", escapeHtml(source))}
            ${row("Status", escapeHtml(status))}
            ${row("Attachments", attachmentCount > 0 ? `${attachmentCount} file${attachmentCount === 1 ? "" : "s"} attached` : "None")}
          </table>
        </td></tr>

        <tr><td style="padding:18px 28px 4px;">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#475569;margin-bottom:6px;">Customer message</div>
          ${descriptionBlock}
        </td></tr>

        <tr><td style="padding:24px 28px 8px;text-align:center;">
          <a href="${openUrl}" style="display:inline-block;background:#0F172A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">Open Request in Praetoria Ops Hub →</a>
        </td></tr>

        <tr><td style="padding:4px 28px 24px;text-align:center;">
          <div style="font-size:13px;color:#475569;line-height:1.6;">
            Next step: open the request in the Admin Portal, reply to the customer, or assign a visit.
          </div>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">
          <div style="font-size:12px;color:#64748b;line-height:1.6;">
            Praetoria Group &bull; <a href="${APP_BASE_URL}" style="color:#64748b;text-decoration:none;">praetoriagroup.ca</a><br/>
            Reply to this email to respond directly to ${customerEmail ? "the customer" : "ops@praetoriagroup.ca"}.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, reply_to: replyTo };
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

  const { requireAuthOrServiceRole } = await import("../_shared/auth.ts");
  const auth = await requireAuthOrServiceRole(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Events that any authenticated user (including Customer Portal users)
  // is allowed to dispatch, because they notify ops/admin about an action
  // the user themselves just performed. Without this exception, customer-
  // initiated requests get 403'd at the ops-role gate and the "New Request"
  // email never sends.
  const SELF_SERVICE_EVENTS = new Set([
    "new_service_request",
    "new_maintenance_request",
    "new_tenant_insurance_submission",
    "new_tenant_referral",
  ]);

  // Parse body early so we can role-gate based on event.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const {
    event,
    customer_id,
    recipient_id,
    record_type,
    record_id,
    variables = {},
    channels = ["in_app"],
    audience = "customer",
  } = body || {};

  if (!event) return json({ error: "Missing 'event' field" }, 400);

  // Role gate: only ops staff (or internal service-role) may dispatch
  // notifications, except for whitelisted self-service events. Without
  // this, any authenticated user could relay arbitrary branded emails/SMS
  // through the company sender.
  const OPS_ROLES = new Set([
    "owner", "admin", "ops_manager", "manager", "accountant", "hr_admin", "dispatcher", "supervisor",
  ]);
  if (!auth.isServiceRole && !SELF_SERVICE_EVENTS.has(event)) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    if (!roles.some((r) => OPS_ROLES.has(r))) {
      return json({ error: "Forbidden" }, 403);
    }
  }

  // ── Self-service hardening ────────────────────────────────────────────
  // For SELF_SERVICE_EVENTS, any authenticated user can call this function.
  // We must NOT trust caller-supplied to_email / customer_id / record_id,
  // otherwise a customer could relay branded emails to arbitrary addresses
  // or exfiltrate another customer's request details.
  //
  // Strategy:
  //   • Force audience = "admin" (self-service events notify ops/staff).
  //   • Resolve the caller's own customer_id from customers.user_id = auth.userId.
  //   • Override body.customer_id with the resolved value.
  //   • If a record_id is supplied, verify it belongs to the resolved customer.
  //   • Strip variables.to_email / variables.to_phone so the recipient is
  //     derived server-side (ops inbox) via resolveRecipient().
  let effectiveAudience = audience;
  let effectiveCustomerId = customer_id;
  let effectiveRecordId = record_id;
  let effectiveVariables: Record<string, any> = { ...(variables || {}) };

  if (!auth.isServiceRole && SELF_SERVICE_EVENTS.has(event)) {
    effectiveAudience = "admin";
    delete effectiveVariables.to_email;
    delete effectiveVariables.to_phone;

    let ownedCustomerId: string | null = null;
    const { data: ownCust } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (ownCust?.id) ownedCustomerId = ownCust.id;

    // Fallback for tenants (PM portal): resolve to their linked customer.
    if (!ownedCustomerId) {
      const { data: tenant } = await supabase
        .from("pm_tenants")
        .select("customer_id")
        .eq("user_id", auth.userId)
        .maybeSingle();
      if (tenant?.customer_id) ownedCustomerId = tenant.customer_id;
    }

    if (!ownedCustomerId) {
      return json({ error: "No customer/tenant record linked to this account" }, 403);
    }

    effectiveCustomerId = ownedCustomerId;

    // If a record_id is supplied, verify caller owns it. We check the most
    // common self-service source tables. Any mismatch → 403.
    if (effectiveRecordId) {
      const tablesToCheck = [
        "service_requests",
        "pm_maintenance_requests",
        "pm_tenant_insurance",
        "pm_tenant_referrals",
      ];
      let ownershipOk = false;
      for (const t of tablesToCheck) {
        const { data: row } = await supabase
          .from(t)
          .select("id, customer_id")
          .eq("id", effectiveRecordId)
          .maybeSingle();
        if (row) {
          if (row.customer_id && row.customer_id === ownedCustomerId) {
            ownershipOk = true;
          }
          break;
        }
      }
      if (!ownershipOk) {
        return json({ error: "You do not own the referenced record" }, 403);
      }
    }
  }

  try {

    const results: Record<string, unknown>[] = [];

    // Resolve recipient contact info for email/SMS channels
    const resolved = await resolveRecipient(supabase, {
      customer_id: effectiveCustomerId,
      recipient_id,
      audience: effectiveAudience,
      variables: effectiveVariables,
    });

    // Inject resolved contact info into variables for template rendering
    const enrichedVars = {
      ...effectiveVariables,
      to_email: effectiveVariables.to_email || resolved.email || "",
      to_phone: effectiveVariables.to_phone || resolved.phone || "",
      company_name: effectiveVariables.company_name || "Praetoria Group",
    };

    // Check customer notification preferences if customer audience
    let prefs: Record<string, boolean> | null = null;
    if (effectiveAudience === "customer" && effectiveCustomerId) {
      const { data: prefData } = await supabase
        .from("customer_notification_preferences")
        .select("email_enabled, sms_enabled, in_app_enabled")
        .eq("customer_id", effectiveCustomerId)
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

      // Look up admin-managed template (per event/audience/channel)
      const { data: template } = await supabase
        .from("notification_templates")
        .select("subject_template, body_template, is_active")
        .eq("event", event)
        .eq("audience", effectiveAudience)
        .eq("channel", channel)
        .maybeSingle();

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
      const subjectHtml = template?.is_active
        ? renderTemplate(template.subject_template, enrichedVars, { escape: true })
        : escapeHtml(subject);
      const notifBodyHtml = template?.is_active
        ? renderTemplate(template.body_template, enrichedVars, { escape: true })
        : escapeHtml(notifBody).replace(/\n/g, "<br/>");

      // Create notification record (stored body is plain text)
      const { data: notif, error: notifErr } = await supabase
        .from("notifications")
        .insert({
          event,
          channel,
          audience: effectiveAudience,
          recipient_id: recipient_id || null,
          customer_id: effectiveCustomerId || null,
          record_type: record_type || null,
          record_id: effectiveRecordId || null,
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
            let finalSubject = subject;
            let finalReplyTo = enrichedVars.reply_to || "ops@praetoriagroup.ca";
            let finalHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}.container{max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);}.header{background:#1a1a2e;padding:24px 32px;}.header h1{margin:0;color:#fff;font-size:18px;font-weight:600;}.body{padding:32px;color:#27272a;line-height:1.6;font-size:15px;}h2{font-size:16px;margin:0 0 16px;}p{margin:0 0 12px;}.footer{padding:16px 32px;background:#fafafa;color:#71717a;font-size:12px;text-align:center;border-top:1px solid #e4e4e7;}</style></head><body><div class="container"><div class="header"><h1>Praetoria Group</h1></div><div class="body"><h2>${subjectHtml}</h2><div>${notifBodyHtml}</div></div><div class="footer">Praetoria Group &bull; praetoriagroup.ca</div></div></body></html>`;

            if (event === "worker_assigned" && (effectiveAudience === "worker" || effectiveAudience === "subcontractor")) {
              const rich = await buildAssignmentEmail(supabase, record_type, effectiveRecordId, effectiveAudience, subject);
              if (rich) {
                finalSubject = rich.subject;
                finalHtml = rich.html;
              }
            } else if (event === "new_service_request") {
              const rich = await buildServiceRequestEmail(supabase, effectiveRecordId, effectiveCustomerId, enrichedVars, subject);
              if (rich) {
                finalSubject = rich.subject;
                finalHtml = rich.html;
                if (rich.reply_to) finalReplyTo = rich.reply_to;
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
                reply_to: finalReplyTo,
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
