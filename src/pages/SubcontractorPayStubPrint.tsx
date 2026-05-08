import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

function fmt(n: number | null | undefined) { return `$${Number(n || 0).toFixed(2)}`; }
function parseLocalDate(s: string | null | undefined): Date {
  if (!s) return new Date(NaN);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return new Date(s);
}

export default function SubcontractorPayStubPrint() {
  const { id } = useParams<{ id: string }>();
  const [stub, setStub] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [includeInternal, setIncludeInternal] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: s } = await supabase.from('subcontractor_pay_stubs').select('*').eq('id', id).single();
      setStub(s);
      if (s) {
        const { data: it } = await supabase.from('subcontractor_pay_stub_line_items')
          .select('*').eq('pay_stub_id', id).order('work_date', { ascending: true });
        setItems(it ?? []);
        const { data: sc } = await supabase.from('subcontractors').select('*').eq('id', s.subcontractor_id).single();
        setSub(sc);
      }
    })();
  }, [id]);

  if (!stub || !sub) return <div className="p-8">Loading...</div>;

  const allConfirmed = items.length > 0 && items.every(i => i.is_confirmed);

  // Group by service type for per-service totals
  const byService: Record<string, { hours: number; total: number }> = {};
  items.forEach((it) => {
    if (it.is_mixed && Array.isArray(it.mixed_split)) {
      it.mixed_split.forEach((m: any) => {
        const k = m.service_type || 'Other';
        byService[k] = byService[k] || { hours: 0, total: 0 };
        byService[k].hours += Number(m.hours || 0);
        byService[k].total += Number(m.line_total || 0);
      });
    } else {
      const k = it.service_type || 'Other';
      byService[k] = byService[k] || { hours: 0, total: 0 };
      byService[k].hours += Number(it.hours || 0);
      byService[k].total += Number(it.line_total || 0);
    }
  });
  const totalHours = Object.values(byService).reduce((a, b) => a + b.hours, 0);

  return (
    <div className="min-h-screen bg-white text-black p-8 print:p-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-start mb-4 print:hidden">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeInternal} onChange={(e) => setIncludeInternal(e.target.checked)} />
            Include internal admin notes on PDF
          </label>
          <Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print / Save PDF</Button>
        </div>

        <div className="rounded-lg p-6 mb-6 flex items-center gap-6 text-white print:rounded-none" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
          <img src="/invoice-logo.png" alt="Praetoria Group" className="h-32 w-32 object-contain bg-white/10 rounded-lg p-2" />
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight">Praetoria Group</h1>
            <p className="text-sm opacity-90 mt-1">Head Office: 2282 Unit B, Toronto Street, Regina, Saskatchewan</p>
            <p className="text-sm opacity-90">Email: support@praetoriagroup.ca • Web: praetoriagroup.ca</p>
            <h2 className="text-lg font-semibold mt-3 inline-block bg-white text-[#0F172A] px-3 py-1 rounded">Subcontractor Pay Stub</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-600 text-xs uppercase">Subcontractor</p>
            <p className="font-bold text-lg">{sub.contact_name}</p>
            {sub.company_name && <p>{sub.company_name}</p>}
            {sub.mailing_address && <p>{sub.mailing_address}</p>}
            {sub.phone && <p>Phone: {sub.phone}</p>}
            {sub.email && <p>Email: {sub.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-xs uppercase">Pay Stub #</p>
            <p className="font-mono font-bold">{stub.pay_stub_number}</p>
            <p className="text-gray-600 text-xs uppercase mt-2">Pay Period</p>
            <p className="font-semibold">{format(parseLocalDate(stub.period_start), 'MMM d, yyyy')} – {format(parseLocalDate(stub.period_end), 'MMM d, yyyy')}</p>
            <p className="text-gray-600 text-xs uppercase mt-2">Status</p>
            <p className="font-semibold capitalize">{stub.status}</p>
          </div>
        </div>

        <table className="w-full border-collapse text-sm mb-6">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black">
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Service</th>
              <th className="text-left p-2">Time</th>
              <th className="text-right p-2">Hours</th>
              <th className="text-right p-2">Rate</th>
              <th className="text-right p-2">Total</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-gray-200 align-top">
                <td className="p-2">{format(parseLocalDate(it.work_date), 'MMM d, yyyy')}</td>
                <td className="p-2">
                  {it.service_type}
                  {it.is_mixed && Array.isArray(it.mixed_split) && (
                    <div className="text-xs text-gray-600 mt-1">
                      {it.mixed_split.map((m: any, i: number) => (
                        <div key={i}>• {m.service_type}: {m.hours}h × ${m.hourly_rate} = {fmt(m.line_total)}</div>
                      ))}
                    </div>
                  )}
                  {it.notes && <div className="text-xs text-gray-600 mt-1 italic">{it.notes}</div>}
                </td>
                <td className="p-2 text-xs">{it.start_time && it.end_time ? `${it.start_time} – ${it.end_time}` : '—'}</td>
                <td className="p-2 text-right">{it.hours ?? '—'}</td>
                <td className="p-2 text-right">{it.is_mixed ? 'split' : it.hourly_rate ? `$${Number(it.hourly_rate).toFixed(2)}` : '—'}</td>
                <td className="p-2 text-right font-semibold">{fmt(it.line_total)}</td>
                <td className="p-2 text-xs">{it.is_confirmed ? '✓ Confirmed' : 'Pending'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs uppercase font-semibold text-gray-600 mb-1">Totals by Service Type</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left p-1">Service</th>
                  <th className="text-right p-1">Hours</th>
                  <th className="text-right p-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byService).map(([svc, t]) => (
                  <tr key={svc} className="border-b border-gray-200">
                    <td className="p-1">{svc}</td>
                    <td className="p-1 text-right">{t.hours}</td>
                    <td className="p-1 text-right">{fmt(t.total)}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t border-black">
                  <td className="p-1">Total</td>
                  <td className="p-1 text-right">{totalHours}</td>
                  <td className="p-1 text-right">{fmt(stub.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Confirmed Subtotal:</span><span className="font-semibold">{fmt(stub.confirmed_subtotal)}</span></div>
            {Number(stub.pending_subtotal) > 0 && (
              <div className="flex justify-between"><span>Pending (unconfirmed):</span><span className="font-semibold text-amber-700">{fmt(stub.pending_subtotal)}</span></div>
            )}
            <div className="flex justify-between border-t-2 border-black pt-1 mt-1 text-base">
              <span className="font-bold">{allConfirmed ? 'Total Amount Owed:' : 'Provisional Total:'}</span>
              <span className="font-bold">{allConfirmed ? fmt(stub.total) : 'Pending confirmation'}</span>
            </div>
          </div>
        </div>

        {(stub.payment_date || stub.payment_method) && (
          <div className="border-t pt-3 mb-4 text-sm">
            <p className="font-semibold mb-1">Payment Details</p>
            {stub.payment_date && <p>Date: {format(parseLocalDate(stub.payment_date), 'MMM d, yyyy')}</p>}
            {stub.payment_method && <p>Method: {stub.payment_method}</p>}
          </div>
        )}

        {stub.subcontractor_notes && (
          <div className="border-t pt-3 mb-4 text-sm">
            <p className="font-semibold mb-1">Notes</p>
            <p className="whitespace-pre-wrap">{stub.subcontractor_notes}</p>
          </div>
        )}

        {includeInternal && stub.internal_notes && (
          <div className="border-t pt-3 mb-4 text-sm bg-yellow-50 p-2">
            <p className="font-semibold mb-1">Internal Admin Notes</p>
            <p className="whitespace-pre-wrap">{stub.internal_notes}</p>
          </div>
        )}

        <div className="border-t pt-4 mt-8 text-sm italic text-gray-700 text-center">
          Thank you for your hard work and dedication. At Praetoria Group, we strive to be fair to our workers and our customers, while building a sustainable company that we can all be proud of. We truly appreciate your service.
        </div>

        <div className="border-t-2 border-black pt-3 mt-4 text-xs text-center text-gray-600">
          Praetoria Group • Regina, Saskatchewan • support@praetoriagroup.ca • Generated {format(new Date(), 'MMM d, yyyy h:mm a')}
        </div>
      </div>
    </div>
  );
}
