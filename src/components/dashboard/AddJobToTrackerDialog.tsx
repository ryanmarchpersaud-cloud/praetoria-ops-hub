import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Search, Plus, Check, Briefcase, FileText, Receipt, MapPin, User, Link2, Wand2, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface SourceQuoteContext {
  id: string;
  quote_number: string | null;
  customer_id: string | null;
  converted_job_id?: string | null;
}
export interface SourceInvoiceContext {
  id: string;
  invoice_number: string | null;
  customer_id: string | null;
  job_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialSearch?: string;
  /** Pre-select a job (e.g. when opened from Job/Quote/Invoice detail pages with a known job). */
  preselectedJobId?: string | null;
  /** When opened from a quote detail page — provides context + enables auto-link. */
  sourceQuote?: SourceQuoteContext | null;
  /** When opened from an invoice detail page — provides context + enables auto-link. */
  sourceInvoice?: SourceInvoiceContext | null;
  /** Optional callback for the "Create job from this quote/invoice" action. */
  onCreateJobFromSource?: () => void;
  onAdded?: (jobId: string) => void;
}

interface JobRow {
  id: string;
  job_number: string | null;
  job_title: string | null;
  customer_id: string | null;
  customer: string;
  city: string | null;
  quoteNumbers: string[];
  invoiceNumbers: string[];
  tracked: boolean;
  excluded: boolean;
}

