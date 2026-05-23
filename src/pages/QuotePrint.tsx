import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useQuoteLineItems } from '@/hooks/useQuotes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Formatting helpers (shared for future server-side PDF generation) ───
export function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getQuoteDataForExport(quote: any, lineItems: any[]) {
  const lead = quote.leads;
  const customer = quote.customers;
  const source = lead || customer;
  return {
    quoteNumber: quote.quote_number,
    status: quote.approval_status,
    createdAt: quote.created_at,
    validUntil: quote.follow_up_due_at,
    serviceCategory: quote.service_category,
    scopeOfWork: quote.scope_of_work,
    agentSummary: quote.agent_summary,
    internalNotes: quote.internal_notes,
    customerNotes: quote.customer_notes || '',
    workmanshipWarranty: quote.workmanship_warranty || '',
    termsConditions: quote.terms_conditions || '',
    subtotal: Number(quote.subtotal || 0),
    tax: Number(quote.tax || 0),
    total: Number(quote.total || 0),
    taxRate: Number(quote.tax_rate || 0.11),
    gstRate: quote.gst_rate != null ? Number(quote.gst_rate) : null,
    pstRate: quote.pst_rate != null ? Number(quote.pst_rate) : null,
    recurringPricing: quote.recurring_pricing_enabled ? {
      perCut: quote.price_per_cut != null ? Number(quote.price_per_cut) : null,
      weekly: quote.price_weekly != null ? Number(quote.price_weekly) : null,
      biweekly: quote.price_biweekly != null ? Number(quote.price_biweekly) : null,
      monthly: quote.price_monthly != null ? Number(quote.price_monthly) : null,
      notes: quote.recurring_pricing_notes || '',
    } : null,
    client: source ? {
      name: `${source.first_name} ${source.last_name}`,
      company: source.company_name,
      address: source.address_line_1,
      city: source.city,
      province: source.province,
      postalCode: source.postal_code,
      email: source.email,
      phone: source.phone,
    } : null,
    lineItems: lineItems.map((item, idx) => ({
      index: idx + 1,
      name: item.item_name,
      description: item.description || '',
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    })),
  };
}

// ─── Status label styling for print ───
function PrintStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Draft: '#6b7280',
    'Needs review': '#d97706',
    Approved: '#059669',
    Sent: '#3b82f6',
    Declined: '#dc2626',
  };
  const color = colorMap[status] || '#6b7280';

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {status}
    </span>
  );
}

// ─── Service category theming for the printed quote ───
type ServiceTheme = {
  label: string;
  accent: string;
  tint: string;
  icon: JSX.Element;
};

function svgIcon(path: string, color: string) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <path d={path} />
    </svg>
  );
}

// Hex → rgba helper for tint backgrounds
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Master 25-category color map — must stay in sync with the swatch grid below
// and with src/lib/constants.ts SERVICE_CATEGORIES.
const CATEGORY_COLORS: Record<string, string> = {
  'Snow & Ice': '#2563EB',
  'Maintenance & Repairs': '#EAB308',
  'Property Care & Landscaping': '#16A34A',
  'Property Management': '#0F766E',
  'Electrical': '#7C3AED',
  'Plumbing': '#0D9488',
  'Carpentry & Renovations': '#92400E',
  'Roofing & Exteriors': '#374151',
  'Painting & Finishing': '#EAB308',
  'Cleaning Services': '#0EA5E9',
  'Heating, Ventilation & Air Conditioning': '#F43F5E',
  'Concrete & Masonry': '#6B7280',
  'Security & Smart Home': '#111827',
  'Fencing & Decking': '#7c2d12',
  'Junk Removal': '#c2410c',
  'Power Washing': '#0891B2',
  'Tiling & Flooring': '#A16207',
  'Gutter Cleaning & Repair': '#65A30D',
  'Window Cleaning': '#0284C7',
  'Pest Control': '#854D0E',
  'Moving & Hauling': '#9333EA',
  'Insulation & Drywall': '#B91C1C',
  'Appliance Install & Repair': '#0F766E',
  'Garage Doors': '#475569',
  'Locksmith Services': '#1E40AF',
};

