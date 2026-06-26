import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "proof-of-service-reports";
const COMPANY_TZ = "America/Regina";
const COMPANY_EMAIL = "support@praetoriagroup.ca";
const COMPANY_WEBSITE = "praetoriagroup.ca";
const COMPANY_LEGAL = "Praetoria Operations Group Inc.";

const LOGO_JPEG_BASE64 =
  "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";

const LOGO_W = 180;
const LOGO_H = 180;

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

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// PDF object can be either an ASCII string (regular object body) or a stream object
// with a dictionary header and binary bytes (used for image XObjects).
type PdfObject = string | { header: string; bytes: Uint8Array };

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function buildPdf(pageContents: string[], imageBytes: Uint8Array | null): Uint8Array {
  const enc = new TextEncoder();
  const objects: PdfObject[] = [];

  // Reserve ordering:
  // 1 = Catalog, 2 = Pages, then for each page: Page object + Content stream
  // Last = image XObject (if any)
  const numPages = pageContents.length;
  const imageObjNum = imageBytes ? 3 + numPages * 2 : 0; // after all page+content objs

  // 1: Catalog
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  // 2: Pages
  const kids = pageContents.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${numPages} >>`);

  pageContents.forEach((content, i) => {
    const contentObjNum = 4 + i * 2;
    const xobjPart = imageBytes ? ` /XObject << /Im0 ${imageObjNum} 0 R >>` : "";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >>` +
      `${xobjPart} >> /Contents ${contentObjNum} 0 R >>`
    );
    const contentBytes = enc.encode(content);
    objects.push({
      header: `<< /Length ${contentBytes.length} >>`,
      bytes: contentBytes,
    });
  });

  if (imageBytes) {
    objects.push({
      header:
        `<< /Type /XObject /Subtype /Image /Width ${LOGO_W} /Height ${LOGO_H} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>`,
      bytes: imageBytes,
    });
  }

  const parts: Uint8Array[] = [];
  let cursor = 0;
  const push = (s: string | Uint8Array) => {
    const b = typeof s === "string" ? enc.encode(s) : s;
    parts.push(b);
    cursor += b.length;
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(cursor);
    push(`${i + 1} 0 obj\n`);
    if (typeof obj === "string") {
      push(`${obj}\nendobj\n`);
    } else {
      push(`${obj.header}\nstream\n`);
      push(obj.bytes);
      push("\nendstream\nendobj\n");
    }
  });
  const xrefOffset = cursor;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  push(offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join(""));
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return concatBytes(parts);
}

function fmtDate(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  const iso = s.length === 10 ? `${s}T12:00:00Z` : s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-CA", { timeZone: COMPANY_TZ, weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fmtDateShort(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  const iso = s.length === 10 ? `${s}T12:00:00Z` : s;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-CA", { timeZone: COMPANY_TZ, month: "short", day: "numeric", year: "numeric" });
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
    .replace(/^\s*[-*\u2022]\s+/gm, "- ")
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
  includeCrewNotes: boolean;
  customerMessage: string;
  generatedBy: string;
  jobRef: string;
  dateRange?: { start?: string; end?: string };
}

// Layout constants
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_L = 42;
const MARGIN_R = 42;
const CONTENT_R = PAGE_W - MARGIN_R; // 570
const CONTENT_W = CONTENT_R - MARGIN_L; // 528
const FOOTER_TOP = 70;
const HEADER_H_FIRST = 104;
const HEADER_H_CONT = 42;

// Navy brand color: #0F172A
const NAVY = "0.058 0.090 0.165";
const NAVY_FILL = `${NAVY} rg`;
const NAVY_STROKE = `${NAVY} RG`;
const DARK_TEXT = "0.10 0.12 0.18 rg";
const MUTED_TEXT = "0.40 0.45 0.55 rg";
const MUTED_BORDER = "0.82 0.85 0.90 RG";
const SOFT_BG = "0.96 0.97 0.99 rg";
const ZEBRA_BG = "0.965 0.973 0.984 rg";
const WHITE_FILL = "1 1 1 rg";
const RESET_BLACK = "0 0 0 rg";