export function AddJobToTrackerDialog({
  open, onOpenChange, initialSearch = '', preselectedJobId = null,
  sourceQuote = null, sourceInvoice = null, onCreateJobFromSource, onAdded,
}: Props) {
  const qc = useQueryClient();
  const hasSource = !!(sourceQuote || sourceInvoice);
  const sourceCustomerId = sourceQuote?.customer_id ?? sourceInvoice?.customer_id ?? null;
  const sourceLabel = sourceQuote
    ? `Quote ${sourceQuote.quote_number ?? ''}`
    : sourceInvoice ? `Invoice ${sourceInvoice.invoice_number ?? ''}` : '';
  const [search, setSearch] = useState(hasSource ? '' : initialSearch);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    enabled: open,
    queryKey: ['add-to-tracker-jobs'],
    queryFn: async () => {
      const [jobsRes, custRes, propRes, qRes, iRes, metaRes] = await Promise.all([
        supabase.from('jobs').select('id, job_number, job_title, customer_id, property_id, quote_id, created_at')
          .order('created_at', { ascending: false }).limit(400),
        supabase.from('customers').select('id, company_name, first_name, last_name'),
        supabase.from('properties').select('id, city, address_line_1'),
        supabase.from('quotes').select('id, quote_number, converted_job_id'),
        supabase.from('invoices').select('id, invoice_number, job_id'),
        supabase.from('job_cost_meta').select('job_id, tracker_override'),
      ]);
      const customers = new Map((custRes.data ?? []).map((c: any) => [c.id, c]));
      const props = new Map((propRes.data ?? []).map((p: any) => [p.id, p]));
      const quoteByJob = new Map<string, string[]>();
      (qRes.data ?? []).forEach((q: any) => {
        if (q.converted_job_id) {
          const a = quoteByJob.get(q.converted_job_id) ?? [];
          a.push(q.quote_number); quoteByJob.set(q.converted_job_id, a);
        }
      });
      const quoteById = new Map((qRes.data ?? []).map((q: any) => [q.id, q.quote_number]));
      const invByJob = new Map<string, string[]>();
      (iRes.data ?? []).forEach((i: any) => {
        if (i.job_id) {
          const a = invByJob.get(i.job_id) ?? [];
          a.push(i.invoice_number); invByJob.set(i.job_id, a);
        }
      });
      const metaByJob = new Map((metaRes.data ?? []).map((m: any) => [m.job_id, m.tracker_override]));

      const rows: JobRow[] = (jobsRes.data ?? []).map((j: any) => {
        const c = customers.get(j.customer_id);
        const p = props.get(j.property_id);
        const customer = c?.company_name || `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim() || 'Unknown';
        const qNums = [...(quoteByJob.get(j.id) ?? [])];
        if (j.quote_id && quoteById.has(j.quote_id)) {
          const n = quoteById.get(j.quote_id)!;
          if (!qNums.includes(n)) qNums.push(n);
        }
        const ov = metaByJob.get(j.id);
        return {
          id: j.id,
          job_number: j.job_number,
          job_title: j.job_title,
          customer_id: j.customer_id,
          customer,
          city: p?.city ?? p?.address_line_1 ?? null,
          quoteNumbers: qNums,
          invoiceNumbers: invByJob.get(j.id) ?? [],
          tracked: ov === 'include',
          excluded: ov === 'exclude',
        };
      });
      return rows;
    },
    staleTime: 15_000,
  });

  // Existing manual link for this source (if any)
  const { data: existingLink } = useQuery({
    enabled: open && hasSource,
    queryKey: ['source-link', sourceQuote?.id ?? sourceInvoice?.id],
    queryFn: async () => {
      const target_id = sourceQuote?.id ?? sourceInvoice?.id;
      const kind = sourceQuote ? 'quote' : 'invoice';
      if (!target_id) return null;
      const { data } = await supabase
        .from('job_cost_links')
        .select('job_id, action')
        .eq('kind', kind)
        .eq('target_id', target_id)
        .eq('action', 'include')
        .maybeSingle();
      return data;
    },
  });

  // Already-linked job for the source (FK or manual link)
  const linkedJobId =
    sourceQuote?.converted_job_id ??
    sourceInvoice?.job_id ??
    (existingLink as any)?.job_id ??
    null;
  const linkedJob = useMemo(
    () => (linkedJobId ? (data ?? []).find(r => r.id === linkedJobId) ?? null : null),
    [linkedJobId, data],
  );

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();

    // When invoked from a source record, default to same-customer jobs and put preselected/linked on top.
    let r = rows;
    if (hasSource && !q && sourceCustomerId) {
      r = rows.filter(x => x.customer_id === sourceCustomerId);
    }

    const pinId = preselectedJobId ?? linkedJobId ?? null;
    if (pinId) {
      const pre = r.find(x => x.id === pinId) ?? rows.find(x => x.id === pinId);
      const rest = r.filter(x => x.id !== pinId);
      r = pre ? [pre, ...rest] : rest;
    }

    if (!q) return r.slice(0, 60);
    return rows.filter(x =>
      (x.job_number ?? '').toLowerCase().includes(q) ||
      (x.job_title ?? '').toLowerCase().includes(q) ||
      x.customer.toLowerCase().includes(q) ||
      (x.city ?? '').toLowerCase().includes(q) ||
      x.quoteNumbers.some(n => (n ?? '').toLowerCase().includes(q)) ||
      x.invoiceNumbers.some(n => (n ?? '').toLowerCase().includes(q)),
    ).slice(0, 80);
  }, [data, search, preselectedJobId, hasSource, sourceCustomerId, linkedJobId]);

  async function include(jobId: string) {
    setBusyId(jobId);
    try {
      // 1) Flag the job for the tracker
      const { error: metaErr } = await supabase
        .from('job_cost_meta')
        .upsert({ job_id: jobId, tracker_override: 'include' }, { onConflict: 'job_id' });
      if (metaErr) throw metaErr;

      // 2) If invoked from a quote/invoice, also create the manual link so revenue rolls up
      if (sourceQuote?.id) {
        await supabase.from('job_cost_links').upsert(
          { job_id: jobId, kind: 'quote', target_id: sourceQuote.id, action: 'include' } as any,
          { onConflict: 'job_id,kind,target_id' } as any,
        );
      }
      if (sourceInvoice?.id) {
        await supabase.from('job_cost_links').upsert(
          { job_id: jobId, kind: 'invoice', target_id: sourceInvoice.id, action: 'include' } as any,
          { onConflict: 'job_id,kind,target_id' } as any,
        );
      }

      toast.success(
        hasSource ? `Linked ${sourceLabel} to tracker job` : 'Added to Job Cost Tracker',
      );
      qc.invalidateQueries({ queryKey: ['job-cost-profit-tracker'] });
      qc.invalidateQueries({ queryKey: ['add-to-tracker-jobs'] });
      qc.invalidateQueries({ queryKey: ['job-cost-links', jobId] });
      qc.invalidateQueries({ queryKey: ['source-link'] });
      onAdded?.(jobId);
    } catch (e: any) {
      // Fallback: a unique index may not exist on (job_id,kind,target_id) — best-effort insert.
      if (sourceQuote?.id || sourceInvoice?.id) {
        await supabase.from('job_cost_links').insert({
          job_id: jobId,
          kind: sourceQuote ? 'quote' : 'invoice',
          target_id: (sourceQuote?.id ?? sourceInvoice?.id)!,
          action: 'include',
        } as any);
      }
      toast.error(e?.message || 'Could not link record');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasSource ? <Link2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {hasSource ? `Link ${sourceLabel} to Job Cost Tracker` : 'Add Job to Cost & Profit Tracker'}
          </DialogTitle>
          <DialogDescription>
            {hasSource
              ? 'Pick the tracker job this record belongs to. Same-customer jobs are listed first.'
              : 'Search by job number, customer, quote #, invoice #, project name, or city. Only links existing records — no duplicates are created.'}
          </DialogDescription>
        </DialogHeader>

        {hasSource && (
          <div className="rounded-md border bg-muted/40 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {sourceQuote
                ? <FileText className="h-4 w-4 text-blue-600" />
                : <Receipt className="h-4 w-4 text-emerald-600" />}
              <span className="font-semibold">Current {sourceQuote ? 'Quote' : 'Invoice'}:</span>
              <span className="font-mono font-bold">{sourceQuote?.quote_number ?? sourceInvoice?.invoice_number}</span>
              {linkedJob ? (
                <Badge className="bg-emerald-600">
                  <Check className="h-3 w-3 mr-1" /> Already linked → {linkedJob.job_number}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  <AlertCircle className="h-3 w-3 mr-1" /> Not linked
                </Badge>
              )}
            </div>
            {!linkedJob && onCreateJobFromSource && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">No matching job yet?</span>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => { onOpenChange(false); onCreateJobFromSource(); }}>
                  <Wand2 className="h-3 w-3 mr-1" /> Create job from this {sourceQuote ? 'quote' : 'invoice'}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder={hasSource
              ? 'Search all jobs by number, customer, address…'
              : 'Search jobs, customers, quotes, invoices, addresses…'}
            className="pl-8" />
        </div>

        <ScrollArea className="max-h-[420px] -mx-2 px-2">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading jobs…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground space-y-2">
              <p>No jobs match{hasSource ? ' for this customer' : ' your search'}.</p>
              {hasSource && onCreateJobFromSource && (
                <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onCreateJobFromSource(); }}>
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" /> Create job from this {sourceQuote ? 'quote' : 'invoice'}
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(j => {
                const isPossibleMatch = hasSource && sourceCustomerId && j.customer_id === sourceCustomerId;
                const isLinkedSrc = linkedJobId === j.id;
                return (
                  <li key={j.id} className="py-2.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono font-semibold text-sm">{j.job_number ?? '—'}</span>
                        <span className="text-sm truncate">{j.job_title}</span>
                        {isLinkedSrc && (
                          <Badge className="text-[10px] bg-emerald-600">
                            <Check className="h-2.5 w-2.5 mr-0.5" />Linked to this {sourceQuote ? 'quote' : 'invoice'}
                          </Badge>
                        )}
                        {!isLinkedSrc && isPossibleMatch && (
                          <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">
                            Possible match
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{j.customer}</span>
                        {j.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{j.city}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {j.quoteNumbers.map(n => (
                          <span key={`q-${n}`} className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700">
                            <FileText className="h-2.5 w-2.5" />{n}
                          </span>
                        ))}
                        {j.invoiceNumbers.map(n => (
                          <span key={`i-${n}`} className="inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
                            <Receipt className="h-2.5 w-2.5" />{n}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isLinkedSrc ? (
                        <Button size="sm" variant="outline" disabled className={cn('h-8 text-xs')}>
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Linked
                        </Button>
                      ) : j.tracked && !j.excluded && !hasSource ? (
                        <Button size="sm" variant="outline" disabled className={cn('h-8 text-xs')}>
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Already tracked
                        </Button>
                      ) : (
                        <Button size="sm" className="h-8 text-xs" disabled={busyId === j.id}
                          onClick={() => include(j.id)}>
                          {busyId === j.id
                            ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            : hasSource ? <Link2 className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                          {hasSource
                            ? `Link ${sourceQuote ? 'quote' : 'invoice'} to this job`
                            : (j.excluded ? 'Re-include' : 'Add to tracker')}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