// Per-category icon paths (fallback to a generic property/home icon)
const CATEGORY_ICON_PATHS: Record<string, string> = {
  'Snow & Ice': 'M12 2 V22 M2 12 H22 M4.9 4.9 L19.1 19.1 M19.1 4.9 L4.9 19.1',
  'Property Care & Landscaping': 'M12 2 L6 11 H9 L4 19 H10 V22 H14 V19 H20 L15 11 H18 Z',
  'Property Management': 'M3 11 L12 4 L21 11 V21 H14 V14 H10 V21 H3 Z',
  'Junk Removal': 'M3 7 H15 V17 H3 Z M15 10 H19 L21 13 V17 H15 Z',
  'Cleaning Services': 'M9 2 H15 V8 L19 12 V22 H5 V12 L9 8 Z',
  'Power Washing': 'M3 12 H10 L14 8 V16 L10 12 Z M16 6 V18 M19 9 V15',
  'Gutter Cleaning & Repair': 'M3 8 H21 V12 H3 Z M5 12 V18 M19 12 V18',
  // Maintenance & Repairs — hammer + wrench (toolbox vibe)
  'Maintenance & Repairs': 'M3 21 L11 13 M9 11 L13 15 M11 13 L8.5 10.5 L10.5 8.5 L13 11 M16 4 a3 3 0 1 0 3 3 L21.5 9.5 L19 12 L15 8 Z',
};
const DEFAULT_ICON_PATH = 'M3 11 L12 4 L21 11 V21 H14 V14 H10 V21 H3 Z';

function getServiceTheme(category?: string | null): ServiceTheme {
  // Legacy aliases from older quotes
  const aliasMap: Record<string, string> = {
    'Landscaping & Grounds': 'Property Care & Landscaping',
    'Property Care & Maintenance': 'Maintenance & Repairs',
    'Gutter Cleaning': 'Gutter Cleaning & Repair',
  };
  const key = category ? (aliasMap[category] || category) : '';
  const accent = CATEGORY_COLORS[key] || '#1a1a2e';
  const iconPath = CATEGORY_ICON_PATHS[key] || DEFAULT_ICON_PATH;
  return {
    label: key || 'Property Services',
    accent,
    tint: hexToRgba(accent, 0.06),
    icon: svgIcon(iconPath, accent),
  };
}

