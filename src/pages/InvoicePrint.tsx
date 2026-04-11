import { useParams, useNavigate } from 'react-router-dom';
import { useInvoice, useInvoiceLineItems } from '@/hooks/useInvoices';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PrintStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    Draft: '#6b7280', Sent: '#3b82f6', Viewed: '#3b82f6', Paid: '#059669',
    'Partially Paid': '#d97706', Overdue: '#dc2626', Failed: '#dc2626', Voided: '#6b7280',
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

export default function InvoicePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: lineItems = [] } = useInvoiceLineItems(id);

  // Pull company branding from company_settings
  const { data: company } = useQuery({
    queryKey: ['company_settings_print'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="p-8 text-muted-foreground">Invoice not found</div>;

  const customer = invoice.customers;
  const property = invoice.properties;
  const job = invoice.jobs;
  const subtotal = Number(invoice.subtotal || 0);
  const tax = Number(invoice.tax || 0);
  const total = Number(invoice.total || 0);
  const taxRate = Number(invoice.tax_rate || 0.13);
  const amountPaid = Number(invoice.amount_paid || 0);
  const balanceDue = Number(invoice.balance_due || 0);

  const companyName = company?.invoice_header_name || company?.operating_name || company?.display_name || 'Praetoria Group';
  const companyTagline = company?.description || 'Property Services & Maintenance';
  const companyEmail = company?.email || company?.billing_email || 'info@praetoriagroup.ca';
  const companyPhone = company?.phone || '(416) 555-0100';
  const companyAddress = company?.physical_address || company?.mailing_address || 'Toronto, Ontario, Canada';
  const accentColor = company?.primary_color || '#3b5bdb';

  return (
    <>
      {/* Toolbar (hidden when printing) */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Invoice
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Save as</span> PDF
          </Button>
        </div>
      </div>

      {/* Printable Document */}
      <div className="print:mt-0 mt-16 max-w-[800px] mx-auto bg-white text-[#1a1a2e] p-6 md:p-10 print:p-0 print:max-w-none print:bg-white min-h-screen">
        {/* Company Header */}
        <div className="flex justify-between items-start mb-8 print:mb-10">
          <div>
            {company?.logo_url ? (
              <img src={company.logo_url} alt={companyName} className="h-10 mb-2 print:h-12" />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-[#1a1a2e] print:text-3xl uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {companyName}
              </h1>
            )}
            <p className="text-xs text-[#6b7280] mt-0.5 print:text-sm">{companyTagline}</p>
            <div className="mt-3 text-xs text-[#6b7280] space-y-0.5 print:text-sm">
              <p>{companyAddress}</p>
              <p>{companyEmail}</p>
              <p>{companyPhone}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-widest print:text-sm" style={{ color: accentColor }}>Invoice</div>
            <p className="text-xl font-bold mt-1 print:text-2xl tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {invoice.invoice_number}
            </p>
            <div className="mt-2"><PrintStatusBadge status={invoice.status} /></div>
            <p className="text-xs text-[#6b7280] mt-2 print:text-sm">
              Issued: {format(new Date(invoice.issue_date), 'MMMM d, yyyy')}
            </p>
            <p className="text-xs text-[#6b7280] print:text-sm">
              Due: {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {/* Accent Bar */}
        <div className="h-[2px] mb-8 print:mb-10" style={{ backgroundColor: accentColor }} />

        {/* Bill To */}
        {customer && (
          <div className="mb-8 print:mb-10">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">Bill To</p>
            <p className="font-semibold text-sm print:text-base">{customer.first_name} {customer.last_name}</p>
            {customer.company_name && <p className="text-sm text-[#374151] print:text-base">{customer.company_name}</p>}
            <div className="text-xs text-[#6b7280] mt-1 space-y-0.5 print:text-sm">
              {customer.address_line_1 && <p>{customer.address_line_1}</p>}
              {(customer.city || customer.province || customer.postal_code) && (
                <p>{[customer.city, customer.province, customer.postal_code].filter(Boolean).join(', ')}</p>
              )}
              {customer.email && <p>{customer.email}</p>}
              {customer.phone && <p>{customer.phone}</p>}
            </div>
          </div>
        )}

        {/* Property & Job info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-10 print:grid-cols-2">
          {property && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-1 print:text-xs">Service Property</p>
              <p className="text-sm font-medium print:text-base">{property.property_name}</p>
              {property.address_line_1 && <p className="text-xs text-[#6b7280] print:text-sm">{property.address_line_1}</p>}
            </div>
          )}
          {job && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-1 print:text-xs">Job Reference</p>
              <p className="text-sm font-medium print:text-base">{job.job_number} — {job.job_title}</p>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="mb-8 print:mb-10">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-3 print:text-xs">Line Items</p>
          <table className="w-full text-sm print:text-base border-collapse">
            <thead>
              <tr className="border-b-2 border-[#d1d5db]">
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-8">#</th>
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">Item</th>
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs hidden md:table-cell print:table-cell">Description</th>
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">Date</th>
                <th className="text-center py-2.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-16">Qty</th>
                <th className="text-right py-2.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">Unit Price</th>
                <th className="text-right py-2.5 pl-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any, idx: number) => (
                <tr key={item.id} className="border-b border-[#f3f4f6]">
                  <td className="py-3 pr-2 text-[#9ca3af]">{idx + 1}</td>
                  <td className="py-3 pr-2">
                    <p className="font-medium">{item.item_name}</p>
                    {item.description && <p className="text-xs text-[#6b7280] mt-0.5 md:hidden print:hidden">{item.description}</p>}
                  </td>
                  <td className="py-3 pr-2 text-[#6b7280] hidden md:table-cell print:table-cell">{item.description}</td>
                  <td className="py-3 pr-2 text-xs text-[#374151]">
                    {item.service_date ? format(new Date(item.service_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="py-3 px-2 text-center tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.quantity}</td>
                  <td className="py-3 px-2 text-right tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(Number(item.unit_price))}</td>
                  <td className="py-3 pl-2 text-right font-medium tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(Number(item.line_total))}</td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-[#9ca3af] italic">No line items</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-10 print:mb-12">
          <div className="w-64 md:w-72 print:w-72 space-y-2">
            <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
              <span>Subtotal</span>
              <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
              <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(tax)}</span>
            </div>
            <div className="h-[1px] bg-[#d1d5db]" />
            <div className="flex justify-between text-lg font-bold pt-1 text-[#1a1a2e] print:text-xl">
              <span>Total (CAD)</span>
              <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(total)}</span>
            </div>
            {amountPaid > 0 && balanceDue > 0.005 && (
              <>
                <div className="flex justify-between text-sm text-[#059669] print:text-base">
                  <span>Paid</span>
                  <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>-${formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#dc2626] print:text-lg">
                  <span>Balance Due</span>
                  <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(balanceDue)}</span>
                </div>
              </>
            )}
            {amountPaid > 0 && balanceDue <= 0.005 && (
              <>
                <div className="flex justify-between text-sm text-[#059669] print:text-base">
                  <span>Paid</span>
                  <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>-${formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#059669] print:text-lg">
                  <span>Balance Due</span>
                  <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>$0.00</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Customer Memo */}
        {invoice.customer_memo && (
          <div className="mb-8 print:mb-10 bg-[#f9fafb] rounded-lg p-4 print:bg-[#f9fafb] border border-[#e5e7eb]">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">Notes</p>
            <p className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap print:text-base">{invoice.customer_memo}</p>
          </div>
        )}

        {/* Payment Terms */}
        <div className="border-t border-[#e5e7eb] pt-6 print:pt-8 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">Payment Terms</p>
            <ol className="text-xs text-[#6b7280] space-y-1.5 list-decimal list-inside print:text-sm">
              <li>Payment is due by the date specified above.</li>
              <li>Late payments may be subject to interest charges.</li>
              <li>Please reference the invoice number with your payment.</li>
              <li>For questions, contact {companyEmail}.</li>
            </ol>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 text-xs text-[#9ca3af] print:text-sm print:pt-12 pb-4">
            <p className="font-medium text-[#6b7280]">{companyName}</p>
            <p>{companyEmail} · {companyPhone}</p>
            <p className="mt-1">Thank you for your business.</p>
          </div>
        </div>
      </div>
    </>
  );
}
