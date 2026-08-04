import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { signedAmount, type PmLedgerEntry } from '@/hooks/usePmLedger';

function fmt(n: number | null | undefined) { return `$${Number(n || 0).toFixed(2)}`; }

function parseLocalDate(s: string | null | undefined): Date {
  if (!s) return new Date(NaN);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(s);
}

function safeDate(s: string | null | undefined, pattern = 'MMMM d, yyyy') {
  const d = parseLocalDate(s);
  return isNaN(d.getTime()) ? '—' : format(d, pattern);
}

const METHOD_LABEL: Record<string, string> = {
  e_transfer: 'Interac e-Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  debit_manual: 'Debit',
  credit_card_manual: 'Credit card',
  bank_transfer_manual: 'Bank transfer',
  other: 'Other',
};

const TYPE_LABEL: Record<string, string> = {
  payment: 'Rent / account payment',
  credit: 'Account credit',
  adjustment_credit: 'Account adjustment (credit)',
  deposit: 'Security deposit',
  deposit_refund: 'Security deposit refund',
  other_credit: 'Other credit',
};

function receiptNumber(entry: { id: string; entry_date: string }) {
  const d = (entry.entry_date || '').replace(/-/g, '').slice(0, 8);
  const suffix = entry.id.replace(/[^a-f0-9]/gi, '').slice(-5).toUpperCase();
  return `PR-${d}-${suffix}`;
}

