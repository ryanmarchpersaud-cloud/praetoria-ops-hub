import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useQuoteLineItems } from '@/hooks/useQuotes';
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
    subtotal: Number(quote.subtotal || 0),
    tax: Number(quote.tax || 0),
    total: Number(quote.total || 0),
    taxRate: Number(quote.tax_rate || 0.13),
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
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d={path} />
    </svg>
  );
}

function getServiceTheme(category?: string | null): ServiceTheme {
  switch (category) {
    case 'Landscaping & Grounds':
      return { label: 'Landscaping & Grounds', accent: '#15803d', tint: 'rgba(34,197,94,0.05)',
        icon: svgIcon('M12 2 L6 11 H9 L4 19 H10 V22 H14 V19 H20 L15 11 H18 Z', '#15803d') };
    case 'Snow & Ice':
      return { label: 'Snow & Ice Management', accent: '#0369a1', tint: 'rgba(14,165,233,0.05)',
        icon: svgIcon('M12 2 V22 M2 12 H22 M4.9 4.9 L19.1 19.1 M19.1 4.9 L4.9 19.1', '#0369a1') };
    case 'Junk Removal':
      return { label: 'Junk Removal', accent: '#c2410c', tint: 'rgba(249,115,22,0.06)',
        icon: svgIcon('M3 7 H15 V17 H3 Z M15 10 H19 L21 13 V17 H15 Z', '#c2410c') };
    case 'Property Care & Maintenance':
    case 'Property Management':
      return { label: category!, accent: '#a16207', tint: 'rgba(234,179,8,0.06)',
        icon: svgIcon('M14 6 a4 4 0 1 0 4 4 L21 13 L18 16 L14 12 L6 20 L4 18 L12 10 Z', '#a16207') };
    case 'Cleaning Services':
      return { label: 'Cleaning Services', accent: '#0e7490', tint: 'rgba(6,182,212,0.05)',
        icon: svgIcon('M9 2 H15 V8 L19 12 V22 H5 V12 L9 8 Z', '#0e7490') };
    case 'Power Washing':
      return { label: 'Power Washing', accent: '#1d4ed8', tint: 'rgba(59,130,246,0.05)',
        icon: svgIcon('M3 12 H10 L14 8 V16 L10 12 Z M16 6 V18 M19 9 V15', '#1d4ed8') };
    case 'Gutter Cleaning':
      return { label: 'Gutter Cleaning', accent: '#0e7490', tint: 'rgba(8,145,178,0.05)',
        icon: svgIcon('M3 8 H21 V12 H3 Z M5 12 V18 M19 12 V18', '#0e7490') };
    default:
      return { label: category || 'Property Services', accent: '#1a1a2e', tint: 'rgba(26,26,46,0.04)',
        icon: svgIcon('M3 11 L12 4 L21 11 V21 H14 V14 H10 V21 H3 Z', '#1a1a2e') };
  }
}

export default function QuotePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuote(id);
  const { data: lineItems = [] } = useQuoteLineItems(id);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!quote) return <div className="p-8 text-muted-foreground">Quote not found</div>;

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

        {/* ── Client Information ── */}
        {exportData.client && (
          <div className="mb-8 print:mb-10">
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

        {exportData.scopeOfWork && (
          <div className="mb-8 print:mb-10">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
              Scope of Work
            </p>
            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap print:text-base">
              {exportData.scopeOfWork}
            </p>
          </div>
        )}

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
            <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${formatCurrency(tax)}
              </span>
            </div>
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

        {exportData.agentSummary && (
          <div className="mb-8 print:mb-10 bg-[#f9fafb] rounded-lg p-4 print:bg-[#f9fafb] border border-[#e5e7eb]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
              Notes
            </p>
            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap print:text-base">
              {exportData.agentSummary}
            </p>
          </div>
        )}

        {/* ── Terms & Conditions ── */}
        <div className="border-t border-[#e5e7eb] pt-6 print:pt-8 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
              Terms & Conditions
            </p>
            <ol className="text-xs text-[#6b7280] space-y-1.5 list-decimal list-inside print:text-sm">
              <li>This quote is valid for 30 days from the issued date.</li>
              <li>Payment terms: Net 30 from project completion date.</li>
              <li>Prices do not include additional scope changes unless separately quoted.</li>
              <li>All work performed in accordance with applicable local regulations and standards.</li>
              <li>Acceptance of this quote constitutes agreement to the terms stated herein.</li>
            </ol>
          </div>

          {/* ── Acceptance Block ── */}
          <div className="grid grid-cols-2 gap-8 pt-4 print:pt-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-6 print:text-xs print:mb-8">
                Client Signature
              </p>
              <div className="border-b border-[#9ca3af] mb-1" />
              <p className="text-[10px] text-[#9ca3af] print:text-xs">Signature & Date</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-6 print:text-xs print:mb-8">
                Praetoria Group
              </p>
              <div className="relative h-14 mb-0 print:h-16 flex items-end">
                <span
                  className="text-3xl print:text-4xl text-[#1a1a2e] leading-none pb-1"
                  style={{ fontFamily: "'Great Vibes', 'Brush Script MT', cursive" }}
                >
                  Ryan Steven Persaud
                </span>
              </div>
              <div className="border-b border-[#9ca3af] mb-1" />
              <p className="text-[10px] text-[#9ca3af] print:text-xs">Ryan Steven Persaud · Authorized Representative</p>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="text-center pt-8 text-xs text-[#9ca3af] print:text-sm print:pt-12 pb-4">
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
