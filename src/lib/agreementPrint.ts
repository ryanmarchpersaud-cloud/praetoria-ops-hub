/**
 * Renders an agreement (body + completed fields + signatures) into a
 * branded, print-ready HTML document used for Print / Download PDF.
 */

import { format } from 'date-fns';
import { AgreementField, AgreementFieldValues, splitDocument } from '@/lib/agreementFields';
import { agreementStatusMeta } from '@/lib/agreementStatus';

export interface PrintableAgreement {
  agreement_number?: string | null;
  title: string;
  status?: string | null;
  version?: number | null;
  body_html: string;
  field_schema?: unknown;
  field_values?: unknown;
  customer_signed_at?: string | null;
  countersigned_at?: string | null;
  executed_at?: string | null;
  created_at?: string | null;
}

export interface AuditEntry {
  action: string;
  created_at: string;
  metadata?: unknown;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function signatureHtml(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return '<span class="sig-empty">Awaiting signature</span>';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === 'typed') return `<span class="sig-typed">${escapeHtml(String(parsed.value))}</span>`;
    if (parsed?.value) return `<img class="sig-img" src="${String(parsed.value)}" alt="Signature" />`;
  } catch {
    return `<span class="sig-typed">${escapeHtml(raw)}</span>`;
  }
  return '<span class="sig-empty">Awaiting signature</span>';
}

/** Replace interactive field placeholders with their completed static values. */
export function renderFilledBody(bodyHtml: string, schema: AgreementField[], values: AgreementFieldValues, signedDates: { customer?: string | null; praetoria?: string | null } = {}) {
  const map: Record<string, AgreementField> = {};
  (schema || []).forEach((f) => { map[f.key] = f; });

  return splitDocument(bodyHtml || '')
    .map((seg) => {
      if (seg.type === 'html') return seg.content;
      const field = map[seg.content];
      if (!field) return '';
      const value = values?.[field.key];
      if (field.type === 'signature') {
        const date = field.role === 'praetoria' ? signedDates.praetoria : signedDates.customer;
        return `<div class="print-sig-block">${signatureHtml(value as string)}<div class="sig-rule"></div>
          <div class="sig-date">Signed Date: ${date ? format(new Date(date), 'MMMM d, yyyy h:mm a') : '—'}</div></div>`;
      }
      if (field.type === 'checkbox') {
        return `<p class="print-ack">[${value === true ? 'X' : ' '}] ${escapeHtml(field.checkboxText || field.label)}</p>`;
      }
      return `<span class="print-field">${escapeHtml(typeof value === 'string' && value ? value : '—')}</span>`;
    })
    .join('');
}

