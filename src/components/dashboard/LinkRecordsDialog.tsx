import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Plus, X, FileText, Receipt, Search, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type RevenueSource = 'auto' | 'invoices' | 'quotes' | 'manual';

interface Props {
  jobId: string | null;
  jobNumber?: string;
  jobTitle?: string;
  customerId?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface Link {
  id: string;
  job_id: string;
  kind: 'quote' | 'invoice';
  target_id: string;
  action: 'include' | 'exclude';
}

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function LinkRecordsDialog({
  jobId, jobNumber, jobTitle, customerId, open, onOpenChange,
}: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'invoices' | 'quotes'>('invoices');
  const [revenueSource, setRevenueSource] = useState<RevenueSource>('auto');
  const [manualRevenue, setManualRevenue] = useState<number>(0);
  const [savingMeta, setSavingMeta] = useState(false);

  // Auto-linked records (from FK columns)
  const { data: autoLinked } = useQuery({
    enabled: !!jobId && open,
    queryKey: ['link-auto', jobId],
    queryFn: async () => {
      const [qRes, iRes, jobRes] = await Promise.all([
        supabase.from('quotes').select('id, quote_number')
          .eq('converted_job_id', jobId!),
        supabase.from('invoices').select('id, invoice_number')
          .eq('job_id', jobId!),
        supabase.from('jobs').select('quote_id').eq('id', jobId!).maybeSingle(),
      ]);
      const autoQuoteIds = new Set((qRes.data ?? []).map((q: any) => q.id));
      if (jobRes.data?.quote_id) autoQuoteIds.add(jobRes.data.quote_id);
      const autoInvoiceIds = new Set((iRes.data ?? []).map((i: any) => i.id));
      return { autoQuoteIds, autoInvoiceIds };
    },
  });

  // Manual links
  const { data: links = [] } = useQuery({
    enabled: !!jobId && open,
    queryKey: ['job-cost-links', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_cost_links')
        .select('*')
        .eq('job_id', jobId!);
      if (error) throw error;
      return (data ?? []) as Link[];
    },
  });

  // Search candidates (default scope: same customer; or by search term across system)
  const { data: candidates, isLoading: loadingCandidates } = useQuery({
    enabled: !!jobId && open,
    queryKey: ['link-candidates', jobId, customerId, search],
    queryFn: async () => {
      const term = search.trim();
      const invoiceQuery = supabase
        .from('invoices')
        .select('id, invoice_number, total, amount_paid, status, issue_date, customer_id, job_id, customers(company_name, first_name, last_name)')
        .order('issue_date', { ascending: false })
        .limit(50);
      const quoteQuery = supabase
        .from('quotes')
        .select('id, quote_number, total, approval_status, sent_status, issue_date, customer_id, converted_job_id, customers(company_name, first_name, last_name)')
        .order('issue_date', { ascending: false })
        .limit(50);

      if (term) {
        invoiceQuery.ilike('invoice_number', `%${term}%`);
        quoteQuery.ilike('quote_number', `%${term}%`);
      } else if (customerId) {
        invoiceQuery.eq('customer_id', customerId);
        quoteQuery.eq('customer_id', customerId);
      }
      const [iRes, qRes] = await Promise.all([invoiceQuery, quoteQuery]);
      return { invoices: iRes.data ?? [], quotes: qRes.data ?? [] };
    },
  });

  // Meta for revenue source
  const { data: metaData } = useQuery({
    enabled: !!jobId && open,
    queryKey: ['job-cost-meta-link', jobId],
    queryFn: async () => {
      const { data } = await supabase
        .from('job_cost_meta')
        .select('id, revenue_source, manual_revenue')
        .eq('job_id', jobId!)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (metaData) {
      setRevenueSource(((metaData as any).revenue_source as RevenueSource) ?? 'auto');
      setManualRevenue(Number((metaData as any).manual_revenue) || 0);
    } else {
      setRevenueSource('auto');
      setManualRevenue(0);
    }
  }, [metaData, jobId]);

  // Resolved final lists (auto + include - exclude)
  const linked = useMemo(() => {
    const autoQ = autoLinked?.autoQuoteIds ?? new Set<string>();
    const autoI = autoLinked?.autoInvoiceIds ?? new Set<string>();
    const finalQ = new Set<string>(autoQ);
    const finalI = new Set<string>(autoI);
    links.forEach(l => {
      if (l.kind === 'quote') {
        if (l.action === 'include') finalQ.add(l.target_id);
        else finalQ.delete(l.target_id);
      } else {
        if (l.action === 'include') finalI.add(l.target_id);
        else finalI.delete(l.target_id);
      }
    });
    return { finalQ, finalI };
  }, [autoLinked, links]);

  async function toggleLink(kind: 'quote' | 'invoice', target_id: string, isAuto: boolean, currentlyLinked: boolean) {
    if (!jobId) return;
    const existing = links.find(l => l.kind === kind && l.target_id === target_id);
    if (currentlyLinked) {
      // Remove (exclude)
      if (isAuto) {
        // need an explicit exclude row
        if (existing) {
          const { error } = await supabase
            .from('job_cost_links').update({ action: 'exclude' }).eq('id', existing.id);
          if (error) return toast.error(error.message);
        } else {
          const { error } = await supabase
            .from('job_cost_links').insert({ job_id: jobId, kind, target_id, action: 'exclude' });
          if (error) return toast.error(error.message);
        }
      } else {
        if (existing) {
          const { error } = await supabase
            .from('job_cost_links').delete().eq('id', existing.id);
          if (error) return toast.error(error.message);
        }
      }
      toast.success(`Removed ${kind}`);
    } else {
      // Add (include)
      if (existing) {
        const { error } = await supabase
          .from('job_cost_links').update({ action: 'include' }).eq('id', existing.id);
        if (error) return toast.error(error.message);
      } else {
        const { error } = await supabase
          .from('job_cost_links').insert({ job_id: jobId, kind, target_id, action: 'include' });
        if (error) return toast.error(error.message);
      }
      toast.success(`Linked ${kind}`);
    }
    qc.invalidateQueries({ queryKey: ['job-cost-links', jobId] });
    qc.invalidateQueries({ queryKey: ['job-cost-profit-tracker'] });
  }

  async function saveRevenueSource() {
    if (!jobId) return;
    setSavingMeta(true);
    const { error } = await supabase
      .from('job_cost_meta')
      .upsert({
        job_id: jobId,
        revenue_source: revenueSource,
        manual_revenue: manualRevenue,
      } as any, { onConflict: 'job_id' });
    setSavingMeta(false);
    if (error) return toast.error(error.message);
    toast.success('Revenue source saved');
    qc.invalidateQueries({ queryKey: ['job-cost-meta-link', jobId] });
    qc.invalidateQueries({ queryKey: ['job-cost-profit-tracker'] });
  }

  const list = tab === 'invoices' ? (candidates?.invoices ?? []) : (candidates?.quotes ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Records {jobNumber && <span className="font-mono text-primary">{jobNumber}</span>}</DialogTitle>
          <DialogDescription className="text-xs">
            Manually attach or remove quotes and invoices for <span className="font-medium">{jobTitle || 'this job'}</span>.
            Multiple invoices and quotes can be linked to a single job.
          </DialogDescription>
        </DialogHeader>

        {/* Revenue source */}
        <section className="rounded-lg border p-3 bg-muted/30 space-y-2">
          <h3 className="text-sm font-bold">Revenue calculation</h3>
          <div className="flex flex-wrap gap-1.5">
            {([
              { v: 'auto' as const, label: 'Auto (invoice → quote → estimate)' },
              { v: 'invoices' as const, label: 'Sum of linked invoices' },
              { v: 'quotes' as const, label: 'Sum of linked quotes' },
              { v: 'manual' as const, label: 'Manual revenue' },
            ]).map(opt => (
              <Button key={opt.v} size="sm" variant={revenueSource === opt.v ? 'default' : 'outline'}
                className="h-7 text-[11px] px-2"
                onClick={() => setRevenueSource(opt.v)}>
                {opt.label}
              </Button>
            ))}
          </div>
          {revenueSource === 'manual' && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Manual revenue ($)</Label>
              <Input type="number" step="0.01" value={manualRevenue || ''}
                onChange={e => setManualRevenue(parseFloat(e.target.value) || 0)} />
            </div>
          )}
          <Button size="sm" onClick={saveRevenueSource} disabled={savingMeta} className="w-full">
            {savingMeta && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Save revenue source
          </Button>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button onClick={() => setTab('invoices')}
            className={cn('px-3 py-1.5 text-xs font-semibold border-b-2',
              tab === 'invoices' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
            <Receipt className="h-3 w-3 inline mr-1" />
            Invoices ({linked.finalI.size} linked{search.trim() ? ` · ${candidates?.invoices.length ?? 0} match` : ''})
          </button>
          <button onClick={() => setTab('quotes')}
            className={cn('px-3 py-1.5 text-xs font-semibold border-b-2',
              tab === 'quotes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}>
            <FileText className="h-3 w-3 inline mr-1" />
            Quotes ({linked.finalQ.size} linked{search.trim() ? ` · ${candidates?.quotes.length ?? 0} match` : ''})
          </button>
        </div>
        {search.trim() && tab === 'invoices' && (candidates?.invoices.length ?? 0) === 0 && (candidates?.quotes.length ?? 0) > 0 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            No invoices match "{search.trim()}", but {candidates?.quotes.length} quote(s) do.{' '}
            <button className="underline font-semibold" onClick={() => setTab('quotes')}>Switch to Quotes →</button>
          </p>
        )}
        {search.trim() && tab === 'quotes' && (candidates?.quotes.length ?? 0) === 0 && (candidates?.invoices.length ?? 0) > 0 && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            No quotes match "{search.trim()}", but {candidates?.invoices.length} invoice(s) do.{' '}
            <button className="underline font-semibold" onClick={() => setTab('invoices')}>Switch to Invoices →</button>
          </p>
        )}

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tab} by number, customer, project…`}
            className="h-8 pl-7 text-xs" />
        </div>
        <p className="text-[10px] text-muted-foreground -mt-2">
          {search.trim() ? 'Searching all records.' : customerId ? 'Showing records for this customer.' : 'Type to search.'}
        </p>

        <ScrollArea className="max-h-[340px] border rounded">
          {loadingCandidates ? (
            <p className="text-xs p-4 text-muted-foreground text-center">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-xs p-4 text-muted-foreground text-center">No {tab} found.</p>
          ) : (
            <div className="divide-y">
              {list.map((r: any) => {
                const id = r.id;
                const number = tab === 'invoices' ? r.invoice_number : r.quote_number;
                const isAuto = tab === 'invoices' ? (autoLinked?.autoInvoiceIds?.has(id) ?? false) : (autoLinked?.autoQuoteIds?.has(id) ?? false);
                const isLinked = tab === 'invoices' ? linked.finalI.has(id) : linked.finalQ.has(id);
                const cust = r.customers;
                const custName = cust?.company_name || `${cust?.first_name ?? ''} ${cust?.last_name ?? ''}`.trim() || '—';
                const belongsToOtherJob = tab === 'invoices' ? (r.job_id && r.job_id !== jobId) : (r.converted_job_id && r.converted_job_id !== jobId);
                return (
                  <div key={id} className="flex items-center justify-between p-2.5 gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-primary">{number}</span>
                        <span className="tabular-nums">{money(r.total)}</span>
                        {isAuto && <Badge variant="outline" className="text-[9px]">Auto-linked</Badge>}
                        {belongsToOtherJob && !isAuto && (
                          <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Other job
                          </Badge>
                        )}
                        {isLinked && <Badge className="text-[9px] bg-emerald-600"><Check className="h-2.5 w-2.5 mr-0.5" />Linked</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{custName} · {r.issue_date ?? '—'}</p>
                    </div>
                    <Button size="sm" variant={isLinked ? 'outline' : 'default'}
                      className="h-7 text-[11px] px-2"
                      onClick={() => toggleLink(tab === 'invoices' ? 'invoice' : 'quote', id, isAuto, isLinked)}>
                      {isLinked ? <><X className="h-3 w-3 mr-1" />Remove</> : <><Plus className="h-3 w-3 mr-1" />Attach</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
