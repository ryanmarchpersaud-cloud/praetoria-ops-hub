import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatStatusLabel } from '@/lib/statusLabel';

function fmtMoney(n: number): string {
  return (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: '#6b7280', under_review: '#d97706', finalized: '#059669',
    shared: '#3b82f6', void: '#6b7280', cancelled: '#6b7280',
  };
  const color = map[status] || '#6b7280';
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide print:text-sm"
      style={{ backgroundColor: `${color}18`, color, border: `2px solid ${color}60` }}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

function StatusWatermark({ status }: { status: string }) {
  if (!['finalized','shared','void','cancelled'].includes(status)) return null;
  const label = formatStatusLabel(status).toUpperCase();
  const color = status === 'shared' ? '#3b82f6' : status === 'finalized' ? '#059669' : '#6b7280';
  return (
    <div
      className="absolute top-32 right-6 print:top-24 print:right-8 pointer-events-none select-none"
      style={{
        color: `${color}18`, fontSize: '72px', fontWeight: 900,
        letterSpacing: '4px', transform: 'rotate(-18deg)',
        textTransform: 'uppercase', lineHeight: 1,
      }}
    >
      {label}
    </div>
  );
}

export default function OwnerStatementPrint() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: stmt, isLoading } = useQuery({
    queryKey: ['owner-stmt-print', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_owner_statements' as any).select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['owner-stmt-print-lines', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_owner_statement_lines' as any).select('*').eq('statement_id', id!)
        .order('sort_order', { ascending: true }).order('line_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: owner } = useQuery({
    queryKey: ['owner-stmt-print-owner', stmt?.owner_id],
    enabled: !!stmt?.owner_id,
    queryFn: async () => {
      const { data } = await supabase.from('pm_property_owners').select('*').eq('id', stmt.owner_id).maybeSingle();
      return data as any;
    },
  });

  const { data: property } = useQuery({
    queryKey: ['owner-stmt-print-prop', stmt?.property_id],
    enabled: !!stmt?.property_id,
    queryFn: async () => {
      const { data } = await supabase.from('pm_managed_properties').select('*').eq('id', stmt.property_id).maybeSingle();
      return data as any;
    },
  });

  const { data: company } = useQuery({
    queryKey: ['company_settings_print'],
    queryFn: async () => {
      const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
      return data as any;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!stmt) return <div className="p-8 text-muted-foreground">Statement not found or not shared with you.</div>;

  const companyName = company?.invoice_header_name || company?.operating_name || company?.display_name || 'Praetoria Group';
  const companyTagline = 'Residential & Commercial Property Services';
  const companyEmail = company?.support_email || company?.email || company?.billing_email || 'ops@praetoriagroup.ca';
  const companyPhone = company?.phone || '(306) 737-6269';
  const companyAddress = company?.physical_address || company?.mailing_address || 'Regina, Saskatchewan, Canada';
  const accentColor = company?.primary_color || '#0F172A';

  const rentCharged = Number(stmt.rent_charged || 0);
  const rentCollected = Number(stmt.rent_collected || 0);
  const propExp = Number(stmt.property_expenses || 0);
  const maintExp = Number(stmt.maintenance_expenses || 0);
  const fees = Number(stmt.management_fees || 0);
  const adj = Number(stmt.adjustments || 0);
  const opening = Number(stmt.opening_balance || 0);
  const net = Number(stmt.net_owner_amount || 0);

  const grouped: Record<string, any[]> = {};
  for (const l of lines) {
    (grouped[l.line_type] ??= []).push(l);
  }
  const ORDER: string[] = [
    'rent_charge','rent_payment','property_expense','maintenance_expense',
    'management_fee','adjustment','credit','owner_contribution','owner_payout_placeholder','other',
  ];

  return (
    <>
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-1.5" /> Save as PDF
          </Button>
        </div>
      </div>

      <div className="print:mt-0 mt-16 max-w-[800px] mx-auto bg-white text-[#1a1a2e] p-6 md:p-10 print:p-0 print:max-w-none print:w-full print:bg-white min-h-screen flex flex-col relative print:overflow-visible overflow-hidden">
        <StatusWatermark status={stmt.status} />

        {/* Header */}
        <div className="flex justify-between items-start mb-8 print:mb-10">
          <div>
            <div className="bg-[#0F172A] rounded-lg px-4 py-3 mb-2 inline-block print:px-5 print:py-4">
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
            <div className="text-xs font-semibold uppercase tracking-widest print:text-sm" style={{ color: accentColor }}>
              Owner Statement
            </div>
            <p className="text-2xl font-extrabold mt-1 print:text-3xl tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {stmt.statement_number}
            </p>
            <div className="mt-2"><StatusBadge status={stmt.status} /></div>
            <div className="mt-3 text-xs text-[#6b7280] print:text-sm space-y-0.5">
              <p>
                <span className="font-bold text-[#1a1a2e]">Period:</span>{' '}
                {format(new Date(stmt.period_start), 'MMM d, yyyy')} – {format(new Date(stmt.period_end), 'MMM d, yyyy')}
              </p>
              {stmt.finalized_at && (
                <p><span className="font-bold text-[#1a1a2e]">Finalized:</span> {format(new Date(stmt.finalized_at), 'MMMM d, yyyy')}</p>
              )}
              {stmt.shared_at && (
                <p><span className="font-bold text-[#1a1a2e]">Shared:</span> {format(new Date(stmt.shared_at), 'MMMM d, yyyy')}</p>
              )}
              <p className={`text-base font-extrabold pt-1 print:text-lg ${net >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                Net to Owner: ${fmtMoney(net)}
              </p>
            </div>
          </div>
        </div>

        <div className="h-[3px] mb-6 print:mb-8" style={{ backgroundColor: accentColor }} />

        {/* Owner + Property */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-10 print:grid-cols-2">
          {owner && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">Prepared For</p>
              <p className="font-bold text-base print:text-lg">{owner.owner_name}</p>
              {owner.company_name && <p className="text-sm font-semibold text-[#374151] print:text-base">{owner.company_name}</p>}
              <div className="text-xs text-[#6b7280] mt-1 space-y-0.5 print:text-sm">
                {owner.mailing_address && <p>{owner.mailing_address}</p>}
                {owner.email && <p>{owner.email}</p>}
                {owner.phone && <p>{owner.phone}</p>}
              </div>
            </div>
          )}
          {property && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">Property</p>
              <p className="font-bold text-base print:text-lg">{property.property_name}</p>
              <div className="text-xs text-[#6b7280] mt-1 space-y-0.5 print:text-sm">
                {property.address_line_1 && <p>{property.address_line_1}</p>}
                {(property.city || property.province || property.postal_code) && (
                  <p>{[property.city, property.province, property.postal_code].filter(Boolean).join(', ')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-8 print:mb-10">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-3 print:text-xs">Statement Summary</p>
          <div className="border-2 border-[#e5e7eb] rounded-lg overflow-hidden">
            <SumRow label="Opening Balance" value={opening} />
            <SumRow label="Rent Charged" value={rentCharged} muted />
            <SumRow label="Rent Collected" value={rentCollected} positive />
            <SumRow label="Property Expenses" value={-propExp} negative />
            <SumRow label="Maintenance Expenses" value={-maintExp} negative />
            <SumRow label="Management Fees" value={-fees} negative />
            <SumRow label="Adjustments / Credits" value={adj} />
            <div className="flex justify-between items-center px-4 py-3 bg-[#0F172A] text-white">
              <span className="font-extrabold uppercase tracking-wide text-sm print:text-base">Net Owner Amount</span>
              <span className="font-extrabold text-lg tabular-nums print:text-xl" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                ${fmtMoney(net)}
              </span>
            </div>
          </div>
        </div>

        {/* Line item detail, grouped */}
        {lines.length > 0 && (
          <div className="mb-8 print:mb-10">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-3 print:text-xs">Line Item Detail</p>
            {ORDER.filter((t) => grouped[t]?.length).map((type) => (
              <div key={type} className="mb-4 print:mb-6">
                <p className="text-xs font-bold uppercase tracking-wide text-[#374151] mb-1.5 print:text-sm">
                  {formatStatusLabel(type)}
                </p>
                <table className="w-full text-sm print:text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#d1d5db]">
                      <th className="text-left py-1.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-24">Date</th>
                      <th className="text-left py-1.5 pr-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs">Description</th>
                      <th className="text-right py-1.5 pl-2 text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] print:text-xs w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[type].map((l) => (
                      <tr key={l.id} className="border-b border-[#f3f4f6] align-top">
                        <td className="py-2 pr-2 text-xs text-[#374151] print:text-[12px] whitespace-nowrap">
                          {l.line_date ? format(new Date(l.line_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="py-2 pr-2">
                          <p className="font-medium">{l.description || '—'}</p>
                          {l.owner_visible_note && (
                            <p className="text-[11px] text-[#6b7280] mt-0.5 print:text-xs">{l.owner_visible_note}</p>
                          )}
                        </td>
                        <td className="py-2 pl-2 text-right font-bold tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          ${fmtMoney(Number(l.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* Owner-visible notes */}
        {stmt.owner_visible_notes && (
          <div className="mb-8 print:mb-10">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-[#6b7280] mb-2 print:text-xs">Notes</p>
            <div className="border-l-4 border-[#0F172A] bg-[#f8fafc] p-3 text-sm whitespace-pre-wrap print:text-base">
              {stmt.owner_visible_notes}
            </div>
          </div>
        )}

        {/* ── Branded Final Page ── */}
        <div className="mt-10 print:break-before-page print:mt-0 print:pt-4">
          {/* Services */}
          <div className="pt-6 border-t border-[#e5e7eb] print:border-t-0">
            <p className="text-center text-[10px] uppercase tracking-[0.2em] font-bold mb-2 print:text-xs text-[#0F172A]">
              Explore Our Full Range of Services
            </p>
            <p className="text-center text-[11px] text-[#6b7280] mb-4 print:text-xs max-w-2xl mx-auto">
              One trusted partner for all your property needs — ask us about bundling, owner-preferred rates, and coordinated service support.
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
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: s.color }} />
                  <div className="pt-0.5">{s.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Manage Everything in One Place */}
          <div className="mt-8 pt-6 border-t border-[#e5e7eb] print:mt-8">
            <p className="text-center text-[10px] uppercase tracking-[0.2em] font-bold mb-4 print:text-xs text-[#0F172A]">
              Manage Everything in One Place
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-3 print:gap-3">
              {/* Owner Portal — primary */}
              <div className="rounded-lg overflow-hidden border-2 border-[#0F172A]">
                <div className="bg-[#0F172A] text-white px-3 py-2 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide print:text-xs">Owner Portal</p>
                </div>
                <div className="p-3 text-center bg-white">
                  <p className="text-[9px] text-[#374151] leading-snug print:text-[10px]">
                    View owner statements, property summaries, maintenance updates, shared documents, and owner-visible expenses.
                  </p>
                  <p className="text-[9px] font-mono text-[#0F172A] mt-2 print:text-[10px] break-all">
                    praetoriagroup.ca/owner
                  </p>
                  <p className="text-[9px] font-bold text-[#16A34A] mt-1 print:text-[10px] uppercase tracking-wide">
                    Live Now
                  </p>
                </div>
              </div>

              {/* Tenant Portal */}
              <div className="rounded-lg overflow-hidden border-2 border-[#0F766E]">
                <div className="bg-[#0F766E] text-white px-3 py-2 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide print:text-xs">Tenant Portal</p>
                </div>
                <div className="p-3 text-center bg-white">
                  <p className="text-[9px] text-[#374151] leading-snug print:text-[10px]">
                    Tenants submit maintenance requests, view lease info, notices, documents, and tenant-visible ledger updates.
                  </p>
                  <p className="text-[9px] font-mono text-[#0F766E] mt-2 print:text-[10px] break-all">
                    praetoriagroup.ca/tenant
                  </p>
                  <p className="text-[9px] font-bold text-[#16A34A] mt-1 print:text-[10px] uppercase tracking-wide">
                    Live Now
                  </p>
                </div>
              </div>

              {/* Android */}
              <div className="rounded-lg overflow-hidden border-2 border-[#16A34A]">
                <div className="bg-[#16A34A] text-white px-3 py-2 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide print:text-xs">Praetoria App — Android</p>
                </div>
                <div className="p-3 text-center bg-white">
                  <div className="flex justify-center mb-1.5">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 3 L19 12 L5 21 Z" />
                      <path d="M5 3 L15 13 M5 21 L15 11" />
                    </svg>
                  </div>
                  <p className="text-[9px] text-[#374151] print:text-[10px]">Get it on Google Play</p>
                  <p className="text-[9px] font-mono text-[#16A34A] mt-1 print:text-[10px]">Android</p>
                  <p className="text-[9px] font-bold text-[#16A34A] mt-1 print:text-[10px] uppercase tracking-wide">
                    Live Now
                  </p>
                </div>
              </div>

              {/* iOS */}
              <div className="rounded-lg overflow-hidden border-2 border-[#111827]">
                <div className="bg-[#111827] text-white px-3 py-2 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide print:text-xs">Praetoria App — iOS</p>
                </div>
                <div className="p-3 text-center bg-white">
                  <div className="flex justify-center mb-1.5">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 3 a4 4 0 0 0-3 3" />
                      <path d="M19 17 c-1 2-2 3-3.5 3 c-1 0-1.7-0.6-3-0.6 c-1.3 0-2 0.6-3 0.6 c-1.5 0-3-1.5-4-3.5 c-2-4-1-9 2-10 c1.5-0.5 3 0.5 4 0.5 c1 0 2.5-1 4.2-0.8 c1.7 0.2 3 1 3.8 2.3 c-3.4 2-2.8 6.7 0.5 8.5 z" />
                    </svg>
                  </div>
                  <p className="text-[9px] text-[#374151] print:text-[10px]">Download on the App Store</p>
                  <p className="text-[9px] font-mono text-[#111827] mt-1 print:text-[10px]">iOS</p>
                  <p className="text-[9px] font-bold text-[#16A34A] mt-1 print:text-[10px] uppercase tracking-wide">
                    Live Now
                  </p>
                </div>
              </div>
            </div>
            <p className="text-center text-[10px] text-[#6b7280] mt-3 italic print:text-xs">
              A Customer Portal is also available at praetoriagroup.ca/portal for service history, quotes, and invoices.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 border-t-2 border-[#0F172A] text-center text-xs text-[#6b7280] print:text-sm space-y-1">
          <p className="font-extrabold text-[#0F172A] text-sm print:text-base tracking-wide">PRAETORIA GROUP</p>
          <p className="text-[#374151]">ops@praetoriagroup.ca · support@praetoriagroup.ca · 306-737-6269</p>
          <p className="font-mono text-[#0F172A]">praetoriagroup.ca</p>
          <p className="font-semibold text-[#374151] mt-2">Thank you for trusting Praetoria Group with your property.</p>
          <p className="text-[10px] print:text-xs text-[#6b7280]">
            This statement summarizes activity for the period shown. Amounts are in CAD. Retained under Canadian record-keeping requirements.
          </p>
        </div>
      </div>
    </>
  );
}

function SumRow({ label, value, positive, negative, muted }: { label: string; value: number; positive?: boolean; negative?: boolean; muted?: boolean }) {
  const color = positive ? 'text-[#059669]' : negative ? 'text-[#dc2626]' : muted ? 'text-[#6b7280]' : 'text-[#1a1a2e]';
  return (
    <div className="flex justify-between items-center px-4 py-2 border-b border-[#f3f4f6] last:border-b-0">
      <span className="text-sm print:text-base text-[#374151]">{label}</span>
      <span className={`font-semibold tabular-nums text-sm print:text-base ${color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {value < 0 ? '-' : ''}${fmtMoney(Math.abs(value))}
      </span>
    </div>
  );
}
