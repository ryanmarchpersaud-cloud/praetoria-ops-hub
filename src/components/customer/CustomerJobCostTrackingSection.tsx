import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, FileText, Receipt, AlertTriangle, Check, DollarSign } from 'lucide-react';
import { AddToJobCostTrackerButton } from '@/components/dashboard/AddToJobCostTrackerButton';

interface Props {
  customerId: string;
}

/**
 * Customer-profile Job Cost & Profit Tracking section.
 * Shows the customer's jobs, quotes, invoices with tracker linkage status
 * and one-click "link to tracker" actions (no duplicates created).
 */
export function CustomerJobCostTrackingSection({ customerId }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const { data, isLoading } = useQuery({
    enabled: !!customerId,
    queryKey: ['customer-job-cost-tracking', customerId],
    queryFn: async () => {
      const [jobsRes, quotesRes, invoicesRes] = await Promise.all([
        supabase.from('jobs')
          .select('id, job_number, job_title, status, created_at, quote_id, service_category')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        supabase.from('quotes')
          .select('id, quote_number, total, approval_status, converted_job_id, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
        supabase.from('invoices')
          .select('id, invoice_number, total, status, job_id, created_at')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false }),
      ]);
      const jobs = jobsRes.data ?? [];
      const quotes = quotesRes.data ?? [];
      const invoices = invoicesRes.data ?? [];

      const jobIds = jobs.map((j: any) => j.id);
      const quoteIds = quotes.map((q: any) => q.id);
      const invoiceIds = invoices.map((i: any) => i.id);

      const [metaRes, linkRes] = await Promise.all([
        jobIds.length
          ? supabase.from('job_cost_meta').select('job_id, tracker_override').in('job_id', jobIds)
          : Promise.resolve({ data: [] as any[] } as any),
        jobIds.length
          ? supabase.from('job_cost_links').select('job_id, kind, target_id, action').in('job_id', jobIds)
          : Promise.resolve({ data: [] as any[] } as any),
      ]);

      const trackedJobIds = new Set(
        (metaRes.data ?? [])
          .filter((m: any) => m.tracker_override !== 'exclude')
          .map((m: any) => m.job_id),
      );
      const excludedJobIds = new Set(
        (metaRes.data ?? [])
          .filter((m: any) => m.tracker_override === 'exclude')
          .map((m: any) => m.job_id),
      );

      // Quote → job and Invoice → job manual link maps
      const quoteLinkJob = new Map<string, string>(); // quoteId → jobId
      const invoiceLinkJob = new Map<string, string>();
      (linkRes.data ?? []).forEach((l: any) => {
        if (l.action !== 'include') return;
        if (l.kind === 'quote') quoteLinkJob.set(l.target_id, l.job_id);
        if (l.kind === 'invoice') invoiceLinkJob.set(l.target_id, l.job_id);
      });

      const jobById = new Map(jobs.map((j: any) => [j.id, j]));

      return { jobs, quotes, invoices, trackedJobIds, excludedJobIds, quoteLinkJob, invoiceLinkJob, jobById };
    },
    staleTime: 10_000,
  });

  const warnings = useMemo(() => {
    if (!data) return [] as { kind: string; msg: string }[];
    const w: { kind: string; msg: string }[] = [];
    data.quotes.forEach((q: any) => {
      const linkedJobId = q.converted_job_id || data.quoteLinkJob.get(q.id);
      const tracked = linkedJobId && data.trackedJobIds.has(linkedJobId);
      if (!linkedJobId) w.push({ kind: 'quote', msg: `Quote ${q.quote_number} — no linked job (create from quote?)` });
      else if (!tracked) w.push({ kind: 'quote', msg: `Quote ${q.quote_number} → job not in tracker` });
    });
    data.invoices.forEach((i: any) => {
      const linkedJobId = i.job_id || data.invoiceLinkJob.get(i.id);
      const tracked = linkedJobId && data.trackedJobIds.has(linkedJobId);
      if (!linkedJobId) w.push({ kind: 'invoice', msg: `Invoice ${i.invoice_number} — no linked job` });
      else if (!tracked) w.push({ kind: 'invoice', msg: `Invoice ${i.invoice_number} → job not in tracker` });
    });
    data.jobs.forEach((j: any) => {
      if (!data.trackedJobIds.has(j.id) && !data.excludedJobIds.has(j.id)) {
        w.push({ kind: 'job', msg: `Job ${j.job_number} — not yet tracked` });
      }
    });
    return w;
  }, [data]);

  if (!customerId) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          Job Cost &amp; Profit Tracking
          {data && (
            <Badge variant="outline" className="ml-1 text-[10px]">
              {data.trackedJobIds.size}/{data.jobs.length} jobs tracked
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(c => !c)}>
          {collapsed ? 'Show' : 'Hide'}
        </Button>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading tracker linkage…</p>
          ) : (
            <>
              {warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> {warnings.length} warning{warnings.length === 1 ? '' : 's'}
                  </div>
                  <ul className="text-[11px] text-amber-800 space-y-0.5 max-h-32 overflow-auto">
                    {warnings.slice(0, 12).map((w, i) => (
                      <li key={i}>• {w.msg}</li>
                    ))}
                    {warnings.length > 12 && <li>…and {warnings.length - 12} more</li>}
                  </ul>
                </div>
              )}

              {/* Jobs */}
              <Section title="Jobs" icon={Briefcase} empty="No jobs yet">
                {data!.jobs.map((j: any) => {
                  const tracked = data!.trackedJobIds.has(j.id);
                  const excluded = data!.excludedJobIds.has(j.id);
                  return (
                    <Row
                      key={j.id}
                      number={j.job_number}
                      to={`/jobs/${j.id}`}
                      title={j.job_title}
                      status={tracked ? 'tracked' : excluded ? 'excluded' : 'untracked'}
                      action={
                        tracked ? (
                          <Badge className="bg-emerald-600 text-[10px]"><Check className="h-2.5 w-2.5 mr-0.5" />Tracked</Badge>
                        ) : (
                          <AddToJobCostTrackerButton jobId={j.id} label="Add to tracker" size="sm" />
                        )
                      }
                    />
                  );
                })}
              </Section>

              {/* Quotes */}
              <Section title="Quotes" icon={FileText} empty="No quotes">
                {data!.quotes.map((q: any) => {
                  const linkedJobId = q.converted_job_id || data!.quoteLinkJob.get(q.id);
                  const linkedJob = linkedJobId ? data!.jobById.get(linkedJobId) : null;
                  const tracked = linkedJobId && data!.trackedJobIds.has(linkedJobId);
                  return (
                    <Row
                      key={q.id}
                      number={q.quote_number}
                      to={`/quotes/${q.id}`}
                      title={linkedJob ? `→ ${linkedJob.job_number}` : 'No linked job'}
                      status={tracked ? 'tracked' : linkedJobId ? 'linked-untracked' : 'unlinked'}
                      action={
                        <AddToJobCostTrackerButton
                          jobId={linkedJobId ?? null}
                          sourceQuote={{
                            id: q.id,
                            quote_number: q.quote_number,
                            customer_id: customerId,
                            converted_job_id: q.converted_job_id ?? null,
                          }}
                          label={tracked ? 'Re-link' : 'Link to tracker'}
                          size="sm"
                        />
                      }
                    />
                  );
                })}
              </Section>

              {/* Invoices */}
              <Section title="Invoices" icon={Receipt} empty="No invoices">
                {data!.invoices.map((i: any) => {
                  const linkedJobId = i.job_id || data!.invoiceLinkJob.get(i.id);
                  const linkedJob = linkedJobId ? data!.jobById.get(linkedJobId) : null;
                  const tracked = linkedJobId && data!.trackedJobIds.has(linkedJobId);
                  return (
                    <Row
                      key={i.id}
                      number={i.invoice_number}
                      to={`/invoices/${i.id}`}
                      title={linkedJob ? `→ ${linkedJob.job_number}` : 'No linked job'}
                      status={tracked ? 'tracked' : linkedJobId ? 'linked-untracked' : 'unlinked'}
                      action={
                        <AddToJobCostTrackerButton
                          jobId={linkedJobId ?? null}
                          sourceInvoice={{
                            id: i.id,
                            invoice_number: i.invoice_number,
                            customer_id: customerId,
                            job_id: i.job_id ?? null,
                          }}
                          label={tracked ? 'Re-link' : 'Link to tracker'}
                          size="sm"
                        />
                      }
                    />
                  );
                })}
              </Section>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Section({
  title, icon: Icon, empty, children,
}: { title: string; icon: any; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  const hasItems = arr.filter(Boolean).length > 0;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{title}</span>
      </div>
      {hasItems ? (
        <div className="divide-y border rounded-md">{children}</div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic px-1">{empty}</p>
      )}
    </div>
  );
}

function Row({
  number, to, title, status, action,
}: {
  number: string | null;
  to: string;
  title: string;
  status: 'tracked' | 'untracked' | 'excluded' | 'linked-untracked' | 'unlinked';
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs">
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <Link to={to} className="font-mono font-semibold text-primary hover:underline">{number ?? '—'}</Link>
        <span className="truncate text-muted-foreground">{title}</span>
        {status === 'unlinked' && (
          <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700">Not linked</Badge>
        )}
        {status === 'linked-untracked' && (
          <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700">Job not tracked</Badge>
        )}
        {status === 'excluded' && (
          <Badge variant="outline" className="text-[9px]">Excluded</Badge>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