export default function QuotePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuote(id);
  const { data: lineItems = [] } = useQuoteLineItems(id);

  const { data: company } = useQuery({
    queryKey: ['company_settings_print'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!quote) return <div className="p-8 text-muted-foreground">Quote not found</div>;

  const companyEmail = company?.support_email || company?.email || company?.billing_email || 'info@praetoriagroup.ca';

  const exportData = getQuoteDataForExport(quote, lineItems);
  const { subtotal, tax, total, taxRate } = exportData;
  const theme = getServiceTheme(exportData.serviceCategory);

  const handlePrint = () => window.print();

  return (
    <>
      {/* ── Toolbar (hidden when printing) ── */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/quotes/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Quote
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Save as</span> PDF
          </Button>
        </div>
      </div>

      {/* ── Printable Document ── */}
      <div
        id="quote-pdf-content"
        className="relative print:mt-0 mt-16 max-w-[800px] mx-auto bg-white text-[#1a1a2e] p-6 md:p-10 pt-10 md:pt-14 print:pt-12 print:p-0 print:px-10 print:max-w-none print:bg-white min-h-screen overflow-hidden"
      >
        {/* ── Service Watermark (multiple scattered icons) ── */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 print:block"
          style={{ opacity: 0.1 }}
        >
          {[
            { top: '12%', left: '8%', size: 110 },
            { top: '28%', left: '72%', size: 90 },
            { top: '46%', left: '20%', size: 130 },
            { top: '40%', left: '55%', size: 80 },
            { top: '64%', left: '78%', size: 100 },
            { top: '76%', left: '10%', size: 95 },
            { top: '88%', left: '48%', size: 85 },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute"
              style={{ top: p.top, left: p.left, width: p.size, height: p.size, color: theme.accent }}
            >
              {theme.icon}
            </div>
          ))}
        </div>

        {/* ── Service accent strip ── */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 print:h-2"
          style={{ backgroundColor: theme.accent }}
        />

        <div className="relative">
        {/* ── Company Header ── */}
        <div className="flex justify-between items-start mb-8 print:mb-10">
          <div className="flex items-start gap-4">
            <img
              src="/images/praetoria-logo-white.png"
              alt="Praetoria Group"
              className="h-16 w-16 object-contain rounded-md bg-[#1a1a2e] p-1.5 print:h-20 print:w-20"
            />
            <div>
              <h1
                className="text-2xl font-bold tracking-tight text-[#1a1a2e] print:text-3xl"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                PRAETORIA GROUP
              </h1>
              <p className="text-xs text-[#6b7280] mt-0.5 print:text-sm">
                Property Services & Maintenance
              </p>
              <div className="mt-3 text-xs text-[#6b7280] space-y-0.5 print:text-sm">
                <p>2282 Toronto Street</p>
                <p>Regina, Saskatchewan S4P 1N4</p>
                <p>support@praetoriagroup.ca</p>
                <p>(306) 737-6269</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#6b7280] print:text-sm">
              Issued: {format(new Date(exportData.createdAt), 'MMMM d, yyyy')}
            </p>
            {exportData.validUntil && (
              <p className="text-xs text-[#6b7280] print:text-sm">
                Valid until: {format(new Date(exportData.validUntil), 'MMMM d, yyyy')}
              </p>
            )}
            <div className="mt-2">
              <PrintStatusBadge status={exportData.status} />
            </div>
          </div>
        </div>

        {/* ── Brand Accent Bar ── */}
        <div className="h-[2px] bg-[#3b5bdb] mb-8 print:mb-10" />

        {/* ── Client Information + Big Quotation Title ── */}
        <div className="grid grid-cols-2 gap-6 mb-8 print:mb-10 items-start">
          <div>
            {exportData.client && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
                  Prepared For
                </p>
                <p className="font-semibold text-sm print:text-base">{exportData.client.name}</p>
                {exportData.client.company && (
                  <p className="text-sm text-[#374151] print:text-base">{exportData.client.company}</p>
                )}
                <div className="text-xs text-[#6b7280] mt-1 space-y-0.5 print:text-sm">
                  {exportData.client.address && <p>{exportData.client.address}</p>}
                  {(exportData.client.city || exportData.client.province || exportData.client.postalCode) && (
                    <p>
                      {[exportData.client.city, exportData.client.province, exportData.client.postalCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  {exportData.client.email && <p>{exportData.client.email}</p>}
                  {exportData.client.phone && <p>{exportData.client.phone}</p>}
                </div>
              </>
            )}
          </div>
          <div className="text-right">
            <h2
              className="text-4xl md:text-5xl print:text-6xl font-extrabold tracking-tight leading-none"
              style={{ color: theme.accent, fontFamily: "'DM Sans', sans-serif" }}
            >
              QUOTATION
            </h2>
            <p
              className="mt-2 text-lg font-bold print:text-xl text-[#1a1a2e]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {exportData.quoteNumber}
            </p>
          </div>
        </div>

        {/* ── Service & Scope ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-10 print:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-1 print:text-xs">
              Service Category
            </p>
            <p className="text-sm font-medium print:text-base">{exportData.serviceCategory}</p>
          </div>
        </div>

        {exportData.scopeOfWork && (() => {
          const scope = exportData.scopeOfWork as string;
          const m = scope.match(/^JOB SITE \/ WORK LOCATION:\s*(.+?)(\n|$)/i);
          const jobSite = m?.[1]?.trim();
          const rest = jobSite ? scope.replace(/^JOB SITE \/ WORK LOCATION:.*\n?\n?/i, '') : scope;
          return (
            <div className="mb-8 print:mb-10">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
                Scope of Work
              </p>
              {jobSite && (
                <div
                  className="mb-3 px-3 py-2 rounded-md border-l-4 print:border-l-4"
                  style={{ background: '#FEF08A', borderLeftColor: theme.accent, color: '#1a1a2e' }}
                >
                  <span className="text-[10px] uppercase tracking-widest font-bold mr-2 print:text-xs">Job Site / Work Location:</span>
                  <span className="text-sm font-semibold print:text-base">{jobSite}</span>
                </div>
              )}
              {rest && (
                <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap print:text-base">
                  {rest}
                </p>
              )}
            </div>
          );
        })()}

        {/* ── Line Items Table ── */}
        <div className="mb-8 print:mb-10">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-3 print:text-xs">
            Line Items
          </p>
          <table className="w-full text-sm print:text-base border-collapse">
            <thead>
              <tr className="border-b-2 border-[#d1d5db]">
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-8">
                  #
                </th>
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">
                  Item
                </th>
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs hidden md:table-cell print:table-cell">
                  Description
                </th>
                <th className="text-center py-2.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-16">
                  Qty
                </th>
                <th className="text-right py-2.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">
                  Unit Price
                </th>
                <th className="text-right py-2.5 pl-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {exportData.lineItems.map((item) => (
                <tr key={item.index} className="border-b border-[#f3f4f6]">
                  <td className="py-3 pr-2 text-[#9ca3af]">{item.index}</td>
                  <td className="py-3 pr-2">
                    <p className="font-medium">{item.name}</p>
                    {/* Mobile: show description inline */}
                    {item.description && (
                      <p className="text-xs text-[#6b7280] mt-0.5 md:hidden print:hidden">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-2 text-[#6b7280] hidden md:table-cell print:table-cell">
                    {item.description}
                  </td>
                  <td
                    className="py-3 px-2 text-center"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    className="py-3 px-2 text-right"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ${formatCurrency(item.unitPrice)}
                  </td>
                  <td
                    className="py-3 pl-2 text-right font-medium"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    ${formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              ))}
              {exportData.lineItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#9ca3af] italic">
                    No line items added to this quote
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Totals ── */}
        <div className="flex justify-end mb-10 print:mb-12">
          <div className="w-64 md:w-72 print:w-72 space-y-2">
            <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
              <span>Subtotal</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${formatCurrency(subtotal)}
              </span>
            </div>
            {(exportData.gstRate != null || exportData.pstRate != null) ? (
              <>
                {exportData.gstRate != null && (
                  <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
                    <span>GST ({(exportData.gstRate * 100).toFixed(0)}%)</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      ${formatCurrency(subtotal * (exportData.gstRate || 0))}
                    </span>
                  </div>
                )}
                {exportData.pstRate != null && (
                  <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
                    <span>PST ({(exportData.pstRate * 100).toFixed(0)}%)</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      ${formatCurrency(subtotal * (exportData.pstRate || 0))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-medium text-[#1a1a2e] print:text-base">
                  <span>Total Tax</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    ${formatCurrency(tax)}
                  </span>
                </div>
              </>
            ) : taxRate === 0 ? (
              <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
                <span>Tax</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>Exempt</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  ${formatCurrency(tax)}
                </span>
              </div>
            )}
            <div className="h-[1px] bg-[#d1d5db]" />
            <div className="flex justify-between text-lg font-bold pt-1 text-[#1a1a2e] print:text-xl">
              <span>Total (CAD)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Recurring Service Pricing Options ── */}
        {exportData.recurringPricing && (() => {
          const rp = exportData.recurringPricing;
          const rows = [
            { label: 'Per Cut (One-Time)', sub: 'Pay only when service is performed', value: rp.perCut },
            { label: 'Weekly Service', sub: 'Service every 7 days', value: rp.weekly },
            { label: 'Biweekly Service', sub: 'Service every 14 days', value: rp.biweekly },
            { label: 'Monthly Service', sub: 'One service visit per month', value: rp.monthly },
          ].filter(r => r.value != null && r.value > 0);
          if (rows.length === 0 && !rp.notes) return null;
          return (
            <div className="mb-8 print:mb-10 rounded-lg border-2 overflow-hidden" style={{ borderColor: theme.accent }}>
              <div className="px-4 py-2.5" style={{ backgroundColor: theme.tint }}>
                <p className="text-[10px] uppercase tracking-widest font-bold print:text-xs" style={{ color: theme.accent }}>
                  Recurring Service Pricing Options
                </p>
                <p className="text-[11px] text-[#6b7280] print:text-sm mt-0.5">
                  Choose the service frequency that best fits your needs. Prices below are per visit / per month before tax.
                </p>
              </div>
              {rows.length > 0 && (
                <table className="w-full text-sm print:text-base">
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: '#e5e7eb' }}>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-[#1a1a2e]">{r.label}</p>
                          <p className="text-[11px] text-[#6b7280] print:text-xs">{r.sub}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#1a1a2e]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          ${formatCurrency(r.value as number)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {rp.notes && (
                <div className="px-4 py-2.5 border-t text-[11px] text-[#6b7280] print:text-sm whitespace-pre-wrap" style={{ borderColor: '#e5e7eb' }}>
                  {rp.notes}
                </div>
              )}
            </div>
          );
        })()}

        {(exportData.customerNotes || exportData.agentSummary) && (
          <div className="mb-6 print:mb-8 bg-[#f9fafb] rounded-lg p-4 print:bg-[#f9fafb] border border-[#e5e7eb]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
              Notes
            </p>
            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap print:text-base">
              {exportData.customerNotes || exportData.agentSummary}
            </p>
          </div>
        )}

        {exportData.workmanshipWarranty && (
          <div
            className="mb-6 print:mb-8 rounded-lg p-4 border"
            style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
          >
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-2 print:text-xs" style={{ color: '#15803d' }}>
              Workmanship Warranty
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap print:text-base" style={{ color: '#14532d' }}>
              {exportData.workmanshipWarranty}
            </p>
          </div>
        )}

        {/* ── Terms & Conditions ── */}
        <div className="border-t border-[#e5e7eb] pt-6 print:pt-8 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
              Terms & Conditions
            </p>
            {exportData.termsConditions ? (
              <p className="text-xs text-[#6b7280] leading-relaxed whitespace-pre-wrap print:text-sm">
                {exportData.termsConditions}
              </p>
            ) : (
              <ol className="text-xs text-[#6b7280] space-y-1.5 list-decimal list-inside print:text-sm">
                <li>This quote is valid for 30 days from the issued date.</li>
                <li>Payment terms: Net 30 from project completion date.</li>
                <li>Prices do not include additional scope changes unless separately quoted.</li>
                <li>All work performed in accordance with applicable local regulations and standards.</li>
                <li>Acceptance of this quote constitutes agreement to the terms stated herein.</li>
              </ol>
            )}
          </div>

          {/* ── Acceptance Block ── */}
          <div className="grid grid-cols-2 gap-8 pt-4 print:pt-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-6 print:text-xs print:mb-8">
                Client Signature
              </p>
              <div className="h-8 print:h-9" />
              <div className="border-b border-[#9ca3af] mb-1" />
              <p className="text-[10px] text-[#9ca3af] print:text-xs">Signature & Date</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-6 print:text-xs print:mb-8">
                Praetoria Group
              </p>
              <div className="h-8 print:h-9 flex items-end">
                <span
                  className="text-xl print:text-2xl text-[#1a1a2e] leading-none"
                  style={{ fontFamily: "'Great Vibes', 'Brush Script MT', cursive" }}
                >
                  Ryan Steven Persaud
                </span>
              </div>
              <div className="border-b border-[#9ca3af] mb-1" />
              <p className="text-[10px] text-[#9ca3af] print:text-xs">Ryan Steven Persaud · Authorized Representative</p>
            </div>
          </div>

          {/* ── Our Other Services ── */}
          <div className="mt-10 pt-6 border-t border-[#e5e7eb] print:mt-12">
            <p
              className="text-center text-[10px] uppercase tracking-[0.2em] font-bold mb-4 print:text-xs"
              style={{ color: theme.accent }}
            >
              Explore Our Full Range of Services
            </p>
            <div className="grid grid-cols-3 md:grid-cols-5 print:grid-cols-5 gap-1.5 print:gap-2 text-[9px] print:text-[10px]">
              {[
                { name: 'Snow & Ice', color: '#2563EB' },
                { name: 'Maintenance & Repairs', color: '#EAB308' },
                { name: 'Property Care & Landscaping', color: '#16A34A' },
                { name: 'Property Management', color: '#0F766E' },
                { name: 'Electrical', color: '#7C3AED' },
                { name: 'Plumbing', color: '#0D9488' },
                { name: 'Carpentry & Renovations', color: '#92400E' },
                { name: 'Roofing & Exteriors', color: '#374151' },
                { name: 'Painting & Finishing', color: '#EAB308' },
                { name: 'Cleaning Services', color: '#0EA5E9' },
                { name: 'Heating, Ventilation & Air Conditioning', color: '#F43F5E' },
                { name: 'Concrete & Masonry', color: '#6B7280' },
                { name: 'Security & Smart Home', color: '#111827' },
                { name: 'Fencing & Decking', color: '#7c2d12' },
                { name: 'Junk Removal', color: '#c2410c' },
                { name: 'Power Washing', color: '#0891B2' },
                { name: 'Tiling & Flooring', color: '#A16207' },
                { name: 'Gutter Cleaning & Repair', color: '#65A30D' },
                { name: 'Window Cleaning', color: '#0284C7' },
                { name: 'Pest Control', color: '#854D0E' },
                { name: 'Moving & Hauling', color: '#9333EA' },
                { name: 'Insulation & Drywall', color: '#B91C1C' },
                { name: 'Appliance Install & Repair', color: '#0F766E' },
                { name: 'Garage Doors', color: '#475569' },
                { name: 'Locksmith Services', color: '#1E40AF' },
              ].map((s) => (
                <div
                  key={s.name}
                  className="relative rounded-md border px-1.5 py-2 text-center font-semibold leading-tight overflow-hidden"
                  style={{ borderColor: `${s.color}55`, color: s.color, backgroundColor: `${s.color}0D` }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px]"
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="pt-0.5">{s.name}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-[#6b7280] mt-3 italic print:text-xs">
              One trusted partner for all your property needs — ask us about bundling for preferred rates.
            </p>
          </div>

          {/* ── Customer Portal & App Promotion ── */}
          <div className="mt-6 pt-5 border-t border-[#e5e7eb] print:mt-8">
            <p className="text-center text-[10px] uppercase tracking-[0.2em] font-bold mb-3 print:text-xs text-[#1a1a2e]">
              Manage Everything in One Place
            </p>
            <div className="grid grid-cols-3 gap-3 print:gap-4">
              {/* Customer Portal */}
              <div className="rounded-lg border-2 border-[#1a1a2e]/15 bg-[#1a1a2e]/[0.03] p-3 text-center">
                <div className="flex justify-center mb-1.5">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1a1a2e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="14" rx="2" />
                    <path d="M3 10 H21 M8 18 V21 M16 18 V21 M6 21 H18" />
                  </svg>
                </div>
                <p className="text-[10px] font-bold text-[#1a1a2e] print:text-xs">Customer Portal</p>
                <p className="text-[8px] text-[#6b7280] mt-0.5 print:text-[9px] leading-tight">
                  View quotes, invoices & service history
                </p>
                <p className="text-[8px] font-mono text-[#3b5bdb] mt-1 print:text-[9px] break-all">
                  praetoriagroup.ca/portal
                </p>
                <p className="text-[8px] font-bold text-[#16A34A] mt-1 print:text-[9px] uppercase tracking-wide">
                  Live Now
                </p>
              </div>

              {/* Google Play */}
              <div className="rounded-lg border-2 border-[#16A34A]/25 bg-[#16A34A]/[0.04] p-3 text-center">
                <div className="flex justify-center mb-1.5">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3 L19 12 L5 21 Z" />
                    <path d="M5 3 L15 13 M5 21 L15 11" />
                  </svg>
                </div>
                <p className="text-[10px] font-bold text-[#1a1a2e] print:text-xs">Praetoria Group App</p>
                <p className="text-[8px] text-[#6b7280] mt-0.5 print:text-[9px] leading-tight">
                  Get it on Google Play
                </p>
                <p className="text-[8px] font-mono text-[#16A34A] mt-1 print:text-[9px]">
                  Android
                </p>
                <p className="text-[8px] font-bold text-[#16A34A] mt-1 print:text-[9px] uppercase tracking-wide">
                  Live Now
                </p>
              </div>

              {/* Apple App Store */}
              <div className="rounded-lg border-2 border-[#111827]/25 bg-[#111827]/[0.04] p-3 text-center">
                <div className="flex justify-center mb-1.5">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 3 a4 4 0 0 0-3 3" />
                    <path d="M19 17 c-1 2-2 3-3.5 3 c-1 0-1.7-0.6-3-0.6 c-1.3 0-2 0.6-3 0.6 c-1.5 0-3-1.5-4-3.5 c-2-4-1-9 2-10 c1.5-0.5 3 0.5 4 0.5 c1 0 2.5-1 4.2-0.8 c1.7 0.2 3 1 3.8 2.3 c-3.4 2-2.8 6.7 0.5 8.5 z" />
                  </svg>
                </div>
                <p className="text-[10px] font-bold text-[#1a1a2e] print:text-xs">Praetoria Group App</p>
                <p className="text-[8px] text-[#6b7280] mt-0.5 print:text-[9px] leading-tight">
                  Download on the App Store
                </p>
                <p className="text-[8px] font-mono text-[#111827] mt-1 print:text-[9px]">
                  iOS
                </p>
                <p className="text-[8px] font-bold text-[#16A34A] mt-1 print:text-[9px] uppercase tracking-wide">
                  Live Now
                </p>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="text-center pt-6 text-xs text-[#9ca3af] print:text-sm print:pt-8 pb-4">
            <p className="font-medium text-[#6b7280]">Praetoria Group</p>
            <p>support@praetoriagroup.ca · (306) 737-6269</p>
            <p className="mt-1">Thank you for choosing Praetoria Group.</p>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
