import { useParams, useNavigate } from 'react-router-dom';
import { useQuote, useQuoteLineItems } from '@/hooks/useQuotes';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QuotePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuote(id);
  const { data: lineItems = [] } = useQuoteLineItems(id);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!quote) return <div className="p-8 text-muted-foreground">Quote not found</div>;

  const lead = (quote as any).leads;
  const subtotal = Number(quote.subtotal || 0);
  const tax = Number(quote.tax || 0);
  const total = Number(quote.total || 0);
  const taxRate = Number(quote.tax_rate || 0.13);

  const handlePrint = () => window.print();

  return (
    <>
      {/* ── Toolbar (hidden when printing) ── */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 py-3 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/quotes/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-1" /> Save PDF
          </Button>
        </div>
      </div>

      {/* ── Printable Document ── */}
      <div className="print:mt-0 mt-16 max-w-[800px] mx-auto bg-white text-[#1a1a2e] p-6 md:p-10 print:p-0 print:max-w-none print:bg-white min-h-screen">

        {/* Header */}
        <div className="flex justify-between items-start mb-8 print:mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] print:text-3xl" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              PRAETORIA GROUP
            </h1>
            <p className="text-xs text-[#6b7280] mt-1 print:text-sm">Property Services & Maintenance</p>
            <div className="mt-3 text-xs text-[#6b7280] space-y-0.5 print:text-sm">
              <p>info@praetoriagroup.com</p>
              <p>(416) 555-0100</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#3b5bdb] print:text-sm">
              Quote
            </div>
            <p className="text-xl font-bold mt-1 print:text-2xl" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {quote.quote_number}
            </p>
            <p className="text-xs text-[#6b7280] mt-2 print:text-sm">
              Date: {format(new Date(quote.created_at), 'MMMM d, yyyy')}
            </p>
            {quote.follow_up_due_at && (
              <p className="text-xs text-[#6b7280] print:text-sm">
                Valid until: {format(new Date(quote.follow_up_due_at), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-[2px] bg-[#3b5bdb] mb-8 print:mb-10" />

        {/* Client Info */}
        {lead && (
          <div className="mb-8 print:mb-10">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
              Prepared For
            </p>
            <p className="font-semibold text-sm print:text-base">
              {lead.first_name} {lead.last_name}
            </p>
            {lead.company_name && (
              <p className="text-sm text-[#374151] print:text-base">{lead.company_name}</p>
            )}
            <div className="text-xs text-[#6b7280] mt-1 space-y-0.5 print:text-sm">
              {lead.address_line_1 && <p>{lead.address_line_1}</p>}
              {(lead.city || lead.province || lead.postal_code) && (
                <p>{[lead.city, lead.province, lead.postal_code].filter(Boolean).join(', ')}</p>
              )}
              {lead.email && <p>{lead.email}</p>}
              {lead.phone && <p>{lead.phone}</p>}
            </div>
          </div>
        )}

        {/* Service Category */}
        <div className="mb-6 print:mb-8">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-1 print:text-xs">
            Service Category
          </p>
          <p className="text-sm font-medium print:text-base">{quote.service_category}</p>
        </div>

        {/* Scope of Work */}
        {quote.scope_of_work && (
          <div className="mb-8 print:mb-10">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
              Scope of Work
            </p>
            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap print:text-base">
              {quote.scope_of_work}
            </p>
          </div>
        )}

        {/* Line Items Table */}
        <div className="mb-8 print:mb-10">
          <table className="w-full text-sm print:text-base">
            <thead>
              <tr className="border-b-2 border-[#e5e7eb]">
                <th className="text-left py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">#</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">Item</th>
                <th className="text-left py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs hidden print:table-cell">Description</th>
                <th className="text-center py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">Qty</th>
                <th className="text-right py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">Unit Price</th>
                <th className="text-right py-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={item.id} className="border-b border-[#f3f4f6]">
                  <td className="py-3 text-[#6b7280]">{idx + 1}</td>
                  <td className="py-3">
                    <p className="font-medium">{item.item_name}</p>
                    <p className="text-xs text-[#6b7280] md:hidden">{item.description}</p>
                  </td>
                  <td className="py-3 text-[#6b7280] hidden print:table-cell">{item.description}</td>
                  <td className="py-3 text-center">{Number(item.quantity)}</td>
                  <td className="py-3 text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    ${Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-right font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    ${Number(item.line_total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#9ca3af]">No line items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-10 print:mb-12">
          <div className="w-64 print:w-72 space-y-2">
            <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
              <span>Subtotal</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-[1px] bg-[#e5e7eb]" />
            <div className="flex justify-between text-lg font-bold pt-1 print:text-xl">
              <span>Total</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer / Terms */}
        <div className="border-t border-[#e5e7eb] pt-6 print:pt-8 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">
              Terms & Conditions
            </p>
            <ul className="text-xs text-[#6b7280] space-y-1 list-disc list-inside print:text-sm">
              <li>This quote is valid for 30 days from the date above.</li>
              <li>Payment terms: Net 30 from project completion.</li>
              <li>Prices do not include additional scope changes unless quoted.</li>
              <li>All work performed in accordance with local regulations.</li>
            </ul>
          </div>

          <div className="text-center pt-6 text-xs text-[#9ca3af] print:text-sm print:pt-10">
            <p className="font-medium text-[#6b7280]">Praetoria Group</p>
            <p>info@praetoriagroup.com · (416) 555-0100</p>
            <p className="mt-1">Thank you for your business.</p>
          </div>
        </div>
      </div>
    </>
  );
}