export function buildAgreementPrintHtml(
  agreement: PrintableAgreement,
  opts: { logoUrl?: string; audit?: AuditEntry[]; companyLine?: string } = {},
): string {
  const schema = (Array.isArray(agreement.field_schema) ? agreement.field_schema : []) as AgreementField[];
  const values = (agreement.field_values && typeof agreement.field_values === 'object' ? agreement.field_values : {}) as AgreementFieldValues;
  const meta = agreementStatusMeta(agreement.status);
  const body = renderFilledBody(agreement.body_html, schema, values, {
    customer: agreement.customer_signed_at,
    praetoria: agreement.countersigned_at,
  });

  const auditRows = (opts.audit || [])
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((a) => `<tr><td>${format(new Date(a.created_at), 'MMM d, yyyy h:mm:ss a')}</td><td>${escapeHtml(a.action.replace(/_/g, ' '))}</td></tr>`)
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(agreement.agreement_number || '')} ${escapeHtml(agreement.title)}</title>
<style>
  @page { size: letter; margin: 18mm 14mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #16202e; font-size: 11pt; line-height: 1.5; margin: 0; }
  .sheet { max-width: 8.5in; margin: 0 auto; padding: 0 0 40px; }
  .letterhead { background: #0F172A; color: #fff; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
  .letterhead img { height: 54px; }
  .letterhead h1 { font-size: 16pt; margin: 0; letter-spacing: .04em; text-transform: uppercase; font-family: Arial, sans-serif; }
  .letterhead p { margin: 2px 0 0; font-size: 9pt; opacity: .85; font-family: Arial, sans-serif; }
  .doc-bar { display: flex; justify-content: space-between; gap: 12px; background: #f1f5f9; padding: 10px 24px; font-size: 9.5pt; font-family: Arial, sans-serif; border-bottom: 2px solid #0F172A; }
  .content { padding: 24px; }
  h1 { font-size: 15pt; }
  h2 { font-size: 12pt; margin: 20px 0 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; font-family: Arial, sans-serif; }
  h3 { font-size: 10.5pt; margin: 12px 0 4px; font-family: Arial, sans-serif; }
  p, li { font-size: 10.5pt; }
  table.agreement-table, table.agreement-meta { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 10pt; }
  table.agreement-table th, table.agreement-table td, table.agreement-meta th, table.agreement-meta td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  table.agreement-table th, table.agreement-meta th { background: #f1f5f9; font-family: Arial, sans-serif; }
  .legal-review { display: none; }
  .print-field { font-weight: 700; border-bottom: 1px solid #94a3b8; padding: 0 6px; }
  .print-ack { border: 1px solid #cbd5e1; padding: 8px; background: #f8fafc; }
  .print-sig-block { margin: 10px 0 18px; }
  .sig-typed { font-family: 'Segoe Script', 'Brush Script MT', cursive; font-size: 22pt; }
  .sig-img { max-height: 70px; }
  .sig-empty { color: #94a3b8; font-style: italic; }
  .sig-rule { border-bottom: 1px solid #0F172A; width: 320px; margin-top: 4px; }
  .sig-date { font-size: 9pt; color: #475569; margin-top: 3px; font-family: Arial, sans-serif; }
  .agreement-section { page-break-inside: avoid; }
  .schedule { page-break-before: always; }
  .certificate { page-break-before: always; }
  .certificate table { width: 100%; border-collapse: collapse; font-size: 9.5pt; font-family: Arial, sans-serif; }
  .certificate td { border-bottom: 1px solid #e2e8f0; padding: 5px 6px; }
  footer.doc-footer { background: #0F172A; color: #fff; padding: 12px 24px; font-size: 8.5pt; font-family: Arial, sans-serif; display: flex; justify-content: space-between; }
  @media print { .no-print { display: none !important; } }
</style></head>
<body>
<div class="sheet">
  <div class="letterhead">
    ${opts.logoUrl ? `<img src="${opts.logoUrl}" alt="Praetoria" />` : ''}
    <div>
      <h1>Praetoria Group</h1>
      <p>${escapeHtml(opts.companyLine || 'Snow &amp; Ice · Landscaping · Property Care — Regina, Saskatchewan')}</p>
    </div>
  </div>
  <div class="doc-bar">
    <span><strong>Agreement:</strong> ${escapeHtml(agreement.agreement_number || '—')}</span>
    <span><strong>Version:</strong> ${agreement.version ?? 1}</span>
    <span><strong>Status:</strong> ${escapeHtml(meta.label)}</span>
    <span><strong>Completed:</strong> ${agreement.executed_at ? format(new Date(agreement.executed_at), 'MMM d, yyyy') : '—'}</span>
  </div>
  <div class="content">${body}</div>
  ${opts.audit && opts.audit.length ? `<section class="certificate content">
    <h2>Certificate of Completion — Signing Audit Trail</h2>
    <p>Agreement ${escapeHtml(agreement.agreement_number || '')} · Version ${agreement.version ?? 1}</p>
    <table><tbody>${auditRows}</tbody></table>
  </section>` : ''}
  <footer class="doc-footer">
    <span>Praetoria Group — Operations Hub</span>
    <span>${escapeHtml(agreement.agreement_number || '')} · Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}</span>
  </footer>
</div>
<script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });</script>
</body></html>`;
}

export function openAgreementPrintWindow(agreement: PrintableAgreement, opts: { logoUrl?: string; audit?: AuditEntry[] } = {}) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(buildAgreementPrintHtml(agreement, opts));
  w.document.close();
  return true;
}
