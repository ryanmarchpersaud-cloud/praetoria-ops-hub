import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useQuoteLineItems } from '@/hooks/useQuotes';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Download, FileText } from 'lucide-react';
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

export default function QuotePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuote(id);
  const { data: lineItems = [] } = useQuoteLineItems(id);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!quote) return <div className="p-8 text-muted-foreground">Quote not found</div>;

  const exportData = getQuoteDataForExport(quote, lineItems);
  const { subtotal, tax, total, taxRate } = exportData;

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
        className="print:mt-0 mt-16 max-w-[800px] mx-auto bg-white text-[#1a1a2e] p-6 md:p-10 print:p-0 print:max-w-none print:bg-white min-h-screen"
      >
        {/* ── Company Header ── */}
        <div className="flex justify-between items-start mb-8 print:mb-10">
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
              <p>Toronto, Ontario, Canada</p>
              <p>info@praetoriagroup.ca</p>
              <p>(416) 555-0100</p>
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-xs font-semibold uppercase tracking-widest text-[#3b5bdb] print:text-sm"
            >
              Quote
            </div>
            <p
              className="text-xl font-bold mt-1 print:text-2xl"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {exportData.quoteNumber}
            </p>
            <div className="mt-2">
              <PrintStatusBadge status={exportData.status} />
            </div>
            <p className="text-xs text-[#6b7280] mt-2 print:text-sm">
              Issued: {format(new Date(exportData.createdAt), 'MMMM d, yyyy')}
            </p>
            {exportData.validUntil && (
              <p className="text-xs text-[#6b7280] print:text-sm">
                Valid until: {format(new Date(exportData.validUntil), 'MMMM d, yyyy')}
              </p>
            )}
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

        {/* ── Notes (if present — client-facing summary only) ── */}
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
              <div className="border-b border-[#9ca3af] mb-1" />
              <p className="text-[10px] text-[#9ca3af] print:text-xs">Authorized Representative</p>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="text-center pt-8 text-xs text-[#9ca3af] print:text-sm print:pt-12 pb-4">
            <p className="font-medium text-[#6b7280]">Praetoria Group</p>
            <p>info@praetoriagroup.ca · (416) 555-0100</p>
            <p className="mt-1">Thank you for choosing Praetoria Group.</p>
          </div>
        </div>
      </div>
    </>
  );
}