export default function RentReceiptPrint() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [entry, setEntry] = useState<PmLedgerEntry | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [unit, setUnit] = useState<any>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      const { data: e, error: entryError } = await (supabase as any)
        .from('pm_tenant_ledger').select('*').eq('id', id).maybeSingle();
      if (entryError || !e) {
        setError(entryError?.message || 'Receipt not found or not shared with you.');
        setLoading(false);
        return;
      }
      setEntry(e as PmLedgerEntry);

      const [{ data: t }, { data: p }, { data: u }, { data: allEntries }] = await Promise.all([
        (supabase as any).from('pm_tenants').select('*').eq('id', e.tenant_id).maybeSingle(),
        e.property_id
          ? (supabase as any).from('pm_managed_properties').select('*').eq('id', e.property_id).maybeSingle()
          : Promise.resolve({ data: null }),
        e.unit_id
          ? (supabase as any).from('pm_units').select('*').eq('id', e.unit_id).maybeSingle()
          : Promise.resolve({ data: null }),
        (supabase as any).from('pm_tenant_ledger').select('*').eq('tenant_id', e.tenant_id),
      ]);

      setTenant(t ?? null);
      setProperty(p ?? null);
      setUnit(u ?? null);

      if (Array.isArray(allEntries)) {
        const upTo = allEntries.filter((row: PmLedgerEntry) =>
          row.entry_date < e.entry_date
          || (row.entry_date === e.entry_date && row.created_at <= e.created_at));
        setBalanceAfter(upTo.reduce((s: number, r: PmLedgerEntry) => s + signedAmount(r), 0));
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!loading && entry && searchParams.get('print') === '1') {
      const handle = window.setTimeout(() => window.print(), 350);
      return () => window.clearTimeout(handle);
    }
  }, [loading, searchParams, entry]);

  if (loading) return <div className="min-h-screen bg-white text-black p-8">Loading receipt…</div>;

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-white text-black p-6">
        <div className="max-w-xl mx-auto border border-red-200 bg-red-50 p-4 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Could not open this receipt</p>
            <p className="text-sm text-red-800">{error || 'Please sign in and try again.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const tenantName = tenant
    ? (tenant.tenant_type === 'business' && tenant.business_name
      ? tenant.business_name
      : `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim())
    : 'Tenant';

  const propertyLine = property
    ? [property.address_line_1, property.city, property.province, property.postal_code]
      .filter(Boolean).join(', ')
    : null;

  const isVoid = ['reversed', 'cancelled', 'waived', 'nsf'].includes(entry.status);

  return (
    <div className="min-h-screen bg-white text-black p-4 sm:p-8 print:p-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 justify-end mb-4 print:hidden">
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Save as PDF
          </Button>
        </div>

        {/* Header */}
        <div
          className="rounded-lg p-5 sm:p-8 mb-6 flex flex-col sm:flex-row items-center gap-4 text-white"
          style={{ background: '#0F172A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
        >
          <img src="/praetoria-logo-white.png" alt="Praetoria Group" className="h-16 w-auto shrink-0" />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Praetoria Group</h1>
            <p className="text-sm text-white/95 mt-2">Head Office: 2282 Unit B, Toronto Street, Regina, Saskatchewan</p>
            <p className="text-sm text-white/95">Email: support@praetoriagroup.ca • Web: praetoriagroup.ca</p>
            <h2 className="text-lg font-bold mt-4 inline-block bg-white text-[#0F172A] px-4 py-1.5 rounded">
              Rent / Payment Receipt
            </h2>
          </div>
        </div>

        {isVoid && (
          <div className="mb-5 border-2 border-rose-300 bg-rose-50 text-rose-900 rounded p-3 text-sm font-semibold text-center uppercase">
            This payment is {entry.status.replace('_', ' ')} — receipt is not valid
          </div>
        )}

        {/* Parties */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-600 text-xs uppercase">Received from</p>
            <p className="font-bold text-lg">{tenantName}</p>
            {tenant?.email && <p>Email: {tenant.email}</p>}
            {tenant?.phone && <p>Phone: {tenant.phone}</p>}
            {property && (
              <>
                <p className="text-gray-600 text-xs uppercase mt-3">Rental property</p>
                <p className="font-semibold">{property.property_name}{unit?.unit_label ? ` — Unit ${unit.unit_label}` : ''}</p>
                {propertyLine && <p>{propertyLine}</p>}
              </>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-gray-600 text-xs uppercase">Receipt #</p>
            <p className="font-mono font-bold">{receiptNumber(entry)}</p>
            <p className="text-gray-600 text-xs uppercase mt-2">Payment date</p>
            <p className="font-semibold">{safeDate(entry.paid_date || entry.entry_date)}</p>
            <p className="text-gray-600 text-xs uppercase mt-2">Payment method</p>
            <p className="font-semibold">
              {entry.payment_method ? (METHOD_LABEL[entry.payment_method] ?? entry.payment_method) : '—'}
            </p>
            {entry.reference && (
              <>
                <p className="text-gray-600 text-xs uppercase mt-2">Reference / transaction #</p>
                <p className="font-mono">{entry.reference}</p>
              </>
            )}
          </div>
        </div>

        {/* Detail table */}
        <table className="w-full border-collapse text-sm mb-6">
          <thead>
            <tr className="text-white" style={{ background: '#0F172A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Description</th>
              <th className="text-left p-2">Period covered</th>
              <th className="text-right p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 align-top">
              <td className="p-2">{safeDate(entry.entry_date, 'MMM d, yyyy')}</td>
              <td className="p-2">
                <span className="font-semibold">{TYPE_LABEL[entry.type] ?? entry.type.replace('_', ' ')}</span>
                {entry.description && <div className="text-xs text-gray-700 mt-1">{entry.description}</div>}
                {entry.tenant_note && <div className="text-xs text-gray-700 mt-1 italic">{entry.tenant_note}</div>}
              </td>
              <td className="p-2">
                {entry.period_start
                  ? `${safeDate(entry.period_start, 'MMM d, yyyy')} – ${entry.period_end ? safeDate(entry.period_end, 'MMM d, yyyy') : ''}`
                  : '—'}
              </td>
              <td className="p-2 text-right font-bold">{fmt(entry.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-full sm:w-80 border border-gray-300 rounded">
            <div
              className="flex justify-between px-3 py-2 text-white font-bold"
              style={{ background: '#0F172A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <span>Amount received</span>
              <span>{fmt(entry.amount)}</span>
            </div>
            {balanceAfter !== null && (
              <div className="flex justify-between px-3 py-2 text-sm">
                <span className="text-gray-700">Account balance after this payment</span>
                <span className="font-semibold">{fmt(balanceAfter)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-300 pt-4 text-xs text-gray-700 space-y-1">
          <p className="font-semibold text-black">Thank you for your payment.</p>
          <p>
            This receipt confirms the payment recorded above on the tenant account. Balances shown are
            as of the date this receipt was generated. Please retain this receipt for your records.
          </p>
          <p>Questions about this receipt? Contact support@praetoriagroup.ca.</p>
          <p className="pt-2">Generated {format(new Date(), 'MMMM d, yyyy')} • Praetoria Group Property Management</p>
        </div>
      </div>
    </div>
  );
}
