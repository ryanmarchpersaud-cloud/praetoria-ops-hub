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
    createdAt: quote.quote_date
      ? new Date(`${quote.quote_date}T12:00:00`).toISOString()
      : quote.created_at,
    validUntil: quote.follow_up_due_at,
    serviceCategory: quote.service_category,
    scopeOfWork: quote.scope_of_work,
    agentSummary: quote.agent_summary,
    internalNotes: quote.internal_notes,
    customerNotes: quote.customer_notes || '',
    workmanshipWarranty: quote.workmanship_warranty || '',
    projectNotes: quote.project_notes || '',
    termsConditions: quote.terms_conditions || '',
    unitRateQuote: Boolean(quote.unit_rate_quote),
    isPricingSheet: Boolean(quote.is_pricing_sheet),
    isProvisional: Boolean((quote as any).is_provisional_estimate),
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
      address: source.address_line_1 || quote.properties?.address_line_1,
      city: source.city || quote.properties?.city,
      province: source.province || quote.properties?.province,
      postalCode: source.postal_code || quote.properties?.postal_code,
      email: source.email,
      phone: source.phone,
    } : null,
    jobSite: quote.properties ? {
      name: quote.properties.property_name as string | null,
      address: quote.properties.address_line_1 as string | null,
      city: quote.properties.city as string | null,
      province: quote.properties.province as string | null,
      postalCode: quote.properties.postal_code as string | null,
    } : null,

    lineItems: lineItems.map((item, idx) => ({
      index: idx + 1,
      name: item.item_name,
      description: item.description || '',
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    })),
    finishOptions: Array.isArray(quote.finish_options)
      ? (quote.finish_options as any[]).map((o) => ({
          name: String(o.name || ''),
          description: String(o.description || ''),
          price: Number(o.price || 0),
          selected: Boolean(o.selected),
        }))
      : [],
    finishOptionsNote: quote.finish_options_note || '',
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
          style={{ opacity: 0.05 }}
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
                  Prepared For — Client / Head Office
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
              className={`${exportData.isPricingSheet ? 'text-3xl md:text-4xl print:text-5xl' : 'text-4xl md:text-5xl print:text-6xl'} font-extrabold tracking-tight leading-none`}
              style={{ color: theme.accent, fontFamily: "'DM Sans', sans-serif" }}
            >
              {exportData.isPricingSheet ? 'PRICING SHEET' : 'QUOTATION'}
            </h2>
            <p
              className="mt-2 text-lg font-bold print:text-xl text-[#1a1a2e]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {exportData.quoteNumber}
            </p>
          </div>
        </div>

        {exportData.isProvisional && (
          <div className="mb-6 rounded border-2 border-amber-500 bg-amber-50 px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-amber-900 print:mb-8">
            Provisional estimate only — not a confirmed price or service commitment
          </div>
        )}

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

        {/* ── Line Items / Unit Rate Table ── */}
        <div
          className={`mb-8 print:mb-10 ${exportData.unitRateQuote ? 'print:break-before-page' : ''}`}
          style={exportData.unitRateQuote ? { breakBefore: 'page', pageBreakBefore: 'always' } : undefined}
        >
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-3 print:text-xs">
            {exportData.unitRateQuote ? 'Unit-Rate Pricing Schedule' : 'Line Items'}
          </p>

          <table className="w-full text-sm print:text-base border-collapse">
            {exportData.unitRateQuote && (
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '51%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
            )}
            <thead className="print:table-header-group">
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
                {exportData.unitRateQuote ? (
                  <th className="text-right py-2.5 pl-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-32">
                    Unit Rate (CAD)
                  </th>
                ) : (
                  <>
                    <th className="text-center py-2.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-16">
                      Qty
                    </th>
                    <th className="text-right py-2.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">
                      Unit Price
                    </th>
                    <th className="text-right py-2.5 pl-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">
                      Total
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {exportData.lineItems.map((item) => (
                <tr
                  key={item.index}
                  className={`border-b border-[#f3f4f6] ${exportData.unitRateQuote ? '' : 'break-inside-avoid'}`}
                  style={exportData.unitRateQuote ? undefined : { breakInside: 'avoid', pageBreakInside: 'avoid' }}

                >
                  <td className="py-3 pr-2 text-[#9ca3af] align-top">{item.index}</td>
                  <td className="py-3 pr-2 align-top">
                    <p className="font-medium">{item.name}</p>
                    {/* Mobile: show description inline */}
                    {item.description && (
                      <p className="text-xs text-[#6b7280] mt-0.5 md:hidden print:hidden">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-2 text-[#6b7280] hidden md:table-cell print:table-cell align-top">
                    {item.description}
                  </td>
                  {exportData.unitRateQuote ? (
                    <td
                      className="py-3 pl-2 text-right font-semibold align-top whitespace-nowrap"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {item.unitPrice > 0 ? `$${formatCurrency(item.unitPrice)}` : 'Variable'}
                    </td>
                  ) : (
                    <>
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
                    </>
                  )}
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


        {/* ── Customer Finish Options (alternatives — not added together) ── */}
        {exportData.finishOptions.length > 0 && (() => {
          const selectedOpt = exportData.finishOptions.find((o) => o.selected);
          const sharedWork =
            exportData.lineItems.reduce((s, i) => s + i.lineTotal, 0) - (selectedOpt?.price || 0);
          const gst = exportData.gstRate ?? 0.05;
          const pst = exportData.pstRate ?? 0;
          return (
            <div
              className="mb-8 print:mb-10 rounded-lg border-2 overflow-hidden break-inside-avoid"
              style={{ borderColor: theme.accent, breakInside: 'avoid', pageBreakInside: 'avoid' }}
            >
              <div className="px-4 py-2.5" style={{ backgroundColor: theme.tint }}>
                <p className="text-[10px] uppercase tracking-widest font-bold print:text-xs" style={{ color: theme.accent }}>
                  Customer Finish Options — Select One
                </p>
                <p className="text-[11px] text-[#6b7280] print:text-sm mt-0.5">
                  These options are alternatives. Only one finish is selected and the two option prices are never combined or added together.
                </p>
              </div>
              <table className="w-full text-sm print:text-base">
                <thead>
                  <tr className="border-t" style={{ borderColor: '#e5e7eb' }}>
                    <th className="text-left px-4 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-10">Select</th>
                    <th className="text-left px-2 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">Finish Option</th>
                    <th className="text-right px-2 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-28">Finish Price</th>
                    <th className="text-right px-2 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-28">Subtotal</th>
                    <th className="text-right px-4 py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-28">Total (CAD)</th>
                  </tr>
                </thead>
                <tbody>
                  {exportData.finishOptions.map((opt, i) => {
                    const optSubtotal = sharedWork + opt.price;
                    const optTotal = optSubtotal * (1 + gst + pst);
                    return (
                      <tr key={i} className="border-t align-top break-inside-avoid" style={{ borderColor: '#e5e7eb' }}>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 border rounded-[2px] text-[10px] font-bold"
                            style={{ borderColor: theme.accent, color: theme.accent }}
                          >
                            {opt.selected ? '✓' : ''}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <p className="font-semibold text-[#1a1a2e]">{opt.name}</p>
                          {opt.description && (
                            <p className="text-[11px] text-[#6b7280] print:text-sm mt-0.5">{opt.description}</p>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          ${formatCurrency(opt.price)}
                        </td>
                        <td className="px-2 py-3 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          ${formatCurrency(optSubtotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          ${formatCurrency(optTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t text-[11px] text-[#6b7280] print:text-sm" style={{ borderColor: '#e5e7eb' }}>
                Shared project work (items above): ${formatCurrency(sharedWork)} before tax. Each option total shown includes the shared project work plus the selected finish, plus {(gst * 100).toFixed(0)}% GST.
                {exportData.finishOptionsNote ? ` ${exportData.finishOptionsNote}` : ''}
              </div>
            </div>
          );
        })()}



        {/* ── Unit-Rate Statement (replaces totals for unit-rate quotations) ── */}
        {exportData.unitRateQuote ? (
          <div
            className="mb-8 print:mb-10 rounded-lg border-2 p-4 print:break-inside-avoid"
            style={{ borderColor: theme.accent, backgroundColor: theme.tint }}
          >
            <p className="text-sm font-extrabold uppercase tracking-wide print:text-base" style={{ color: theme.accent }}>
              Unit-Rate Quotation — No Fixed Contract Total
            </p>
            <p className="text-xs text-[#374151] leading-relaxed mt-1.5 print:text-sm">
              The final invoice will be based on the actual authorized services performed, equipment units used,
              hours worked, snow loads hauled, ice-control applications completed and materials consumed.
            </p>
            <p className="text-[11px] text-[#6b7280] leading-relaxed mt-1.5 print:text-xs">
              The unit rates above are not added together and do not form a quotation total. GST is calculated on the
              actual invoice for the services performed.
            </p>
          </div>
        ) : (
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
            {exportData.finishOptions.some((o) => o.selected) && (
              <p className="text-[11px] text-[#6b7280] print:text-xs pt-1 text-right">
                Totals reflect the selected finish option: {exportData.finishOptions.find((o) => o.selected)?.name}.
              </p>
            )}
          </div>
        </div>
        )}



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

        {/* ── Snow-specific sections (emergency call-outs, guarantee, service notes) ── */}
        {String(exportData.serviceCategory || '').toLowerCase().includes('snow') && (() => {
          const heading = (t: string) => (
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-2 print:text-xs" style={{ color: theme.accent }}>{t}</p>
          );
          const sub = (t: string) => (
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#1a1a2e] mt-3 mb-1 print:text-xs">{t}</p>
          );

          return (
            <>
              {/* Emergency & On-Demand Call-Outs */}
              <div
                className="mb-6 print:mb-8 rounded-lg p-4 border print:break-inside-avoid"
                style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}
              >
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-2 print:text-xs" style={{ color: '#c2410c' }}>
                  Emergency and On-Demand Call-Outs
                </p>
                <div className="text-xs leading-relaxed space-y-2 print:text-sm" style={{ color: '#7c2d12' }}>
                  <p>Customers who are not enrolled in a seasonal winter-maintenance contract may request snow-clearing services on an emergency, month-to-month or one-time call-out basis.</p>
                  <p>The customer must select a snow-accumulation trigger in the approved quotation or service agreement—for example, 5 cm, 7 cm or 10 cm. Service will not be automatically dispatched until the selected accumulation has been reached and the customer has confirmed and authorized the call-out.</p>
                  <p>The target response time for an authorized emergency or on-demand call-out is approximately four to six hours, beginning when the service request is received and confirmed. Response times may be affected by continuing snowfall, road conditions, property access, crew availability and equipment availability.</p>
                  <p>Active seasonal winter-contract customers receive first service priority during major or widespread snowfall events. Recurring or month-to-month customers will be serviced next, followed by one-time and emergency call-out customers, based on availability and the order in which requests are confirmed.</p>
                  <p>Emergency and on-demand pricing may differ from the regular seasonal-contract rates. The price will be confirmed before dispatch and may vary according to the snowfall accumulation, requested response time, time of day, labour requirements, equipment required, site conditions, ice buildup and whether snow hauling is required. A minimum call-out charge or emergency-service premium may apply only when shown and approved in the quotation.</p>
                  <p className="italic">The four-to-six-hour response target applies only to emergency and on-demand call-outs. It does not replace the separate two-hour response commitment provided to qualifying seasonal winter-contract customers.</p>
                </div>
              </div>

              {/* Snow and Ice Service Quality Guarantee */}
              <div
                className="mb-6 print:mb-8 rounded-lg p-4 border print:break-inside-avoid"
                style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}
              >
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-2 print:text-xs" style={{ color: '#0369a1' }}>
                  Snow and Ice Service Quality Guarantee
                </p>
                <div className="text-xs leading-relaxed space-y-2 print:text-sm" style={{ color: '#0c4a6e' }}>
                  <p>Praetoria Group warrants that snow clearing, snow hauling, sanding and de-icing services will be performed with reasonable care and according to the approved scope, selected service trigger and authorized service level.</p>
                  <p>If an area included in the approved scope was missed or was not serviced as authorized, the customer should notify Praetoria Group as soon as reasonably possible, preferably within 24 hours of service. Praetoria Group will inspect the concern and, when a service deficiency is confirmed and conditions permit, return to correct the affected area without an additional labour charge.</p>
                  <p>This guarantee applies only to the specific snow or ice service performed. It does not guarantee that a surface will remain continuously bare, dry or completely free from snow and ice after service.</p>
                  <p>The guarantee does not cover new snow accumulation, continuing precipitation, drifting, blowing snow, freezing rain, refreezing, meltwater, roof runoff, drainage issues, snow deposited by passing vehicles or snow moved by tenants, customers, municipal equipment or other contractors.</p>
                  <p>The effectiveness and duration of salt, sand and other ice-control materials depend on temperature, precipitation, traffic, surface conditions and the type and quantity of material authorized. Ice-control applications reduce hazards but cannot eliminate every possibility of slipping or refreezing.</p>
                  <p>Any property-damage concern should be reported promptly with the location, date, description and photographs when reasonably available. This wording does not remove any rights or remedies that cannot legally be excluded.</p>
                </div>
              </div>

              {/* Customer-Facing Service Notes */}
              <div className="mb-6 print:mb-8 rounded-lg p-4 border" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                {heading('Customer-Facing Service Notes')}
                <div className="text-xs leading-relaxed text-[#374151] print:text-sm">
                  {sub('Service Locations')}
                  <p>The approved scope, service areas and property locations are those listed in the Scope of Work and pricing sections of this quotation. Only the areas identified there are included in the service.</p>

                  {sub('Parking-Area Snow Clearing')}
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Parking-lot and driveway snow clearing is billed at the hourly equipment rate shown in the pricing table of this quotation, per equipment unit, including the operator.</li>
                    <li>Every equipment unit used is billed separately. Equipment may include a tractor, skid-steer/loader or an appropriately equipped plow truck.</li>
                    <li>This rate covers clearing and pushing snow to the approved on-site storage area. It does not include off-site snow hauling.</li>
                  </ul>

                  {sub('Pedestrian-Area Snow Clearing')}
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Sidewalks, private walkways, entrances, rear entrances, emergency exits and garbage areas are billed separately at the pedestrian rate shown in the pricing table of this quotation.</li>
                    <li>This work may be completed using walk-behind snowblowers, compact sidewalk equipment or manual tools, depending on site and weather conditions.</li>
                  </ul>

                  {sub('Off-Site Snow Hauling')}
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Snow hauling is billed separately at the per-load rate shown in the pricing table of this quotation, when quoted.</li>
                    <li>Snow will not be hauled off-site without customer authorization unless immediate action is reasonably required to address an urgent access or safety concern and the customer's authorized representative cannot be reached.</li>
                    <li>Third-party dumping or disposal charges, if applicable, must be disclosed and approved before hauling whenever reasonably possible.</li>
                  </ul>

                  {sub('Ice Control')}
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Sanding or de-icing of pedestrian areas and of parking/vehicle areas is billed per application at the rates shown in the pricing table of this quotation.</li>
                    <li>Salt, sand and other de-icing materials are charged separately according to the actual quantity used.</li>
                  </ul>


                  {sub('Definition of an Application')}
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>One application means one complete treatment of the areas included in the approved scope during one service visit.</li>
                    <li>Additional applications required because of continuing snowfall, freezing rain, refreezing, drifting or changing conditions are separate billable applications when authorized under the service agreement.</li>
                  </ul>

                  {sub('Snowfall Trigger')}
                  <p>The customer must select one service trigger in the Customer Selections section below. The selected trigger must be written into the accepted quotation. Snowfall below the selected trigger is not automatically serviced unless the customer requests and authorizes a call-out.</p>


                  {sub('Response Priority and Timing')}
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Qualifying seasonal winter-contract customers receive first priority during widespread snowfall events.</li>
                    <li>The seasonal-service target is within two hours following the agreed snowfall event or service trigger, subject to continuing weather, road safety, site access and equipment availability.</li>
                    <li>Emergency and one-time call-out customers have a target response time of approximately four to six hours beginning when the request is received and confirmed.</li>
                    <li>Response times are operational targets and may be affected by severe or continuing weather, road closures, unsafe travel, blocked access, equipment failure or other conditions outside Praetoria Group's reasonable control.</li>
                  </ul>

                  {sub('Site Access and Obstructions')}
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>The customer is responsible for keeping service areas reasonably accessible and identifying speed bumps, low curbs, parking blocks, drains, utility covers, electrical cords, private equipment and other objects that may be concealed by snow.</li>
                    <li>Vehicles or other obstructions may result in areas being left temporarily uncleared. A return visit requested after obstructions are removed may be billed separately.</li>
                  </ul>

                  {sub('Snow-Storage Areas')}
                  <p>The customer must approve the areas where snow will be pushed and stored. Relocating existing snow piles or hauling snow away is not included in the regular clearing rate unless specifically authorized.</p>

                  {sub('Ice-Control Materials')}
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>The customer acknowledges that salt, sand and de-icing products may be tracked indoors and may affect vegetation, metal, concrete or other surfaces. Praetoria Group will use reasonable application quantities based on the conditions and authorized service.</li>
                    <li>Spring sweeping or removal of accumulated sand is not included unless separately quoted.</li>
                  </ul>

                  {sub('Customer Monitoring')}
                  <p>Because winter conditions can change rapidly, the customer or property manager remains responsible for monitoring the property between visits and promptly reporting refreezing, drifting, blocked access or other changing conditions requiring additional service.</p>

                  {sub('Documentation')}
                  <p>Praetoria Group may record service dates, arrival and departure times, equipment used, applications completed, materials consumed and available photographs. These records may be used to support service verification and invoicing.</p>
                </div>
              </div>

              {/* Customer Selections & Initials */}
              {(() => {
                const scopeText = String(exportData.scopeOfWork || '');
                const locs = Array.from(
                  scopeText.matchAll(/SERVICE LOCATION\s*(\d)\s*\n([^\n]+)/gi)
                ).map((m) => `Service Location ${m[1]} — ${m[2].trim()}`);
                const targets = locs.length > 1 ? locs : ['This Property'];
                const rows = [
                  'Selected snowfall trigger (every snowfall / 5 cm / 7 cm / 10 cm / other):',
                  'Approved on-site snow-storage location:',
                  'Service type (seasonal contract or on-demand call-out):',
                  'Authorization for ice-control applications (sanding / de-icing):',
                  'Authorization required before off-site snow hauling:',
                ];
                return (
                  <div className="mb-6 print:mb-8 rounded-lg p-4 border print:break-inside-avoid" style={{ borderColor: '#e5e7eb' }}>
                    {heading('Customer Selections and Initials')}
                    <p className="text-[11px] text-[#6b7280] print:text-xs mb-2">
                      Complete one set of selections for each property. Each property is serviced, recorded and invoiced separately.
                    </p>
                    <div className="space-y-4">
                      {targets.map((t) => (
                        <div key={t} className="break-inside-avoid" style={{ breakInside: 'avoid' }}>
                          <p className="text-xs font-bold text-[#1a1a2e] print:text-sm mb-1.5">{t}</p>
                          <div className="space-y-2.5">
                            {rows.map((r) => (
                              <div key={r} className="flex items-end gap-3 text-xs print:text-sm text-[#374151]">
                                <span className="shrink-0">{r}</span>
                                <span className="flex-1 border-b border-[#9ca3af]" />
                                <span className="text-[10px] text-[#9ca3af] print:text-xs shrink-0">Customer Initial</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <p className="text-xs text-[#374151] print:text-sm mb-4">
                          I confirm that I have reviewed the Snow and Ice Service Quality Guarantee, the customer-facing service notes and the rates shown in this quotation.
                        </p>
                        <div className="flex items-end gap-3">
                          <span className="flex-1 border-b border-[#9ca3af]" />
                          <span className="text-[10px] text-[#9ca3af] print:text-xs shrink-0">Customer Signature &amp; Date</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </>
          );
        })()}


        {/* ── Payment Options ── */}
        <div
          className="mb-6 print:mb-8 rounded-lg p-4 border"
          style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
        >
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-2 print:text-xs" style={{ color: '#1d4ed8' }}>
            Payment Options
          </p>
          <ul className="text-xs text-[#1e3a8a] space-y-1 print:text-sm">
            <li><span className="font-bold">Interac e-Transfer:</span> payments@praetoriasnowandice.ca</li>
            <li>
              <span className="font-bold">Credit Card via Stripe:</span>{' '}
              <a href="https://buy.stripe.com/bJe7sN87JdXN7PIbtb28800" className="underline break-all" style={{ color: '#1d4ed8' }}>
                https://buy.stripe.com/bJe7sN87JdXN7PIbtb28800
              </a>
            </li>
            <li>
              <span className="font-bold">Bank Transfer / EFT / Wire</span> <span className="text-[#374151]">(preferred for commercial, government & municipal accounts):</span>
              <div className="ml-4 mt-0.5 text-[#374151]">
                Send directly from your bank to <span className="font-semibold">Praetoria Snow &amp; Ice</span>. Email {companyEmail} to request banking details (transit, institution &amp; account number).
              </div>
            </li>
            <li>
              <span className="font-bold">Cheque:</span> <span className="text-[#374151]">make payable to </span><span className="font-semibold text-[#1e3a8a]">Praetoria Snow &amp; Ice</span>
              <span className="text-[#374151]"> and reference the quote number on the memo line.</span>
            </li>
            <li className="text-[#374151] italic">
              You'll also be able to pay by credit card through your secure online portal once it's set up (we'll email your login).
            </li>
          </ul>
        </div>




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

          {exportData.workmanshipWarranty && (
            <div
              className="rounded-lg p-4 border print:break-inside-avoid"
              style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold mb-2 print:text-xs" style={{ color: '#15803d' }}>
                Workmanship Warranty
              </p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap print:text-sm" style={{ color: '#14532d' }}>
                {exportData.workmanshipWarranty}
              </p>
            </div>
          )}

          {exportData.projectNotes && (
            <div
              className="rounded-lg p-4 border print:break-inside-avoid"
              style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
            >
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
                Customer-Facing Project Notes
              </p>
              <p className="text-xs text-[#374151] leading-relaxed whitespace-pre-wrap print:text-sm">
                {exportData.projectNotes}
              </p>
            </div>
          )}

          {exportData.finishOptions.length > 0 && (
            <div className="rounded-lg p-4 border print:break-inside-avoid" style={{ borderColor: '#e5e7eb' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-3 print:text-xs">
                Finish Selection &amp; Customer Acknowledgment
              </p>
              <div className="space-y-4">
                {exportData.finishOptions.map((opt, i) => (
                  <div key={i} className="flex items-end gap-3 text-xs print:text-sm text-[#374151]">
                    <span className="inline-block w-3.5 h-3.5 border border-[#9ca3af] shrink-0 mb-0.5" />
                    <span className="shrink-0">{opt.name}</span>
                    <span className="flex-1 border-b border-[#9ca3af]" />
                    <span className="text-[10px] text-[#9ca3af] print:text-xs shrink-0">Customer Initial</span>
                  </div>
                ))}
                <p className="text-[11px] text-[#6b7280] print:text-xs">
                  Select one finish only. The options are alternatives and will not be added together.
                </p>
                <div className="pt-2">
                  <p className="text-xs text-[#374151] print:text-sm mb-4">
                    I confirm that I have reviewed the workmanship warranty, assumptions and exclusions, and the customer-facing project notes.
                  </p>
                  <div className="flex items-end gap-3">
                    <span className="flex-1 border-b border-[#9ca3af]" />
                    <span className="text-[10px] text-[#9ca3af] print:text-xs shrink-0">Customer Signature &amp; Date</span>
                  </div>
                </div>
              </div>
            </div>
          )}



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

          {/* ── Platform Transition Note ── */}
          <div className="mt-6 mx-auto max-w-2xl text-center text-[10px] leading-snug px-3 py-2 rounded border print:text-[10px]"
               style={{ backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569' }}>
            Praetoria Group has transitioned to our own in-house platform as of 2026. Invoice and quote numbers have restarted on this new system. Thank you for your continued trust.
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
