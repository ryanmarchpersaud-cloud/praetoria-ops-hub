import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "subcontractor-pay-stubs";

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

function money(value: unknown): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function dateLabel(value: unknown): string {
  if (!value) return "-";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function generatePayStubPdf(stub: Record<string, unknown>, sub: Record<string, unknown>, items: Record<string, unknown>[]) {
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
    if (y - height < 56) newPage();
  };
  const text = (value: unknown, x = left, size = 10, font: "F1" | "F2" = "F1") => {
    ensure(size + 8);
    ops += `BT /${font} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET\n`;
    y -= size + 6;
  };
  const line = () => {
    ensure(12);
    ops += `0.82 0.84 0.87 RG ${left} ${y} m ${right} ${y} l S\n`;
    y -= 14;
  };
  const wrapped = (value: unknown, x = left, size = 9, maxChars = 94) => {
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
  const row = (cols: { value: unknown; x: number; size?: number; font?: "F1" | "F2" }[], height = 18) => {
    ensure(height + 4);
    const rowY = y;
    for (const col of cols) {
      ops += `BT /${col.font || "F1"} ${col.size || 9} Tf ${col.x} ${rowY} Td (${pdfText(col.value)}) Tj ET\n`;
    }
    y -= height;
  };

  ops += "0.06 0.09 0.16 rg 48 760 516 5 re f\n";
  text("PRAETORIA GROUP", left, 18, "F2");
  text("Subcontractor Payment Statement", left, 11, "F2");
  text("support@praetoriagroup.ca | praetoriagroup.ca", left, 9);
  y = 706;
  text(stub.pay_stub_number || "Payment Statement", 398, 18, "F2");
  text(`Status: ${stub.status || "issued"}`, 398, 10);
  text(`Generated: ${dateLabel(new Date().toISOString())}`, 398, 9);
  y = 666;
  line();

  text("Subcontractor", left, 9, "F2");
  text(sub.contact_name || sub.company_name || "Subcontractor", left, 12, "F2");
  if (sub.company_name) text(sub.company_name, left, 10);
  if (sub.mailing_address) wrapped(sub.mailing_address, left, 9, 44);
  if (sub.email) text(sub.email, left, 9);
  if (sub.phone) text(sub.phone, left, 9);

  y += 96;
  text("Pay Period", 360, 9, "F2");
  text(`${dateLabel(stub.period_start)} - ${dateLabel(stub.period_end)}`, 360, 11, "F2");
  if (stub.payment_date) {
    text("Payment", 360, 9, "F2");
    text(`${dateLabel(stub.payment_date)}${stub.payment_method ? ` | ${stub.payment_method}` : ""}`, 360, 10);
  }
  text("Total", 360, 9, "F2");
  text(`${money(stub.total)} CAD`, 360, 16, "F2");
  y -= 20;
  line();

  text("Work / Piece-Up Details", left, 10, "F2");
  row([
    { value: "Date", x: left, font: "F2" },
    { value: "Service", x: 118, font: "F2" },
    { value: "Time", x: 286, font: "F2" },
    { value: "Hours", x: 382, font: "F2" },
    { value: "Rate", x: 438, font: "F2" },
    { value: "Total", x: 504, font: "F2" },
  ], 16);
  line();

  const byService = new Map<string, { hours: number; total: number }>();
  for (const item of items) {
    const service = String(item.service_type || "Service");
    const hours = Number(item.hours || 0);
    const total = Number(item.line_total || 0);
    byService.set(service, {
      hours: (byService.get(service)?.hours || 0) + hours,
      total: (byService.get(service)?.total || 0) + total,
    });
    row([
      { value: dateLabel(item.work_date), x: left },
      { value: service.slice(0, 28), x: 118 },
      { value: item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : "-", x: 286, size: 8 },
      { value: hours || "-", x: 390 },
      { value: item.is_mixed ? "split" : item.hourly_rate ? money(item.hourly_rate) : "-", x: 438 },
      { value: money(total), x: 504, font: "F2" },
    ], 18);
    if (service.length > 28) wrapped(`Service: ${service}`, 118, 8, 72);
    if (item.notes) wrapped(`Notes: ${item.notes}`, 118, 8, 72);
    if (item.is_mixed && Array.isArray(item.mixed_split)) {
      for (const split of item.mixed_split as Record<string, unknown>[]) {
        wrapped(`- ${split.service_type || "Split"}: ${split.hours || 0}h x ${money(split.hourly_rate)} = ${money(split.line_total)}`, 128, 8, 72);
      }
    }
  }

  y -= 8;
  line();
  text("Totals by Service", left, 10, "F2");
  for (const [service, totals] of byService.entries()) {
    row([
      { value: service.slice(0, 42), x: left },
      { value: `${totals.hours} hours`, x: 332 },
      { value: money(totals.total), x: 500, font: "F2" },
    ], 16);
  }
  y -= 6;
  row([
    { value: "Confirmed subtotal", x: 332, font: "F2" },
    { value: money(stub.confirmed_subtotal), x: 500, font: "F2" },
  ], 18);
  if (Number(stub.pending_subtotal || 0) > 0) {
    row([
      { value: "Pending / unconfirmed", x: 332, font: "F2" },
      { value: money(stub.pending_subtotal), x: 500, font: "F2" },
    ], 18);
  }
  row([
    { value: "Total Amount", x: 332, size: 11, font: "F2" },
    { value: `${money(stub.total)} CAD`, x: 486, size: 11, font: "F2" },
  ], 22);

  if (stub.subcontractor_notes) {
    y -= 8;
    line();
    text("Notes", left, 10, "F2");
    wrapped(stub.subcontractor_notes, left, 9, 94);
  }

  if (y > 112) {
    const footerY = Math.max(y - 28, 72);
    ops += `0.94 0.96 0.98 rg 48 ${footerY - 12} 516 42 re f\n`;
    ops += `BT /F1 9 Tf 62 ${footerY + 12} Td (${pdfText("This statement was generated securely for the subcontractor portal. Keep it for your records.")}) Tj ET\n`;
    ops += `BT /F1 8 Tf 62 ${footerY - 6} Td (${pdfText("Praetoria Group | support@praetoriagroup.ca")}) Tj ET\n`;
  }
  pages.push(ops);
  return buildPdf(pages);
}

function safeFilename(value: unknown) {
  return String(value || "payment-statement").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
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
    if (authError || !authData.user) return json({ error: "Please sign in to access this pay stub." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "signed_url");
    const payStubId = String(body.pay_stub_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(payStubId)) return json({ error: "Missing or invalid pay stub id." }, 400);

    const { data: stub, error: stubError } = await userClient
      .from("subcontractor_pay_stubs")
      .select("*")
      .eq("id", payStubId)
      .single();
    if (stubError || !stub) return json({ error: "Pay stub not found or you do not have access to it." }, 404);

    const { data: items, error: itemError } = await userClient
      .from("subcontractor_pay_stub_line_items")
      .select("*")
      .eq("pay_stub_id", payStubId)
      .order("work_date", { ascending: true })
      .order("sort_order", { ascending: true });
    if (itemError) return json({ error: "Could not load pay stub line items." }, 400);

    const { data: sub, error: subError } = await serviceClient
      .from("subcontractors")
      .select("id, company_name, contact_name, email, phone, mailing_address")
      .eq("id", stub.subcontractor_id)
      .single();
    if (subError || !sub) return json({ error: "Could not load subcontractor profile." }, 400);

    const fileName = `${safeFilename(stub.pay_stub_number)}-${safeFilename(sub.company_name || sub.contact_name)}.pdf`;
    const storagePath = `subcontractors/${stub.subcontractor_id}/${stub.id}/${fileName}`;
    const pdfBytes = generatePayStubPdf(stub, sub, items ?? []);

    const { error: uploadError } = await serviceClient.storage
      .from(BUCKET)
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) return json({ error: `Could not prepare PDF: ${uploadError.message}` }, 500);

    if (action === "email") {
      const to = String(body.email || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "Enter a valid email address." }, 400);
      const resendKey = Deno.env.get("RESEND_API_KEY_1") || Deno.env.get("RESEND_API_KEY");
      if (!resendKey) return json({ error: "Email delivery is not configured yet." }, 503);
      const period = `${dateLabel(stub.period_start)} - ${dateLabel(stub.period_end)}`;
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Praetoria Group <noreply@praetoriagroup.ca>",
          to: [to],
          reply_to: "support@praetoriagroup.ca",
          subject: `Payment Statement ${stub.pay_stub_number || ""} - Praetoria Group`,
          html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5"><h2>Praetoria Group Payment Statement</h2><p>Hi ${escapeHtml(sub.contact_name || "there")},</p><p>Your subcontractor payment statement for <strong>${escapeHtml(period)}</strong> is attached as a PDF.</p><p><strong>Total:</strong> ${money(stub.total)} CAD</p><p>If you have questions, contact <a href="mailto:support@praetoriagroup.ca">support@praetoriagroup.ca</a>.</p></body></html>`,
          attachments: [{ filename: fileName, content: bytesToBase64(pdfBytes), contentType: "application/pdf" }],
        }),
      });
      const emailResponse = await result.json().catch(() => ({}));
      if (!result.ok) return json({ error: emailResponse.message || "Email could not be sent." }, 502);
      await serviceClient.from("integration_logs").insert({
        provider: "resend",
        event_name: "email.subcontractor_pay_stub",
        channel: "email",
        status: "success",
        recipient: to,
        record_type: "subcontractor_pay_stub",
        record_id: String(stub.id),
        provider_response_id: emailResponse.id,
      });
      return json({ ok: true, action: "email", fileName });
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
      action: "signed_url",
      signedUrl: viewData.signedUrl,
      downloadUrl: downloadData?.signedUrl || viewData.signedUrl,
      fileName,
      expiresInSeconds: 3600,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected PDF error." }, 500);
  }
});