function periodLabel(visits: any[], dateRange?: { start?: string; end?: string }): string {
  // Prefer dateRange if provided; otherwise derive from visits' service_date
  let start = dateRange?.start || "";
  let end = dateRange?.end || "";
  if (!start || !end) {
    const dates = visits.map((v) => String(v.service_date || "")).filter(Boolean).sort();
    if (dates.length) {
      if (!start) start = dates[0];
      if (!end) end = dates[dates.length - 1];
    }
  }
  if (!start && !end) return "All recorded visits";
  if (start && end && start === end) return fmtDateShort(start);
  if (start && end) return `${fmtDateShort(start)}  to  ${fmtDateShort(end)}`;
  return fmtDateShort(start || end);
}

function generateReportPdf(args: BuildArgs, logoBytes: Uint8Array): Uint8Array {
  const { customer, job, property, visits, visitWorkers, includeCrewNotes, customerMessage, generatedBy, jobRef, dateRange } = args;

  const pages: string[] = [];
  let ops = "";
  let y = 0;

  const period = periodLabel(visits, dateRange);
  const generatedAt = fmtDateTime(new Date().toISOString());

  const drawBrandHeader = (full: boolean) => {
    const h = full ? HEADER_H_FIRST : HEADER_H_CONT;
    // Navy header band
    ops += `${NAVY_FILL} 0 ${PAGE_H - h} ${PAGE_W} ${h} re f\n`;

    if (full) {
      // Logo image (square 56x56) on top-left, vertically centered in header
      const logoSize = 56;
      const logoX = MARGIN_L;
      const logoY = PAGE_H - 18 - logoSize; // 18px from top
      // Image transform: cm = a b c d e f -> [W 0 0 H X Y]
      ops += `q ${logoSize} 0 0 ${logoSize} ${logoX} ${logoY} cm /Im0 Do Q\n`;

      // Company name + meta to right of logo
      const tx = MARGIN_L + logoSize + 14;
      ops += `${WHITE_FILL} BT /F2 16 Tf ${tx} ${PAGE_H - 30} Td (PRAETORIA GROUP) Tj ET\n`;
      ops += `${WHITE_FILL} BT /F1 8.5 Tf ${tx} ${PAGE_H - 44} Td (${pdfText(COMPANY_LEGAL)}) Tj ET\n`;
      ops += `${WHITE_FILL} BT /F1 8.5 Tf ${tx} ${PAGE_H - 56} Td (${pdfText(COMPANY_EMAIL)}  |  ${pdfText(COMPANY_WEBSITE)}) Tj ET\n`;

      // Right side: report title + meta (right-aligned via fixed columns)
      const rx = PAGE_W - MARGIN_R - 230; // 230-wide right block
      ops += `${WHITE_FILL} BT /F2 14 Tf ${rx} ${PAGE_H - 30} Td (PROOF OF SERVICE REPORT) Tj ET\n`;
      const refLine = jobRef ? `Reference: ${jobRef}` : "";
      if (refLine) {
        ops += `${WHITE_FILL} BT /F1 9 Tf ${rx} ${PAGE_H - 44} Td (${pdfText(refLine)}) Tj ET\n`;
      }
      ops += `${WHITE_FILL} BT /F1 8.5 Tf ${rx} ${PAGE_H - 56} Td (Generated ${pdfText(generatedAt)}) Tj ET\n`;
      ops += `${WHITE_FILL} BT /F1 8.5 Tf ${rx} ${PAGE_H - 68} Td (Service period: ${pdfText(period)}) Tj ET\n`;
    } else {
      // Continuation header: smaller
      const logoSize = 24;
      ops += `q ${logoSize} 0 0 ${logoSize} ${MARGIN_L} ${PAGE_H - 8 - logoSize} cm /Im0 Do Q\n`;
      ops += `${WHITE_FILL} BT /F2 10 Tf ${MARGIN_L + logoSize + 10} ${PAGE_H - 20} Td (PRAETORIA GROUP  -  Proof of Service Report${jobRef ? "  -  " + jobRef : ""}) Tj ET\n`;
      ops += `${WHITE_FILL} BT /F1 8.5 Tf ${PAGE_W - MARGIN_R - 110} ${PAGE_H - 20} Td (${pdfText(COMPANY_WEBSITE)}) Tj ET\n`;
    }
    ops += `${RESET_BLACK}\n`;
    y = PAGE_H - h - 22;
  };

  const startPage = (full = false) => {
    ops = "";
    drawBrandHeader(full);
  };

  const ensure = (height: number) => {
    if (y - height < FOOTER_TOP + 16) {
      pages.push(ops);
      startPage(false);
    }
  };

  const drawText = (value: unknown, x: number, size = 10, font: "F1" | "F2" = "F1", color = DARK_TEXT) => {
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
          drawText(cur, x, size, font);
          cur = w;
        } else {
          cur = candidate;
        }
      }
      if (cur) drawText(cur, x, size, font);
    }
  };

  // --- Begin first page ---
  startPage(true);

  // Two-column customer / property cards
  const cardTop = y;
  const cardH = 96;
  const cardW = (CONTENT_W - 14) / 2;
  const leftX = MARGIN_L;
  const rightX = MARGIN_L + cardW + 14;

  const drawCardBg = (x: number, h: number) => {
    ops += `${SOFT_BG} ${x} ${cardTop - h} ${cardW} ${h} re f\n`;
    ops += `${MUTED_BORDER} ${x} ${cardTop - h} ${cardW} ${h} re S\n`;
    // Navy accent strip on left edge
    ops += `${NAVY_FILL} ${x} ${cardTop - h} 3 ${h} re f\n`;
  };
  drawCardBg(leftX, cardH);
  drawCardBg(rightX, cardH);

  // Customer card content
  const custName = customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";
  let cy = cardTop - 16;
  const cInnerX = leftX + 12;
  ops += `${NAVY_FILL} BT /F2 8 Tf ${cInnerX} ${cy} Td (CUSTOMER) Tj ET\n`;
  cy -= 16;
  ops += `${DARK_TEXT} BT /F2 12 Tf ${cInnerX} ${cy} Td (${pdfText(custName)}) Tj ET\n`;
  cy -= 14;
  if (customer.site_contact_name) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${cInnerX} ${cy} Td (Site contact: ${pdfText(customer.site_contact_name)}) Tj ET\n`;
    cy -= 12;
  }
  const cPhone = customer.site_contact_phone || customer.phone;
  if (cPhone) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${cInnerX} ${cy} Td (Phone: ${pdfText(cPhone)}) Tj ET\n`;
    cy -= 12;
  }
  if (customer.email) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${cInnerX} ${cy} Td (Email: ${pdfText(customer.email)}) Tj ET\n`;
    cy -= 12;
  }

  // Property card content
  let py = cardTop - 16;
  const pInnerX = rightX + 12;
  ops += `${NAVY_FILL} BT /F2 8 Tf ${pInnerX} ${py} Td (PROPERTY) Tj ET\n`;
  py -= 16;
  const propName = property?.property_name || "Service Address";
  ops += `${DARK_TEXT} BT /F2 12 Tf ${pInnerX} ${py} Td (${pdfText(propName)}) Tj ET\n`;
  py -= 14;
  if (property?.address_line_1) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${pInnerX} ${py} Td (${pdfText(property.address_line_1)}) Tj ET\n`;
    py -= 12;
  }
  const cityLine = [property?.city, property?.province, property?.postal_code].filter(Boolean).join(", ");
  if (cityLine) {
    ops += `${DARK_TEXT} BT /F1 9 Tf ${pInnerX} ${py} Td (${pdfText(cityLine)}) Tj ET\n`;
    py -= 12;
  }
  ops += `${RESET_BLACK}\n`;

  y = cardTop - cardH - 18;

  // Job card
  if (job) {
    const jobTitleText = `${job.job_title || "Job"}${job.job_number ? "   " + job.job_number : ""}`;
    const scopeText = job.scope_of_work ? cleanScope(job.scope_of_work) : "";
    const scopeLineCount = scopeText ? Math.min(24, Math.ceil(scopeText.length / 90) + (scopeText.match(/\n/g)?.length || 0)) : 0;
    const jobH = 40 + (job.service_category ? 14 : 0) + (scopeText ? 14 + scopeLineCount * 12 : 0);
    ops += `${SOFT_BG} ${MARGIN_L} ${y - jobH} ${CONTENT_W} ${jobH} re f\n`;
    ops += `${MUTED_BORDER} ${MARGIN_L} ${y - jobH} ${CONTENT_W} ${jobH} re S\n`;
    ops += `${NAVY_FILL} ${MARGIN_L} ${y - jobH} 3 ${jobH} re f\n`;
    let jy = y - 16;
    ops += `${NAVY_FILL} BT /F2 8 Tf ${MARGIN_L + 12} ${jy} Td (JOB) Tj ET\n`;
    jy -= 16;
    ops += `${DARK_TEXT} BT /F2 12 Tf ${MARGIN_L + 12} ${jy} Td (${pdfText(jobTitleText)}) Tj ET\n`;
    jy -= 14;
    if (job.service_category) {
      ops += `${DARK_TEXT} BT /F1 9.5 Tf ${MARGIN_L + 12} ${jy} Td (Service category: ${pdfText(job.service_category)}) Tj ET\n`;
      jy -= 12;
    }
    if (scopeText) {
      ops += `${DARK_TEXT} BT /F2 9 Tf ${MARGIN_L + 12} ${jy} Td (Scope of Work) Tj ET\n`;
      jy -= 12;
      y = jy;
      ops += `${RESET_BLACK}\n`;
      wrapText(scopeText, MARGIN_L + 12, 92, 9.5, "F1");
      y -= 6;
    } else {
      y = jy - 6;
      ops += `${RESET_BLACK}\n`;
    }
  }

  if (customerMessage) {
    ensure(40);
    y -= 4;
    drawText("MESSAGE FROM PRAETORIA", MARGIN_L, 8, "F2", NAVY_FILL);
    wrapText(customerMessage, MARGIN_L, 96, 10, "F1");
    y -= 6;
  }

  // Visits section title
  ensure(40);
  y -= 4;
  drawText(`SERVICE VISITS  (${visits.length})`, MARGIN_L, 11, "F2", NAVY_FILL);
  y -= 4;

  // Visits table columns
  const cols = [
    { x: MARGIN_L + 8,   label: "Date" },
    { x: MARGIN_L + 116, label: "Visit #" },
    { x: MARGIN_L + 162, label: "Arrived" },
    { x: MARGIN_L + 220, label: "Completed" },
    { x: MARGIN_L + 290, label: "Total" },
    { x: MARGIN_L + 340, label: "Status" },
    { x: MARGIN_L + 408, label: "Crew" },
  ];

  const drawTableHeader = () => {
    ensure(40);
    ops += `${NAVY_FILL} ${MARGIN_L} ${y - 18} ${CONTENT_W} 20 re f\n`;
    for (const c of cols) {
      ops += `${WHITE_FILL} BT /F2 8.5 Tf ${c.x} ${y - 12} Td (${pdfText(c.label.toUpperCase())}) Tj ET\n`;
    }
    ops += `${RESET_BLACK}\n`;
    y -= 24;
  };
  drawTableHeader();

  let totalMinutes = 0;
  let rowIdx = 0;
  for (const v of visits) {
    const mins = durationMinutes(v.arrival_time, v.completion_time);
    totalMinutes += mins;
    const workers = visitWorkers.get(String(v.id)) || [];
    const summary = [v.service_summary, v.customer_visible_notes].filter(Boolean).join(" - ");
    const internal = includeCrewNotes && v.crew_notes ? String(v.crew_notes) : "";
    const summaryLines = summary ? Math.ceil(summary.length / 96) : 0;
    const internalLines = internal ? Math.ceil(internal.length / 96) : 0;
    const crewExtraLine = workers.length > 2 ? 1 : 0;
    const rowH = 16 + summaryLines * 11 + internalLines * 11 + crewExtraLine * 11 + 6;

    ensure(rowH + 6);
    if (rowIdx % 2 === 1) {
      ops += `${ZEBRA_BG} ${MARGIN_L} ${y - rowH + 8} ${CONTENT_W} ${rowH} re f\n`;
    }
    const baseY = y;
    const crewLabel = workers.length === 0 ? "-" : (workers.slice(0, 2).join(", ") + (workers.length > 2 ? ` +${workers.length - 2}` : ""));
    const vals = [
      fmtDate(v.service_date) || "-",
      v.visit_number || "-",
      fmtTime(v.arrival_time),
      fmtTime(v.completion_time),
      fmtDuration(mins),
      v.visit_status || "-",
      crewLabel,
    ];
    for (let i = 0; i < cols.length; i++) {
      const isTotal = i === 4;
      ops += `${DARK_TEXT} BT /${isTotal ? "F2" : "F1"} 9 Tf ${cols[i].x} ${baseY} Td (${pdfText(vals[i])}) Tj ET\n`;
    }
    y -= 14;

    if (summary) {
      ops += `${MUTED_TEXT} BT /F2 8 Tf ${MARGIN_L + 8} ${y} Td (Summary) Tj ET\n`;
      ops += `${DARK_TEXT} BT /F1 9 Tf ${MARGIN_L + 56} ${y} Td (${pdfText(summary.slice(0, 92))}) Tj ET\n`;
      y -= 11;
      let rest = summary.slice(92);
      while (rest.length) {
        ops += `${DARK_TEXT} BT /F1 9 Tf ${MARGIN_L + 56} ${y} Td (${pdfText(rest.slice(0, 92))}) Tj ET\n`;
        rest = rest.slice(92);
        y -= 11;
      }
    }
    if (internal) {
      ops += `0.55 0.20 0.20 rg BT /F2 8 Tf ${MARGIN_L + 8} ${y} Td (Internal) Tj ET\n`;
      ops += `${DARK_TEXT} BT /F1 9 Tf ${MARGIN_L + 56} ${y} Td (${pdfText(internal.slice(0, 92))}) Tj ET\n`;
      y -= 11;
    }
    if (workers.length > 2) {
      ops += `${MUTED_TEXT} BT /F1 8.5 Tf ${MARGIN_L + 8} ${y} Td (Crew: ${pdfText(workers.join(", "))}) Tj ET\n`;
      y -= 11;
    }
    // row divider
    ops += `${MUTED_BORDER} ${MARGIN_L} ${y - 2} m ${CONTENT_R} ${y - 2} l S\n`;
    y -= 8;
    ops += `${RESET_BLACK}\n`;
    rowIdx += 1;
  }

  // Totals box
  ensure(80);
  y -= 8;
  const tH = 60;
  ops += `${NAVY_FILL} ${MARGIN_L} ${y - tH} ${CONTENT_W} ${tH} re f\n`;
  const tY = y - 20;
  ops += `${WHITE_FILL} BT /F2 9 Tf ${MARGIN_L + 16} ${tY} Td (VISITS INCLUDED) Tj ET\n`;
  ops += `${WHITE_FILL} BT /F2 20 Tf ${MARGIN_L + 16} ${tY - 22} Td (${pdfText(String(visits.length))}) Tj ET\n`;
  ops += `${WHITE_FILL} BT /F2 9 Tf ${MARGIN_L + 200} ${tY} Td (TOTAL TIME ON SITE) Tj ET\n`;
  ops += `${WHITE_FILL} BT /F2 20 Tf ${MARGIN_L + 200} ${tY - 22} Td (${pdfText(fmtDuration(totalMinutes))}) Tj ET\n`;
  ops += `${WHITE_FILL} BT /F1 8 Tf ${MARGIN_L + 400} ${tY} Td (TIME ZONE) Tj ET\n`;
  ops += `${WHITE_FILL} BT /F2 10 Tf ${MARGIN_L + 400} ${tY - 16} Td (Saskatchewan / Regina) Tj ET\n`;
  ops += `${WHITE_FILL} BT /F1 8 Tf ${MARGIN_L + 400} ${tY - 30} Td (CST, UTC-6, no DST) Tj ET\n`;
  ops += `${RESET_BLACK}\n`;
  y -= tH + 12;

  // Closing line
  ensure(20);
  ops += `${MUTED_TEXT} BT /F1 8.5 Tf ${MARGIN_L} ${y} Td (This report is provided by Praetoria Group as proof of service for the selected job visits.) Tj ET\n`;
  y -= 12;
  ops += `${MUTED_TEXT} BT /F1 8 Tf ${MARGIN_L} ${y} Td (Prepared by ${pdfText(generatedBy)}.) Tj ET\n`;
  ops += `${RESET_BLACK}\n`;

  pages.push(ops);

  // Append footer to every page
  const totalPages = pages.length;
  return buildPdf(
    pages.map((content, idx) => {
      const footer =
        `${MUTED_BORDER} ${MARGIN_L} 58 m ${CONTENT_R} 58 l S\n` +
        `${MUTED_TEXT} BT /F2 8 Tf ${MARGIN_L} 44 Td (Praetoria Group) Tj ET\n` +
        `${MUTED_TEXT} BT /F1 8 Tf ${MARGIN_L + 70} 44 Td (${pdfText(COMPANY_EMAIL)}  |  ${pdfText(COMPANY_WEBSITE)}) Tj ET\n` +
        `${MUTED_TEXT} BT /F1 8 Tf ${MARGIN_L} 32 Td (This report is provided as proof of service for the selected job visits.) Tj ET\n` +
        `${MUTED_TEXT} BT /F1 8 Tf ${CONTENT_R - 60} 44 Td (Page ${idx + 1} of ${totalPages}) Tj ET\n` +
        `${RESET_BLACK}\n`;
      return content + "\n" + footer;
    }),
    logoBytes,
  );
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

    const { data: isOps, error: opsErr } = await userClient.rpc("is_ops_staff", { _user_id: authData.user.id });
    if (opsErr || !isOps) {
      const { data: isOps2 } = await userClient.rpc("is_ops_staff");
      if (!isOps2) return json({ error: "Only operations staff can generate proof of service reports." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "signed_url");
    const visitIds: string[] = Array.isArray(body.visit_ids) ? body.visit_ids.filter((v: any) => typeof v === "string") : [];
    const customerId = body.customer_id ? String(body.customer_id) : null;
    const jobId = body.job_id ? String(body.job_id) : null;
    const includeCrewNotes = !!body.include_crew_notes;
    const customerMessage = String(body.customer_message || "").slice(0, 1000);
    const dateRange = body.date_range && typeof body.date_range === "object" ? body.date_range : {};

    if (!visitIds.length) return json({ error: "Select at least one visit to include in the report." }, 400);

    const { data: visits, error: vErr } = await serviceClient
      .from("visits")
      .select("*")
      .in("id", visitIds)
      .order("service_date", { ascending: true })
      .order("arrival_time", { ascending: true });
    if (vErr || !visits || !visits.length) return json({ error: "Could not load the selected visits." }, 400);

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

    const mismatched = visits.find((v: any) => v.customer_id !== resolvedCustomerId);
    if (mismatched) return json({ error: "Selected visits span multiple customers. Please select visits for one customer at a time." }, 400);

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

    const { data: profile } = await serviceClient
      .from("worker_profiles")
      .select("full_name")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    const generatedBy = profile?.full_name || authData.user.email || "Praetoria Admin";

    const titleSuffix = job?.job_number ? ` (${job.job_number})` : "";
    const reportTitle = `Proof of Service Report${titleSuffix}`;
    const jobRef = job?.job_number || customer.company_name || "Proof of Service";

    const logoBytes = base64ToBytes(LOGO_JPEG_BASE64);

    const pdfBytes = generateReportPdf({
      customer: customer as any,
      job: job as any,
      property: property as any,
      visits: visits as any[],
      visitWorkers,
      includeCrewNotes,
      customerMessage,
      generatedBy,
      jobRef,
      dateRange,
    }, logoBytes);

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
