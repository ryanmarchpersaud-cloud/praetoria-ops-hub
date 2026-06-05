import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Globe, Target, DollarSign, Clock, Award, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface Lead { id: string; lead_source?: string | null; service_type?: string | null; created_at?: string | null; status?: string | null }
interface Quote { id: string; approval_status?: string | null; total?: number | null; created_at?: string | null }
interface Invoice { id: string; total?: number | null; paid_at?: string | null; created_at?: string | null; balance_due?: number | null; status?: string | null }
interface Job { id: string; created_at?: string | null; quote_id?: string | null }

const SOURCE_COLORS: Record<string, string> = {
  Website: 'bg-blue-500',
  Google: 'bg-emerald-500',
  Facebook: 'bg-indigo-500',
  Referral: 'bg-violet-500',
  Phone: 'bg-amber-500',
  Email: 'bg-rose-500',
  Walk_in: 'bg-cyan-500',
  Other: 'bg-slate-400',
  Unknown: 'bg-slate-300',
};

function normalizeSource(s?: string | null): string {
  if (!s) return 'Unknown';
  const v = s.toLowerCase().trim();
  if (v.includes('google')) return 'Google';
  if (v.includes('facebook') || v.includes('fb') || v.includes('insta')) return 'Facebook';
  if (v.includes('refer')) return 'Referral';
  if (v.includes('web')) return 'Website';
  if (v.includes('phone') || v.includes('call')) return 'Phone';
  if (v.includes('email')) return 'Email';
  if (v.includes('walk')) return 'Walk_in';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MarketingIntelligence({
  leads, quotes, jobs, invoices, isLoading,
}: {
  leads: Lead[]; quotes: Quote[]; jobs: Job[]; invoices: Invoice[]; isLoading?: boolean;
}) {
  const [ga4Configured, setGa4Configured] = useState(false);

  useEffect(() => {
    supabase.from('company_settings').select('ga4_measurement_id').limit(1).single()
      .then(({ data }) => setGa4Configured(!!data?.ga4_measurement_id));
  }, []);

  const data = useMemo(() => {
    // Lead sources breakdown
    const sourceMap = new Map<string, number>();
    leads.forEach(l => {
      const s = normalizeSource(l.lead_source);
      sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1);
    });
    const sources = Array.from(sourceMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const totalLeads = leads.length;

    // Conversion: quote → paid
    const sentOrApproved = quotes.filter(q => ['Sent', 'Approved'].includes(q.approval_status ?? ''));
    const paidInvoices = invoices.filter(i => i.paid_at || (Number(i.balance_due ?? 0) <= 0 && i.status !== 'draft' && i.status !== 'Draft'));
    const quoteWinRate = sentOrApproved.length > 0
      ? Math.round((quotes.filter(q => q.approval_status === 'Approved').length / sentOrApproved.length) * 100)
      : 0;

    const leadToPaidRate = totalLeads > 0
      ? Math.round((paidInvoices.length / totalLeads) * 100)
      : 0;

    // Avg days lead → paid
    const paidWithDates = paidInvoices.filter(i => i.paid_at && i.created_at);
    const avgDaysToClose = paidWithDates.length > 0
      ? Math.round(paidWithDates.reduce((sum, i) => sum + differenceInDays(new Date(i.paid_at!), new Date(i.created_at!)), 0) / paidWithDates.length)
      : 0;

    // Total revenue from won deals
    const wonRevenue = paidInvoices.reduce((sum, i) => sum + Number(i.total ?? 0), 0);
    const avgDealSize = paidInvoices.length > 0 ? wonRevenue / paidInvoices.length : 0;

    // Best performing source (by lead count converted to job)
    const jobsFromQuotes = jobs.filter(j => j.quote_id).length;

    return {
      sources,
      totalLeads,
      quoteWinRate,
      leadToPaidRate,
      avgDaysToClose,
      wonRevenue,
      avgDealSize,
      jobsFromQuotes,
      paidCount: paidInvoices.length,
    };
  }, [leads, quotes, jobs, invoices]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Marketing & Conversion Intelligence</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-72 w-full" /></CardContent>
      </Card>
    );
  }

  const maxSourceCount = Math.max(...data.sources.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/30">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </span>
            Marketing & Conversion Intelligence
          </CardTitle>
          <Link to="/leads">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              View leads <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6 space-y-4">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <KpiTile
            icon={Target}
            label="Lead → Paid"
            value={`${data.leadToPaidRate}%`}
            sub={`${data.paidCount} of ${data.totalLeads} leads`}
            color="emerald"
          />
          <KpiTile
            icon={Award}
            label="Quote Win Rate"
            value={`${data.quoteWinRate}%`}
            sub="Approved / Sent"
            color="violet"
          />
          <KpiTile
            icon={DollarSign}
            label="Avg Deal Size"
            value={`$${Math.round(data.avgDealSize).toLocaleString()}`}
            sub={`$${Math.round(data.wonRevenue).toLocaleString()} total won`}
            color="amber"
          />
          <KpiTile
            icon={Clock}
            label="Avg Days to Close"
            value={`${data.avgDaysToClose}d`}
            sub="Lead → Paid invoice"
            color="blue"
          />
        </div>

        {/* Lead sources */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Lead Sources</h4>
            <span className="text-[11px] text-muted-foreground font-semibold">{data.totalLeads} total leads</span>
          </div>
          {data.sources.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No lead source data yet.</p>
          ) : (
            <div className="space-y-1.5">
              {data.sources.slice(0, 6).map(s => {
                const pct = data.totalLeads > 0 ? Math.round((s.count / data.totalLeads) * 100) : 0;
                const widthPct = Math.max((s.count / maxSourceCount) * 100, 6);
                const color = SOURCE_COLORS[s.name] ?? 'bg-slate-400';
                return (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-20 md:w-24 shrink-0 text-right text-[11px] md:text-xs font-bold text-foreground truncate">
                      {s.name === 'Walk_in' ? 'Walk-in' : s.name}
                    </div>
                    <div className="flex-1 relative h-7 bg-muted/40 rounded-md overflow-hidden">
                      <div className={cn('h-full rounded-md transition-all', color)} style={{ width: `${widthPct}%` }} />
                      <div className="absolute inset-0 flex items-center justify-between px-2">
                        <span className="text-xs font-extrabold text-white drop-shadow-sm tabular-nums">{s.count}</span>
                        <span className="text-[10px] font-bold text-foreground/80 tabular-nums">{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* GA4 setup notice */}
        <div className="rounded-lg border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 p-3">
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                Website traffic tracking — pending Google setup
              </p>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5 leading-relaxed">
                When Google's IT specialist provisions your <strong>GA4 Measurement ID</strong> and <strong>Google Ads Conversion ID</strong>,
                paste them in <Link to="/settings/integrations" className="underline font-semibold">Settings → Integrations</Link> and
                website visitors, ad clicks, and cost-per-lead will populate here automatically.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const COLOR_STYLES: Record<string, { bg: string; text: string; iconBg: string; iconText: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', iconBg: 'bg-emerald-100 dark:bg-emerald-900/40', iconText: 'text-emerald-600' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', iconBg: 'bg-violet-100 dark:bg-violet-900/40', iconText: 'text-violet-600' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', iconBg: 'bg-amber-100 dark:bg-amber-900/40', iconText: 'text-amber-600' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', iconBg: 'bg-blue-100 dark:bg-blue-900/40', iconText: 'text-blue-600' },
};

function KpiTile({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  const c = COLOR_STYLES[color];
  return (
    <div className={cn('rounded-xl border p-2.5 md:p-3', c.bg, 'border-transparent')}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn('w-6 h-6 rounded-md flex items-center justify-center', c.iconBg)}>
          <Icon className={cn('h-3.5 w-3.5', c.iconText)} />
        </span>
        <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      </div>
      <p className={cn('text-xl md:text-2xl font-extrabold leading-none tabular-nums', c.text)}>{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-1 truncate">{sub}</p>
    </div>
  );
}
