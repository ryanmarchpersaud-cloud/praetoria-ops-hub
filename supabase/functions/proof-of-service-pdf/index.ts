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

function cleanScope(value: unknown): string {
  return normalizePdfText(value)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "• ")
    .replace(/`{1,3}/g, "")
    .replace(/_{2,}/g, "")
    .trim();
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
  jobRef: string;
  dateRange?: { start?: string; end?: string };
}

// Layout constants
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_L = 48;
const MARGIN_R = 48;
const CONTENT_R = PAGE_W - MARGIN_R; // 564
const CONTENT_W = CONTENT_R - MARGIN_L; // 516
const FOOTER_TOP = 72; // content must end above this
const HEADER_H_FIRST = 96;
const HEADER_H_CONT = 40;

// Navy brand color
const NAVY = "0.058 0.090 0.165"; // ~ #0F172A
const NAVY_RGB = (op: "rg" | "RG") => `${NAVY} ${op}`;
const DARK_TEXT = "0.10 0.12 0.18 rg";
const MUTED_BORDER = "0.82 0.85 0.90 RG";
const SOFT_BG = "0.96 0.97 0.99 rg";
const ZEBRA_BG = "0.965 0.973 0.984 rg";
const TABLE_HEAD_TEXT = "1 1 1 rg";
const RESET_BLACK = "0 0 0 rg";

function generateReportPdf(args: BuildArgs): Uint8Array {
  const { customer, job, property, visits, visitWorkers, includeCrewNotes, customerMessage, generatedBy, reportTitle, jobRef, dateRange } = args;

  const pages: string[] = [];
  let ops = "";
  let y = 0;
  let pageIndex = 0;

  const drawBrandHeader = (full: boolean) => {
    const h = full ? HEADER_H_FIRST : HEADER_H_CONT;
    // Navy header bar
    ops += `${NAVY_RGB("rg")} 0 ${PAGE_H - h} ${PAGE_W} ${h} re f\n`;
    // Logo block (white square w/ navy P)
    if (full) {
      ops += `1 1 1 rg ${MARGIN_L} ${PAGE_H - 70} 44 44 re f\n`;
      ops += `${NAVY_RGB("rg")} BT /F2 30 Tf ${MARGIN_L + 12} ${PAGE_H - 60} Td (P) Tj ET\n`;
      // Company text - white
      ops += `1 1 1 rg BT /F2 17 Tf ${MARGIN_L + 56} ${PAGE_H - 34} Td (PRAETORIA GROUP) Tj ET\n`;
      ops += `1 1 1 rg BT /F1 8.5 Tf ${MARGIN_L + 56} ${PAGE_H - 48} Td (Praetoria Operations Group Inc.) Tj ET\n`;
      ops += `1 1 1 rg BT /F1 8.5 Tf ${MARGIN_L + 56} ${PAGE_H - 60} Td (support@praetoriagroup.ca   |   praetoriagroup.ca) Tj ET\n`;
      // Right side title
      ops += `1 1 1 rg BT /F2 14 Tf 380 ${PAGE_H - 34} Td (PROOF OF SERVICE REPORT) Tj ET\n`;
      ops += `1 1 1 rg BT /F1 9 Tf 380 ${PAGE_H - 48} Td (${pdfText(jobRef || "")}) Tj ET\n`;
      ops += `1 1 1 rg BT /F1 8.5 Tf 380 ${PAGE_H - 60} Td (Generated ${pdfText(fmtDateTime(new Date().toISOString()))}) Tj ET\n`;
    } else {
      ops += `1 1 1 rg BT /F2 11 Tf ${MARGIN_L} ${PAGE_H - 25} Td (PRAETORIA GROUP) Tj ET\n`;
      ops += `1 1 1 rg BT /F1 9 Tf ${MARGIN_L} ${PAGE_H - 36} Td (Proof of Service Report${jobRef ? " — " + jobRef : ""}) Tj ET\n`;
      ops += `1 1 1 rg BT /F1 8.5 Tf 460 ${PAGE_H - 30} Td (praetoriagroup.ca) Tj ET\n`;
    }
    ops += `${RESET_BLACK}\n`;
    y = PAGE_H - h - 18;
  };

  const startPage = (full = false) => {
    pageIndex += 1;
    ops = "";
    drawBrandHeader(full);
  };

  const ensure = (height: number) => {
    if (y - height < FOOTER_TOP + 16) {
      pages.push(ops);
      startPage(false);
    }
  };

  const text = (value: unknown, x: number, size = 10, font: "F1" | "F2" = "F1", color = DARK_TEXT) => {
    ensure(size + 4);
    ops += `${color} BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET\n`;
    y -= size + 4;
  };

  const wrapText = (value: unknown, x: number, maxChars: number, size = 9.5, font: "F1" | "F2" = "F1") => {
    const normalized = normalizePdfText(value).split(/\n/);
    for (const ln of normalized) {
      if (!ln.trim()) { y -= size; continue; }
      const words = ln.split(/\s+/).filter(Boolean);
      let cur = "";
      for (const w of words) {
        const candidate = cur ? `${cur} ${w}` : w;
        if (candidate.length > maxChars && cur) {
          text(cur, x, size, font);
          cur = w;
        } else {
          cur = candidate;
        }
      }
      if (cur) text(cur, x, size, font);
    }
  };

  // --- Begin first page ---
  startPage(true);

  // Metadata strip
  ops += `${SOFT_BG} ${MARGIN_L} ${y - 38} ${CONTENT_W} 42 re f\n`;
  ops += `${MUTED_BORDER} ${MARGIN_L} ${y - 38} ${CONTENT_W} 42 re S\n`;
  const metaY = y - 12;
  const metaCol = (label: string, value: string, x: number) => {
    ops += `0.40 0.45 0.55 rg BT /F2 7.5 Tf ${x} ${metaY} Td (${pdfText(label.toUpperCase())}) Tj ET\n`;
    ops += `${DARK_TEXT} BT /F2 10 Tf ${x} ${metaY - 14} Td (${pdfText(value)}) Tj ET\n`;
  };
  metaCol("Report Reference", jobRef || "—", MARGIN_L + 10);
  metaCol("Service Period", `${dateRange?.start ? fmtDate(dateRange.start) : "—"}  →  ${dateRange?.end ? fmtDate(dateRange.end) : "—"}`, MARGIN_L + 160);
  metaCol("Prepared By", generatedBy || "Praetoria Admin", MARGIN_L + 360);
  ops += `${RESET_BLACK}\n`;
  y -= 54;

  // Two-column customer / property cards
  const cardTop = y;
  const cardH = 92;
  const cardW = (CONTENT_W - 12) / 2;
  const leftX = MARGIN_L;
  const rightX = MARGIN_L + cardW + 12;

  const drawCard = (x: number, h: number) => {
    ops += `${SOFT_BG} ${x} ${cardTop - h} ${cardW} ${h} re f\n`;
    ops += `${MUTED_BORDER} ${x} ${cardTop - h} ${cardW} ${h} re S\n`;
  };
  drawCard(leftX, cardH);
  drawCard(rightX, cardH);

  // Customer card content
  const custName = customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";
  let cy = cardTop - 14;
  ops += `${NAVY_RGB("rg")} BT /F2 8 Tf ${leftX + 10} ${cy} Td (CUSTOMER) Tj ET\n`;
  cy -= 14;
  ops += `${DARK_TEXT} BT /F2 12 Tf ${leftX + 10} ${cy} Td (${pdfText(custName)}) Tj ET\n`;
  cy -= 14;
  if (customer.site_contact_name) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${leftX + 10} ${cy} Td (Site contact: ${pdfText(customer.site_contact_name)}) Tj ET\n`;
    cy -= 12;
  }
  if (customer.phone || customer.site_contact_phone) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${leftX + 10} ${cy} Td (Phone: ${pdfText(customer.site_contact_phone || customer.phone)}) Tj ET\n`;
    cy -= 12;
  }
  if (customer.email) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${leftX + 10} ${cy} Td (Email: ${pdfText(customer.email)}) Tj ET\n`;
    cy -= 12;
  }

  // Property card content
  let py = cardTop - 14;
  ops += `${NAVY_RGB("rg")} BT /F2 8 Tf ${rightX + 10} ${py} Td (PROPERTY) Tj ET\n`;
  py -= 14;
  const propName = property?.property_name || "Service Address";
  ops += `${DARK_TEXT} BT /F2 12 Tf ${rightX + 10} ${py} Td (${pdfText(propName)}) Tj ET\n`;
  py -= 14;
  if (property?.address_line_1) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${rightX + 10} ${py} Td (${pdfText(property.address_line_1)}) Tj ET\n`;
    py -= 12;
  }
  const cityLine = [property?.city, property?.province, property?.postal_code].filter(Boolean).join(", ");
  if (cityLine) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${rightX + 10} ${py} Td (${pdfText(cityLine)}) Tj ET\n`;
    py -= 12;
  }
  ops += `${RESET_BLACK}\n`;

  y = cardTop - cardH - 16;

  // Job card
  if (job) {
    const jobTitleText = `${job.job_title || "Job"}${job.job_number ? "  ·  " + job.job_number : ""}`;
    const scopeText = job.scope_of_work ? cleanScope(job.scope_of_work) : "";
    const scopeLines = scopeText ? Math.min(20, Math.ceil(scopeText.length / 90) + (scopeText.match(/\n/g)?.length || 0)) : 0;
    const jobH = 38 + (job.service_category ? 14 : 0) + (scopeText ? 14 + scopeLines * 12 : 0);
    ops += `${SOFT_BG} ${MARGIN_L} ${y - jobH} ${CONTENT_W} ${jobH} re f\n`;
    ops += `${MUTED_BORDER} ${MARGIN_L} ${y - jobH} ${CONTENT_W} ${jobH} re S\n`;
    let jy = y - 14;
    ops += `${NAVY_RGB("rg")} BT /F2 8 Tf ${MARGIN_L + 10} ${jy} Td (JOB) Tj ET\n`;
    jy -= 14;
    ops += `${DARK_TEXT} BT /F2 12 Tf ${MARGIN_L + 10} ${jy} Td (${pdfText(jobTitleText)}) Tj ET\n`;
    jy -= 14;
    if (job.service_category) {
      ops += `${DARK_TEXT} BT /F1 9.5 Tf ${MARGIN_L + 10} ${jy} Td (Service category: ${pdfText(job.service_category)}) Tj ET\n`;
      jy -= 12;
    }
    if (scopeText) {
      ops += `${DARK_TEXT} BT /F2 9 Tf ${MARGIN_L + 10} ${jy} Td (Scope of Work) Tj ET\n`;
      jy -= 12;
      y = jy;
      ops += `${RESET_BLACK}\n`;
      wrapText(scopeText, MARGIN_L + 10, 92, 9.5, "F1");
      y -= 4;
    } else {
      y = jy - 6;
      ops += `${RESET_BLACK}\n`;
    }
  }

  if (customerMessage) {
    ensure(40);
    y -= 4;
    text("MESSAGE FROM PRAETORIA", MARGIN_L, 8, "F2");
    wrapText(customerMessage, MARGIN_L, 96, 10, "F1");
    y -= 6;
  }

  // Visits section title
  ensure(40);
  y -= 6;
  text(`SERVICE VISITS  (${visits.length})`, MARGIN_L, 11, "F2");
  y -= 2;

  // Visits table header
  const cols = [
    { x: MARGIN_L + 6, w: 110, label: "Date" },
    { x: MARGIN_L + 116, w: 50, label: "Visit #" },
    { x: MARGIN_L + 166, w: 64, label: "Arrived" },
    { x: MARGIN_L + 230, w: 68, label: "Completed" },
    { x: MARGIN_L + 298, w: 56, label: "Total" },
    { x: MARGIN_L + 354, w: 68, label: "Status" },
    { x: MARGIN_L + 422, w: 88, label: "Crew" },
  ];

  const drawTableHeader = () => {
    ensure(40);
    ops += `${NAVY_RGB("rg")} ${MARGIN_L} ${y - 18} ${CONTENT_W} 20 re f\n`;
    for (const c of cols) {
      ops += `${TABLE_HEAD_TEXT} BT /F2 8.5 Tf ${c.x} ${y - 12} Td (${pdfText(c.label.toUpperCase())}) Tj ET\n`;
    }
    ops += `${RESET_BLACK}\n`;
    y -= 22;
  };
  drawTableHeader();

  let totalMinutes = 0;
  let rowIdx = 0;
  for (const v of visits) {
    const mins = durationMinutes(v.arrival_time, v.completion_time);
    totalMinutes += mins;
    const workers = visitWorkers.get(String(v.id)) || [];
    const summary = [v.service_summary, v.customer_visible_notes].filter(Boolean).join(" — ");
    const internal = includeCrewNotes && v.crew_notes ? String(v.crew_notes) : "";
    const summaryLines = summary ? Math.ceil(summary.length / 96) : 0;
    const internalLines = internal ? Math.ceil(internal.length / 96) : 0;
    const crewExtraLine = workers.length > 2 ? 1 : 0;
    const rowH = 18 + summaryLines * 11 + internalLines * 11 + crewExtraLine * 11 + 6;

    ensure(rowH + 4);
    if (rowIdx % 2 === 1) {
      ops += `${ZEBRA_BG} ${MARGIN_L} ${y - rowH + 6} ${CONTENT_W} ${rowH} re f\n`;
    }
    const baseY = y;
    const crewLabel = workers.slice(0, 2).join(", ") + (workers.length > 2 ? ` +${workers.length - 2}` : "");
    const vals = [
      fmtDate(v.service_date),
      v.visit_number || "—",
      fmtTime(v.arrival_time),
      fmtTime(v.completion_time),
      fmtDuration(mins),
      v.visit_status || "—",
      crewLabel || "—",
    ];
    for (let i = 0; i < cols.length; i++) {
      const isTotal = i === 4;
      ops += `${DARK_TEXT} BT /${isTotal ? "F2" : "F1"} 9 Tf ${cols[i].x} ${baseY} Td (${pdfText(vals[i])}) Tj ET\n`;
    }
    y -= 14;

    if (summary) {
      ops += `${DARK_TEXT} BT /F2 8.5 Tf ${MARGIN_L + 6} ${y} Td (Summary:) Tj ET\n`;
      ops += `${DARK_TEXT} BT /F1 9 Tf ${MARGIN_L + 50} ${y} Td (${pdfText(summary.slice(0, 92))}) Tj ET\n`;
      y -= 11;
      let rest = summary.slice(92);
      while (rest.length) {
        ops += `${DARK_TEXT} BT /F1 9 Tf ${MARGIN_L + 50} ${y} Td (${pdfText(rest.slice(0, 92))}) Tj ET\n`;
        rest = rest.slice(92);
        y -= 11;
      }
    }
    if (internal) {
      ops += `0.55 0.20 0.20 rg BT /F2 8.5 Tf ${MARGIN_L + 6} ${y} Td (Internal:) Tj ET\n`;
      ops += `${DARK_TEXT} BT /F1 9 Tf ${MARGIN_L + 50} ${y} Td (${pdfText(internal.slice(0, 92))}) Tj ET\n`;
      y -= 11;
    }
    if (workers.length > 2) {
      ops += `${DARK_TEXT} BT /F1 8.5 Tf ${MARGIN_L + 6} ${y} Td (Crew: ${pdfText(workers.join(", "))}) Tj ET\n`;
      y -= 11;
    }
    // row divider
    ops += `${MUTED_BORDER} ${MARGIN_L} ${y - 2} m ${CONTENT_R} ${y - 2} l S\n`;
    y -= 8;
    ops += `${RESET_BLACK}\n`;
    rowIdx += 1;
  }

  // Totals box
  ensure(70);
  y -= 6;
  const tH = 56;
  ops += `${NAVY_RGB("rg")} ${MARGIN_L} ${y - tH} ${CONTENT_W} ${tH} re f\n`;
  let tY = y - 18;
  ops += `1 1 1 rg BT /F2 9 Tf ${MARGIN_L + 14} ${tY} Td (VISITS INCLUDED) Tj ET\n`;
  ops += `1 1 1 rg BT /F2 18 Tf ${MARGIN_L + 14} ${tY - 18} Td (${pdfText(String(visits.length))}) Tj ET\n`;
  ops += `1 1 1 rg BT /F2 9 Tf ${MARGIN_L + 200} ${tY} Td (TOTAL TIME ON SITE) Tj ET\n`;
  ops += `1 1 1 rg BT /F2 18 Tf ${MARGIN_L + 200} ${tY - 18} Td (${pdfText(fmtDuration(totalMinutes))}) Tj ET\n`;
  ops += `1 1 1 rg BT /F1 8 Tf ${MARGIN_L + 400} ${tY} Td (TIME ZONE) Tj ET\n`;
  ops += `1 1 1 rg BT /F2 10 Tf ${MARGIN_L + 400} ${tY - 14} Td (Saskatchewan / Regina) Tj ET\n`;
  ops += `1 1 1 rg BT /F1 8 Tf ${MARGIN_L + 400} ${tY - 28} Td (CST, UTC-6, no DST) Tj ET\n`;
  ops += `${RESET_BLACK}\n`;
  y -= tH + 10;

  // Closing line
  ensure(20);
  ops += `0.35 0.40 0.50 rg BT /F1 8.5 Tf ${MARGIN_L} ${y} Td (This report is provided by Praetoria Group as proof of service for the selected job visits.) Tj ET\n`;
  ops += `${RESET_BLACK}\n`;

  pages.push(ops);

  // Append footer to every page
  const totalPages = pages.length;
  return buildPdf(pages.map((content, idx) => {
    const footer =
      `${MUTED_BORDER} ${MARGIN_L} 60 m ${CONTENT_R} 60 l S\n` +
      `0.40 0.45 0.55 rg BT /F1 8 Tf ${MARGIN_L} 46 Td (Praetoria Group  |  support@praetoriagroup.ca  |  praetoriagroup.ca) Tj ET\n` +
      `0.40 0.45 0.55 rg BT /F1 8 Tf 490 46 Td (Page ${idx + 1} of ${totalPages}) Tj ET\n` +
      `${RESET_BLACK}\n`;
    return content + "\n" + footer;
  }));
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
