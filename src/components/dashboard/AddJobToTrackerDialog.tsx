import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Plus, Check, Briefcase, FileText, Receipt, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialSearch?: string;
  /** Pre-select a job (e.g. when opened from Job/Quote/Invoice detail pages with a known job). */
  preselectedJobId?: string | null;
  onAdded?: (jobId: string) => void;
}

interface JobRow {
  id: string;
  job_number: string | null;
  job_title: string | null;
  customer: string;
  city: string | null;
  quoteNumbers: string[];
  invoiceNumbers: string[];
  tracked: boolean; // override === 'include' OR has any meta entry
  excluded: boolean; // override === 'exclude'
}

export function AddJobToTrackerDialog({
  open, onOpenChange, initialSearch = '', preselectedJobId = null, onAdded,
}: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState(initialSearch);
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

  const filtered = useMemo(() => {
    const rows = data ?? [];
    let r = rows;
    if (preselectedJobId) {
      const pre = rows.find(x => x.id === preselectedJobId);
      const rest = rows.filter(x => x.id !== preselectedJobId);
      r = pre ? [pre, ...rest] : rest;
    }
    const q = search.trim().toLowerCase();
    if (!q) return r.slice(0, 60);
    return r.filter(x =>
      (x.job_number ?? '').toLowerCase().includes(q) ||
      (x.job_title ?? '').toLowerCase().includes(q) ||
      x.customer.toLowerCase().includes(q) ||
      (x.city ?? '').toLowerCase().includes(q) ||
      x.quoteNumbers.some(n => (n ?? '').toLowerCase().includes(q)) ||
      x.invoiceNumbers.some(n => (n ?? '').toLowerCase().includes(q)),
    ).slice(0, 80);
  }, [data, search, preselectedJobId]);

  async function include(jobId: string) {
    setBusyId(jobId);
    const { error } = await supabase
      .from('job_cost_meta')
      .upsert({ job_id: jobId, tracker_override: 'include' }, { onConflict: 'job_id' });
    setBusyId(null);
    if (error) { toast.error('Could not add: ' + error.message); return; }
    toast.success('Added to Job Cost Tracker');
    qc.invalidateQueries({ queryKey: ['job-cost-profit-tracker'] });
    qc.invalidateQueries({ queryKey: ['add-to-tracker-jobs'] });
    onAdded?.(jobId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Job to Cost &amp; Profit Tracker
          </DialogTitle>
          <DialogDescription>
            Search by job number, customer, quote #, invoice #, project name, or city. Only links existing records — no duplicates are created.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search jobs, customers, quotes, invoices, addresses…"
            className="pl-8" />
        </div>

        <ScrollArea className="max-h-[420px] -mx-2 px-2">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading jobs…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No jobs match your search.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map(j => (
                <li key={j.id} className="py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono font-semibold text-sm">{j.job_number ?? '—'}</span>
                      <span className="text-sm truncate">{j.job_title}</span>
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
                    {j.tracked && !j.excluded ? (
                      <Button size="sm" variant="outline" disabled className={cn('h-8 text-xs')}>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Already tracked
                      </Button>
                    ) : (
                      <Button size="sm" className="h-8 text-xs" disabled={busyId === j.id}
                        onClick={() => include(j.id)}>
                        {busyId === j.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                        {j.excluded ? 'Re-include' : 'Add to tracker'}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
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
