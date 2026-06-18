import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Printer, X, FileText, Receipt, Loader2 } from 'lucide-react';

export type PreviewTarget =
  | { kind: 'quote'; id: string; number: string }
  | { kind: 'invoice'; id: string; number: string }
  | null;

const money = (n: number | null | undefined) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function JobLinkPreviewDialog({
  target, onClose,
}: { target: PreviewTarget; onClose: () => void }) {
  const open = !!target;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState<string>('');

  useEffect(() => {
    if (!target) { setData(null); setLineItems([]); setCustomerName(''); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (target.kind === 'quote') {
          const { data: q } = await supabase.from('quotes').select('*').eq('id', target.id).maybeSingle();
          const { data: items } = await supabase.from('quote_line_items')
            .select('id, description, quantity, unit_price, line_total')
            .eq('quote_id', target.id).order('created_at', { ascending: true });
          let name = '';
          if (q?.customer_id) {
            const { data: c } = await supabase.from('customers')
              .select('company_name, first_name, last_name').eq('id', q.customer_id).maybeSingle();
            name = c?.company_name || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim();
          }
          if (!cancelled) { setData(q); setLineItems(items ?? []); setCustomerName(name); }
        } else {
          const { data: inv } = await supabase.from('invoices').select('*').eq('id', target.id).maybeSingle();
          const { data: items } = await supabase.from('invoice_line_items')
            .select('id, description, quantity, unit_price, line_total')
            .eq('invoice_id', target.id).order('created_at', { ascending: true });
          let name = '';
          if (inv?.customer_id) {
            const { data: c } = await supabase.from('customers')
              .select('company_name, first_name, last_name').eq('id', inv.customer_id).maybeSingle();
            name = c?.company_name || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim();
          }
          if (!cancelled) { setData(inv); setLineItems(items ?? []); setCustomerName(name); }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [target]);

  if (!target) return null;

  const isQuote = target.kind === 'quote';
  const fullPath = isQuote ? `/quotes/${target.id}` : `/invoices/${target.id}`;
  const printPath = isQuote ? `/quotes/${target.id}/print` : `/invoices/${target.id}/print`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isQuote ? <FileText className="h-5 w-5 text-blue-600" /> : <Receipt className="h-5 w-5 text-emerald-600" />}
            {isQuote ? 'Quote' : 'Invoice'} {target.number}
          </DialogTitle>
          <DialogDescription>
            Quick preview — your Job Cost &amp; Profit Tracker stays open in the background.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            This {isQuote ? 'quote' : 'invoice'} could not be loaded.
          </p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Customer</p>
                <p className="font-medium">{customerName || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold">Status</p>
                <Badge variant="outline" className="text-xs">
                  {isQuote ? (data.approval_status || data.sent_status || 'Draft') : (data.status || 'Draft')}
                </Badge>
              </div>
              {!isQuote && (
                <>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Issue date</p>
                    <p>{data.issue_date ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Due date</p>
                    <p>{data.due_date ?? '—'}</p>
                  </div>
                </>
              )}
              {isQuote && data.scope_of_work && (
                <div className="col-span-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">Scope</p>
                  <p className="whitespace-pre-wrap text-xs">{data.scope_of_work}</p>
                </div>
              )}
            </div>

            <div className="border rounded-md">
              <div className="grid grid-cols-[1fr_60px_90px_90px] gap-2 px-3 py-2 text-[10px] uppercase text-muted-foreground font-semibold border-b bg-muted/30">
                <div>Description</div>
                <div className="text-right">Qty</div>
                <div className="text-right">Unit</div>
                <div className="text-right">Total</div>
              </div>
              {lineItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 px-3">No line items.</p>
              ) : (
                lineItems.map((li) => (
                  <div key={li.id} className="grid grid-cols-[1fr_60px_90px_90px] gap-2 px-3 py-2 text-xs border-b last:border-b-0">
                    <div className="truncate">{li.description || '—'}</div>
                    <div className="text-right tabular-nums">{li.quantity}</div>
                    <div className="text-right tabular-nums">{money(li.unit_price)}</div>
                    <div className="text-right tabular-nums font-medium">{money(li.line_total)}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{money(data.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{money(data.tax)}</span></div>
                <div className="flex justify-between font-bold text-sm border-t pt-1"><span>Total</span><span className="tabular-nums">{money(data.total)}</span></div>
                {!isQuote && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="tabular-nums">{money(data.amount_paid)}</span></div>
                    <div className="flex justify-between font-semibold"><span>Balance</span><span className="tabular-nums">{money(data.balance_due)}</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link to={printPath} target="_blank" rel="noopener">
              <Printer className="h-3.5 w-3.5 mr-1" /> Download PDF
            </Link>
          </Button>
          <Button variant="default" size="sm" asChild>
            <Link to={fullPath}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open Full {isQuote ? 'Quote' : 'Invoice'}
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-3.5 w-3.5 mr-1" /> Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
