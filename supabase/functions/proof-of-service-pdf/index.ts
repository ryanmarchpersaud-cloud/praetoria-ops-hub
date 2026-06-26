import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "proof-of-service-reports";
const COMPANY_TZ = "America/Regina";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function buildPdf(pages: string[]): Uint8Array {
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
  return encoder.encode(pdf);
}

function fmtDate(value: unknown): string {
  if (!value) return "-";
  const s = String(value);
  const iso = s.length === 10 ? `${s}T12:00:00Z` : s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-CA", { timeZone: COMPANY_TZ, weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(iso: unknown): string {
  if (!iso) return "-";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-CA", { timeZone: COMPANY_TZ, hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtDateTime(iso: unknown): string {
  if (!iso) return "-";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-CA", { timeZone: COMPANY_TZ, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function durationMinutes(startIso: unknown, endIso: unknown): number {
  if (!startIso || !endIso) return 0;
  const s = new Date(String(startIso)).getTime();
  const e = new Date(String(endIso)).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 60000);
}

function fmtDuration(mins: number): string {
  if (!mins) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
}

function safeFilename(value: unknown) {
  return String(value || "proof-of-service").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

interface BuildArgs {
  customer: Record<string, any>;
  job?: Record<string, any> | null;
  property?: Record<string, any> | null;
  visits: Record<string, any>[];
  visitWorkers: Map<string, string[]>;
  visitPhotos: Map<string, { url: string; caption: string | null }[]>;
  includeCrewNotes: boolean;
  includePhotos: boolean;
  customerMessage: string;
  generatedBy: string;
  reportTitle: string;
  dateRange?: { start?: string; end?: string };
}

function generateReportPdf(args: BuildArgs): Uint8Array {
  const { customer, job, property, visits, visitWorkers, includeCrewNotes, customerMessage, generatedBy, reportTitle, dateRange } = args;

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
  const ensure = (height = 24) => {
    if (y - height < 64) newPage();
  };
  const text = (value: unknown, x = left, size = 10, font: "F1" | "F2" = "F1") => {
    ensure(size + 6);
    ops += `BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET\n`;
    y -= size + 5;
  };
  const line = () => {
    ensure(10);
    ops += `0.82 0.84 0.87 RG ${left} ${y} m ${right} ${y} l S\n`;
    y -= 12;
  };
  const wrapped = (value: unknown, x = left, size = 9, maxChars = 96) => {
    const lines = normalizePdfText(value).split(/\n/);
    for (const ln of lines) {
      const words = ln.split(/\s+/).filter(Boolean);
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
    }
  };

  // Header band
  ops += "0.06 0.09 0.16 rg 48 760 516 5 re f\n";
  text("PRAETORIA GROUP", left, 18, "F2");
  text(reportTitle, left, 11, "F2");
  text("support@praetoriagroup.ca | praetoriagroup.ca", left, 9);
  y = 706;
  text(`Generated: ${fmtDateTime(new Date().toISOString())}`, 398, 9);
  text(`Prepared by: ${generatedBy || "Praetoria Admin"}`, 398, 9);
  if (dateRange?.start || dateRange?.end) {
    text(`Period: ${dateRange?.start ? fmtDate(dateRange.start) : "..."} - ${dateRange?.end ? fmtDate(dateRange.end) : "..."}`, 398, 9);
  }
  y = 666;
  line();

  // Customer / property / job
  text("Customer", left, 9, "F2");
  const custName = customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";
  text(custName, left, 12, "F2");
  if (customer.operating_name && customer.operating_name !== customer.company_name) text(customer.operating_name, left, 10);
  if (customer.site_contact_name) text(`Site contact: ${customer.site_contact_name}`, left, 9);

  const savedY = y;
  y = savedY;
  if (property) {
    text("Property", 320, 9, "F2");
    text(property.property_name || "Service Address", 320, 11, "F2");
    if (property.address_line_1) text(property.address_line_1, 320, 9);
    const cityLine = [property.city, property.province, property.postal_code].filter(Boolean).join(", ");
    if (cityLine) text(cityLine, 320, 9);
  }

  y = Math.min(y, savedY - 60);
  line();

  if (job) {
    text("Job", left, 9, "F2");
    text(`${job.job_title || "Job"} (${job.job_number || ""})`.trim(), left, 11, "F2");
    if (job.service_category) text(`Service: ${job.service_category}`, left, 9);
    if (job.scope_of_work) wrapped(`Scope: ${job.scope_of_work}`, left, 9, 96);
    line();
  }

  if (customerMessage) {
    text("Message from Praetoria", left, 9, "F2");
    wrapped(customerMessage, left, 10, 92);
    y -= 4;
    line();
  }

  // Visits table
  text(`Service Visits (${visits.length})`, left, 11, "F2");
  y -= 2;
  ops += `0.95 0.96 0.98 rg ${left} ${y - 2} ${right - left} 16 re f\n`;
  ops += `BT /F2 9 Tf ${left + 4} ${y + 4} Td (${pdfText("Date")}) Tj ET\n`;
  ops += `BT /F2 9 Tf 168 ${y + 4} Td (${pdfText("Visit #")}) Tj ET\n`;
  ops += `BT /F2 9 Tf 232 ${y + 4} Td (${pdfText("Arrived")}) Tj ET\n`;
  ops += `BT /F2 9 Tf 304 ${y + 4} Td (${pdfText("Completed")}) Tj ET\n`;
  ops += `BT /F2 9 Tf 380 ${y + 4} Td (${pdfText("Total")}) Tj ET\n`;
  ops += `BT /F2 9 Tf 432 ${y + 4} Td (${pdfText("Status")}) Tj ET\n`;
  ops += `BT /F2 9 Tf 496 ${y + 4} Td (${pdfText("Crew")}) Tj ET\n`;
  y -= 18;

  let totalMinutes = 0;
  for (const v of visits) {
    const mins = durationMinutes(v.arrival_time, v.completion_time);
    totalMinutes += mins;
    const workers = visitWorkers.get(String(v.id)) || [];
    ensure(22);
    ops += `BT /F1 9 Tf ${left} ${y} Td (${pdfText(fmtDate(v.service_date))}) Tj ET\n`;
    ops += `BT /F1 9 Tf 168 ${y} Td (${pdfText(v.visit_number || "-")}) Tj ET\n`;
    ops += `BT /F1 9 Tf 232 ${y} Td (${pdfText(fmtTime(v.arrival_time))}) Tj ET\n`;
    ops += `BT /F1 9 Tf 304 ${y} Td (${pdfText(fmtTime(v.completion_time))}) Tj ET\n`;
    ops += `BT /F2 9 Tf 380 ${y} Td (${pdfText(fmtDuration(mins))}) Tj ET\n`;
    ops += `BT /F1 9 Tf 432 ${y} Td (${pdfText(v.visit_status || "-")}) Tj ET\n`;
    const crewLabel = workers.slice(0, 2).join(", ") + (workers.length > 2 ? ` +${workers.length - 2}` : "");
    ops += `BT /F1 9 Tf 496 ${y} Td (${pdfText(crewLabel || "-")}) Tj ET\n`;
    y -= 14;

    if (v.service_summary || v.customer_visible_notes) {
      const summary = [v.service_summary, v.customer_visible_notes].filter(Boolean).join(" - ");
      wrapped(`Service summary: ${summary}`, left + 8, 8, 102);
    }
    if (includeCrewNotes && v.crew_notes) {
      wrapped(`Internal notes: ${v.crew_notes}`, left + 8, 8, 102);
    }
    if (workers.length > 2) {
      wrapped(`Crew: ${workers.join(", ")}`, left + 8, 8, 102);
    }
    y -= 4;
  }

  y -= 6;
  line();

  // Totals
  text("Totals", left, 10, "F2");
  text(`Visits included: ${visits.length}`, left, 10);
  text(`Total time on site: ${fmtDuration(totalMinutes)}`, left, 11, "F2");

  // Footer
  if (y > 96) {
    const footerY = Math.max(y - 30, 72);
    ops += `0.94 0.96 0.98 rg 48 ${footerY - 12} 516 42 re f\n`;
    ops += `BT /F1 9 Tf 62 ${footerY + 12} Td (${pdfText("Times shown are in Saskatchewan / Regina local time (CST, UTC-6).")}) Tj ET\n`;
    ops += `BT /F1 8 Tf 62 ${footerY - 6} Td (${pdfText("Praetoria Group | support@praetoriagroup.ca | praetoriagroup.ca")}) Tj ET\n`;
  }

  pages.push(ops);
  return buildPdf(pages);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Please sign in." }, 401);

    // Verify ops staff
    const { data: isOps, error: opsErr } = await userClient.rpc("is_ops_staff", { _user_id: authData.user.id });
    if (opsErr || !isOps) {
      // Some helpers don't take an argument; try without to fall back
      const { data: isOps2 } = await userClient.rpc("is_ops_staff");
      if (!isOps2) return json({ error: "Only operations staff can generate proof of service reports." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "signed_url"); // signed_url | email | save_to_customer_docs
    const visitIds: string[] = Array.isArray(body.visit_ids) ? body.visit_ids.filter((v: any) => typeof v === "string") : [];
    const customerId = body.customer_id ? String(body.customer_id) : null;
    const jobId = body.job_id ? String(body.job_id) : null;
    const includeCrewNotes = !!body.include_crew_notes;
    const includePhotos = !!body.include_photos;
    const customerMessage = String(body.customer_message || "").slice(0, 1000);
    const dateRange = body.date_range && typeof body.date_range === "object" ? body.date_range : {};

    if (!visitIds.length) return json({ error: "Select at least one visit to include in the report." }, 400);

    // Fetch visits via service client (we already verified ops). Limit to requested IDs only.
    const { data: visits, error: vErr } = await serviceClient
      .from("visits")
      .select("*")
      .in("id", visitIds)
      .order("service_date", { ascending: true })
      .order("arrival_time", { ascending: true });
    if (vErr || !visits || !visits.length) return json({ error: "Could not load the selected visits." }, 400);

    // Resolve customer / job / property
    const resolvedCustomerId = customerId || visits[0].customer_id;
    const resolvedJobId = jobId || visits[0].job_id;
    const resolvedPropertyId = visits[0].property_id;

    const [{ data: customer }, { data: job }, { data: property }] = await Promise.all([
      serviceClient.from("customers").select("*").eq("id", resolvedCustomerId).maybeSingle(),
      resolvedJobId
        ? serviceClient.from("jobs").select("id, job_number, job_title, service_category, scope_of_work, customer_id").eq("id", resolvedJobId).maybeSingle()
        : Promise.resolve({ data: null }),
      resolvedPropertyId
        ? serviceClient.from("properties").select("id, property_name, address_line_1, city, province, postal_code").eq("id", resolvedPropertyId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (!customer) return json({ error: "Customer record could not be loaded for this report." }, 400);

    // Sanity check: visits must all belong to the resolved customer
    const mismatched = visits.find((v: any) => v.customer_id !== resolvedCustomerId);
    if (mismatched) return json({ error: "Selected visits span multiple customers. Please select visits for one customer at a time." }, 400);

    // Fetch crew members and assigned worker names
    const { data: crew = [] } = await serviceClient
      .from("visit_crew_members")
      .select("visit_id, worker_user_id")
      .in("visit_id", visitIds);

    const assignedIds = visits.map((v: any) => v.assigned_worker_id).filter(Boolean);
    const crewIds = (crew || []).map((c: any) => c.worker_user_id).filter(Boolean);
    const allWorkerIds = Array.from(new Set([...assignedIds, ...crewIds]));

    const workerNameById = new Map<string, string>();
    if (allWorkerIds.length) {
      const [{ data: emps }, { data: subs }] = await Promise.all([
        serviceClient.from("worker_profiles").select("user_id, full_name").in("user_id", allWorkerIds),
        serviceClient.from("subcontractors").select("user_id, contact_name, company_name").in("user_id", allWorkerIds),
      ]);
      for (const e of emps || []) workerNameById.set(String(e.user_id), e.full_name || "Crew");
      for (const s of subs || []) {
        if (!workerNameById.has(String(s.user_id))) {
          workerNameById.set(String(s.user_id), s.contact_name || s.company_name || "Subcontractor");
        }
      }
    }

    const visitWorkers = new Map<string, string[]>();
    for (const v of visits) {
      const names = new Set<string>();
      if (v.assigned_worker_id && workerNameById.get(String(v.assigned_worker_id))) {
        names.add(workerNameById.get(String(v.assigned_worker_id))!);
      }
      for (const c of crew || []) {
        if (c.visit_id === v.id) {
          const name = workerNameById.get(String(c.worker_user_id));
          if (name) names.add(name);
        }
      }
      visitWorkers.set(String(v.id), Array.from(names));
    }

    // Generator name
    const { data: profile } = await serviceClient
      .from("worker_profiles")
      .select("full_name")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    const generatedBy = profile?.full_name || authData.user.email || "Praetoria Admin";

    const titleSuffix = job?.job_number ? ` (${job.job_number})` : "";
    const reportTitle = `Proof of Service Report${titleSuffix}`;

    const pdfBytes = generateReportPdf({
      customer: customer as any,
      job: job as any,
      property: property as any,
      visits: visits as any[],
      visitWorkers,
      visitPhotos: new Map(),
      includeCrewNotes,
      includePhotos,
      customerMessage,
      generatedBy,
      reportTitle,
      dateRange,
    });

    const stamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
    const fileName = `${safeFilename(`POS-${job?.job_number || customer.company_name || "report"}-${stamp}`)}.pdf`;
    const storagePath = `customers/${resolvedCustomerId}/${stamp}-${fileName}`;

    const { error: uploadError } = await serviceClient.storage
      .from(BUCKET)
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) return json({ error: `Could not store the report PDF: ${uploadError.message}` }, 500);

    if (action === "email") {
      const to = String(body.email || customer.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "Enter a valid customer email address." }, 400);
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) return json({ error: "Email delivery is not configured yet." }, 503);
      const greeting = customer.site_contact_name || customer.billing_contact_name || customer.first_name || "there";
      const messageHtml = customerMessage
        ? `<p>${escapeHtml(customerMessage).replace(/\n/g, "<br>")}</p>`
        : `<p>Attached is the proof of service report${job?.job_number ? ` for <strong>${escapeHtml(job.job_title)} (${escapeHtml(job.job_number)})</strong>` : ""}.</p>`;
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Praetoria Group <noreply@praetoriagroup.ca>",
          to: [to],
          reply_to: "support@praetoriagroup.ca",
          subject: `${reportTitle} - Praetoria Group`,
          html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;padding:8px 0">
            <h2 style="color:#0F172A;margin:0 0 12px">Proof of Service Report</h2>
            <p>Hi ${escapeHtml(greeting)},</p>
            ${messageHtml}
            <p>The PDF report is attached and shows the recorded service date(s), arrival and completion times, total time on site, and assigned crew.</p>
            <p>If you have any questions, please reply to this email or contact <a href="mailto:support@praetoriagroup.ca">support@praetoriagroup.ca</a>.</p>
            <p style="margin-top:24px">Thank you,<br><strong>Praetoria Group</strong></p>
          </body></html>`,
          attachments: [{ filename: fileName, content: bytesToBase64(pdfBytes), contentType: "application/pdf" }],
        }),
      });
      const emailResponse = await result.json().catch(() => ({}));
      if (!result.ok) return json({ error: emailResponse.message || "Email could not be sent." }, 502);
      await serviceClient.from("integration_logs").insert({
        provider: "resend",
        event_name: "email.proof_of_service",
        channel: "email",
        status: "success",
        recipient: to,
        record_type: resolvedJobId ? "job" : "customer",
        record_id: String(resolvedJobId || resolvedCustomerId),
        provider_response_id: emailResponse.id,
      });
      return json({ ok: true, action: "email", fileName, recipient: to });
    }

    if (action === "save_to_customer_docs") {
      const { error: docErr } = await serviceClient.from("customer_documents").insert({
        customer_id: resolvedCustomerId,
        uploaded_by: authData.user.id,
        title: reportTitle,
        category: "Proof of Service",
        notes: customerMessage || (job?.job_number ? `Report for ${job.job_number}` : null),
        file_path: storagePath,
        file_name: fileName,
        file_size: pdfBytes.length,
        mime_type: "application/pdf",
      });
      if (docErr) return json({ error: `Could not attach to customer documents: ${docErr.message}` }, 500);
    }

    const { data: viewData, error: signError } = await serviceClient.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60);
    const { data: downloadData } = await serviceClient.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60, { download: fileName });
    if (signError || !viewData?.signedUrl) return json({ error: "Could not create a secure PDF link." }, 500);

    return json({
      ok: true,
      action,
      signedUrl: viewData.signedUrl,
      downloadUrl: downloadData?.signedUrl || viewData.signedUrl,
      fileName,
      expiresInSeconds: 3600,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected PDF error." }, 500);
  }
});
