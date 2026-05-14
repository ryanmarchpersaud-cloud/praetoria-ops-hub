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
  const isUrgent = status === 'Overdue';
  const isPaid = status === 'Paid';
  return (
    <span
      className={`inline-flex items-center rounded-full font-extrabold uppercase tracking-wide ${
        isUrgent ? 'px-4 py-1.5 text-sm print:text-base' : isPaid ? 'px-4 py-1.5 text-sm print:text-base' : 'px-2.5 py-0.5 text-xs'
      }`}
      style={{ backgroundColor: `${color}18`, color, border: `2px solid ${color}60` }}
    >
      {status}
    </span>
  );
}

function StatusWatermark({ status }: { status: string }) {
  if (status !== 'Overdue' && status !== 'Paid') return null;
  const color = status === 'Overdue' ? '#dc2626' : '#059669';
  return (
    <div
      className="absolute top-32 right-6 print:top-24 print:right-8 pointer-events-none select-none"
      style={{
        color: `${color}20`,
        fontSize: '72px',
        fontWeight: 900,
        letterSpacing: '4px',
        transform: 'rotate(-18deg)',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      {status}
    </div>
  );
}

const SERVICE_CARDS = [
  { label: 'Property Management', img: '/images/service-property-management.png' },
  { label: 'Snow Removal', img: '/images/service-snow-removal.png' },
  { label: 'Landscaping', img: '/images/service-landscaping.png' },
  { label: 'Maintenance & Repair', img: '/images/service-maintenance.png' },
  { label: 'Junk Removal', img: '/images/service-junk-removal.png' },
  { label: 'Cleaning Services', img: '/images/service-cleaning.png?v=3' },
  { label: 'Power Washing', img: '/images/service-power-washing.png?v=3' },
];

export default function InvoicePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: lineItems = [] } = useInvoiceLineItems(id);

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
  const tip = Number(invoice.tip || 0);
  const total = Number(invoice.total || 0);
  const taxRate = Number(invoice.tax_rate || 0.11);
  const amountPaid = Number(invoice.amount_paid || 0);
  const balanceDue = Number(invoice.balance_due || 0);

  const companyName = company?.invoice_header_name || company?.operating_name || company?.display_name || 'Praetoria Group';
  const companyTagline = 'Residential & Commercial Property Services';
  const companyEmail = company?.support_email || company?.email || company?.billing_email || 'info@praetoriagroup.ca';
  const companyPhone = company?.phone || '(306) 737-6269';
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
      <div className="print:mt-0 mt-16 max-w-[800px] mx-auto bg-white text-[#1a1a2e] p-6 md:p-10 print:p-0 print:max-w-none print:w-full print:bg-white min-h-screen flex flex-col relative print:overflow-visible overflow-hidden">
        <StatusWatermark status={invoice.status} />
        {/* Company Header */}
        <div className="flex justify-between items-start mb-8 print:mb-10">
          <div>
            <div className="bg-[#1a1a2e] rounded-lg px-4 py-3 mb-2 inline-block print:px-5 print:py-4">
              <img src="/images/praetoria-logo-white.png" alt={companyName} className="h-16 print:h-24" />
            </div>
            <p className="font-bold text-sm text-[#1a1a2e] print:text-base">{companyName}</p>
            <p className="text-[10px] text-[#6b7280] italic print:text-xs">{companyTagline}</p>
            <div className="mt-2 text-xs text-[#6b7280] space-y-0.5 print:text-sm">
              <p>{companyAddress}</p>
              <p>{companyEmail}</p>
              <p>{companyPhone}</p>
              <p className="font-semibold text-[#374151]">Business No.: 761634088</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-widest print:text-sm" style={{ color: accentColor }}>Invoice</div>
            <p className="text-2xl font-extrabold mt-1 print:text-3xl tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {invoice.invoice_number}
            </p>
            <div className="mt-2"><PrintStatusBadge status={invoice.status} /></div>
            <div className="mt-3 text-xs text-[#6b7280] print:text-sm space-y-0.5">
              <p>
                <span className="font-bold text-[#1a1a2e]">Issued:</span>{' '}
                {format(new Date(invoice.issue_date), 'MMMM d, yyyy')}
              </p>
              <p>
                <span className="font-bold text-[#1a1a2e]">Due:</span>{' '}
                {format(new Date(invoice.due_date), 'MMMM d, yyyy')}
              </p>
              {amountPaid > 0 && (
                <p>
                  <span className="font-bold text-[#059669]">Paid:</span>{' '}
                  ${formatCurrency(amountPaid)}
                </p>
              )}
              {invoice.paid_at && (
                <p>
                  <span className="font-bold text-[#059669]">Date Paid:</span>{' '}
                  {format(new Date(invoice.paid_at), 'MMMM d, yyyy')}
                </p>
              )}
              <p className="text-base font-extrabold text-[#1a1a2e] pt-1 print:text-lg">
                Total: ${formatCurrency(total)}
              </p>
              {balanceDue > 0.005 && balanceDue < total && (
                <p className="text-base font-extrabold text-[#dc2626] print:text-lg">
                  Balance Due: ${formatCurrency(balanceDue)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Accent Bar */}
        <div className="h-[3px] mb-8 print:mb-10" style={{ backgroundColor: accentColor }} />

        {/* Bill To */}
        {customer && (
          <div className="mb-8 print:mb-10">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">Bill To</p>
            <p className="font-bold text-base print:text-lg">{customer.first_name} {customer.last_name}</p>
            {customer.company_name && <p className="text-sm font-semibold text-[#374151] print:text-base">{customer.company_name}</p>}
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
              <p className="text-sm font-bold print:text-base">{property.property_name}</p>
              {property.address_line_1 && <p className="text-xs text-[#6b7280] print:text-sm">{property.address_line_1}</p>}
            </div>
          )}
          {job && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-1 print:text-xs">Job Reference</p>
              <p className="text-sm font-bold print:text-base">{job.job_number} — {job.job_title}</p>
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
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">Product & Service</th>
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs hidden md:table-cell print:table-cell">Description</th>
                <th className="text-left py-2.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-28">Date</th>
                <th className="text-center py-2.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-16">Qty</th>
                <th className="text-right py-2.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">Unit Price</th>
                <th className="text-right py-2.5 pl-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any, idx: number) => {
                const isTrade = /trade settlement/i.test(`${item.item_name ?? ''} ${item.description ?? ''}`);
                return (
                <tr key={item.id} className={`border-b border-[#f3f4f6] ${isTrade ? 'bg-[#fffbeb]' : ''}`}>
                  <td className="py-3 pr-2 text-[#9ca3af]">{idx + 1}</td>
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{item.item_name}</p>
                      {isTrade && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#fde68a] text-[#92400e] border border-[#f59e0b]">
                          Trade Settlement
                        </span>
                      )}
                    </div>
                    {item.description && <p className="text-xs text-[#6b7280] mt-0.5 md:hidden print:hidden">{item.description}</p>}
                  </td>
                  <td className="py-3 pr-2 text-[#6b7280] hidden md:table-cell print:table-cell">{item.description}</td>
                  <td className="py-3 pr-2 text-xs text-[#374151]">
                    {item.service_date ? format(new Date(item.service_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="py-3 px-2 text-center tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.quantity}</td>
                  <td className="py-3 px-2 text-right tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(Number(item.unit_price))}</td>
                  <td className="py-3 pl-2 text-right font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(Number(item.line_total))}</td>
                </tr>
                );
              })}
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
            {tip > 0 && (
              <div className="flex justify-between text-sm text-[#6b7280] print:text-base">
                <span>Tip</span>
                <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(tip)}</span>
              </div>
            )}
            <div className="h-[2px] bg-[#1a1a2e]" />
            <div className="flex justify-between text-lg font-extrabold pt-1 text-[#1a1a2e] print:text-xl">
              <span>Total (CAD)</span>
              <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${formatCurrency(total)}</span>
            </div>
            {amountPaid > 0 && balanceDue > 0.005 && (
              <>
                <div className="flex justify-between text-sm text-[#059669] print:text-base">
                  <span>Paid</span>
                  <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>-${formatCurrency(amountPaid)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#dc2626] print:text-lg">
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
                <div className="flex justify-between text-base font-extrabold text-[#059669] print:text-lg">
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

        {/* Payment Options */}
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
            <li className="text-[#374151] italic">
              You'll also be able to pay by credit card through your secure online portal once it's set up (we'll email your login).
            </li>
          </ul>
        </div>

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

          {/* ── Explore Our Full Range of Services ── */}
          <div className="mt-10 pt-6 border-t border-[#e5e7eb] print:mt-12">
            <p
              className="text-center text-[10px] uppercase tracking-[0.2em] font-bold mb-4 print:text-xs"
              style={{ color: accentColor }}
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
                <p className="text-[8px] font-bold text-[#dc2626] mt-1 print:text-[9px] uppercase tracking-wide">
                  Coming Soon
                </p>
              </div>
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
                <p className="text-[8px] font-mono text-[#16A34A] mt-1 print:text-[9px]">Android</p>
                <p className="text-[8px] font-bold text-[#dc2626] mt-1 print:text-[9px] uppercase tracking-wide">
                  Coming Soon
                </p>
              </div>
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
                <p className="text-[8px] font-mono text-[#111827] mt-1 print:text-[9px]">iOS</p>
                <p className="text-[8px] font-bold text-[#dc2626] mt-1 print:text-[9px] uppercase tracking-wide">
                  Coming Soon
                </p>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="text-center pt-6 text-xs text-[#9ca3af] print:text-sm print:pt-8 pb-4">
            <p className="font-medium text-[#6b7280]">{companyName}</p>
            <p>{companyEmail} · {companyPhone}</p>
            <p className="mt-1">Thank you for your business.</p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-grow" />
      </div>
    </>
  );
}
