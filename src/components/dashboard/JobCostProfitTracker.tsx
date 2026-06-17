import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  TrendingUp, TrendingDown, AlertTriangle, Truck, MapPin, Fuel, Clock,
  DollarSign, Search, Filter, Pencil, HelpCircle, EyeOff, Eye, Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ManageJobCostsDrawer } from './ManageJobCostsDrawer';

const HOME_CITIES = ['regina'];
const DEFAULT_LABOUR_RATE = 45;

// Routine categories that are auto-excluded from the tracker unless the
// admin explicitly opts a specific job in.
const ROUTINE_CATEGORIES = new Set([
  'Snow & Ice',
  'Snow Removal',
  'Ice Management',
  'Landscaping & Grounds',
  'Lawn Care',
  'Property Maintenance',
  'Maintenance',
  'Junk Removal',
  'Cleaning Services',
]);
const ROUTINE_FREQUENCIES = new Set([
  'weekly', 'bi-weekly', 'biweekly', 'monthly', 'recurring', 'seasonal',
]);

type Status = 'Profitable' | 'Tight' | 'Losing' | 'Needs Cost Review' | 'Missing Source Data';
type Override = 'include' | 'exclude' | null;
type Source = 'Invoice' | 'Quote' | 'Job estimate' | 'No source';

type Row = {
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  customer: string;
  city: string | null;
  province: string | null;
  outOfTown: boolean;
  serviceCategory: string | null;
  serviceFrequency: string | null;
  quoteAmount: number;
  invoiceAmount: number;
  amountCollected: number;
  baseline: number;
  baselineSource: Source;
  fuelCost: number;
  travelCost: number;
  labourHours: number;
  labourCost: number;
  materialCost: number;
  hotelMealsCost: number;
  tripCount: number;
  totalCost: number;
  profit: number;
  margin: number;
  status: Status;
  warnings: string[];
  hasCostData: boolean;
  travelIncludedInQuote: boolean | null;
  override: Override;
  autoExcluded: boolean;
};

function classifyCategory(catRaw: string | null, descRaw: string | null) {
  const c = `${catRaw ?? ''} ${descRaw ?? ''}`.toLowerCase();
  if (/(fuel|gas|mileage)/.test(c)) return 'fuel';
  if (/(travel|kilometr|km )/.test(c)) return 'travel';
  if (/(hotel|lodging|meal|per diem|per-diem)/.test(c)) return 'hotel';
  if (/(labour|labor|wage|payroll|crew)/.test(c)) return 'labour';
  if (/(equipment|rental|tool)/.test(c)) return 'equipment';
  return 'material';
}

function isRoutineJob(category: string | null, frequency: string | null) {
  if (frequency && ROUTINE_FREQUENCIES.has(frequency.toLowerCase())) return true;
  if (category && ROUTINE_CATEGORIES.has(category)) return true;
  return false;
}

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function JobCostProfitTracker() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'outOfTown' | 'losing' | 'tight' | 'review'>('all');
  const [search, setSearch] = useState('');
  const [showExcluded, setShowExcluded] = useState(false);
  const [editing, setEditing] = useState<{ id: string; number: string; title: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['job-cost-profit-tracker'],
    queryFn: async () => {
      const [jobsRes, customersRes, propsRes, quotesRes, invoicesRes, expensesRes, visitsRes, metaRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, job_number, job_title, customer_id, property_id, quote_id, status, estimated_total, service_category, service_frequency, created_at')
          .in('status', ['In Progress', 'Completed', 'Scheduled'])
          .order('created_at', { ascending: false })
          .limit(120),
        supabase.from('customers').select('id, company_name, first_name, last_name'),
        supabase.from('properties').select('id, city, province, address_line_1'),
        supabase.from('quotes').select('id, total'),
        supabase.from('invoices').select('id, job_id, total, amount_paid'),
        supabase.from('expenses').select('id, job_id, category, description, amount'),
        supabase.from('visits').select('id, job_id, arrival_time, completion_time, estimated_duration_minutes'),
        supabase.from('job_cost_meta').select('*'),
      ]);

      const jobs = jobsRes.data ?? [];
      const customers = new Map((customersRes.data ?? []).map(c => [c.id, c]));
      const props = new Map((propsRes.data ?? []).map(p => [p.id, p]));
      const quotes = new Map((quotesRes.data ?? []).map(q => [q.id, Number(q.total) || 0]));
      const meta = new Map((metaRes.data ?? []).map((m: any) => [m.job_id, m]));

      const invByJob = new Map<string, { total: number; paid: number }>();
      (invoicesRes.data ?? []).forEach(inv => {
        if (!inv.job_id) return;
        const b = invByJob.get(inv.job_id) ?? { total: 0, paid: 0 };
        b.total += Number(inv.total) || 0;
        b.paid += Number(inv.amount_paid) || 0;
        invByJob.set(inv.job_id, b);
      });

      const expByJob = new Map<string, { fuel: number; travel: number; labour: number; material: number; equipment: number; hotel: number; count: number }>();
      (expensesRes.data ?? []).forEach(e => {
        if (!e.job_id) return;
        const b = expByJob.get(e.job_id) ?? { fuel: 0, travel: 0, labour: 0, material: 0, equipment: 0, hotel: 0, count: 0 };
        const k = classifyCategory(e.category, e.description);
        (b as any)[k] += Number(e.amount) || 0;
        b.count += 1;
        expByJob.set(e.job_id, b);
      });

      const visByJob = new Map<string, { trips: number; hours: number }>();
      (visitsRes.data ?? []).forEach(v => {
        if (!v.job_id) return;
        const b = visByJob.get(v.job_id) ?? { trips: 0, hours: 0 };
        b.trips += 1;
        if (v.arrival_time && v.completion_time) {
          const hrs = (new Date(v.completion_time).getTime() - new Date(v.arrival_time).getTime()) / 3600000;
          if (hrs > 0 && hrs < 24) b.hours += hrs;
        } else if (v.estimated_duration_minutes) {
          b.hours += v.estimated_duration_minutes / 60;
        }
        visByJob.set(v.job_id, b);
      });

      const rows: Row[] = jobs.map((j: any) => {
        const cust = customers.get(j.customer_id);
        const prop = props.get(j.property_id);
        const m: any = meta.get(j.id) ?? {};
        const customerName = cust?.company_name || `${cust?.first_name ?? ''} ${cust?.last_name ?? ''}`.trim() || 'Unknown';
        const city = prop?.city ?? null;
        const outOfTown = !!city && !HOME_CITIES.includes(city.trim().toLowerCase());

        const quoteAmount = (j.quote_id && quotes.get(j.quote_id)) || 0;
        const jobEstimate = Number(j.estimated_total) || 0;
        const inv = invByJob.get(j.id) ?? { total: 0, paid: 0 };
        const exp = expByJob.get(j.id) ?? { fuel: 0, travel: 0, labour: 0, material: 0, equipment: 0, hotel: 0, count: 0 };
        const vis = visByJob.get(j.id) ?? { trips: 0, hours: 0 };

        const tripCount = (m.trip_count_override ?? vis.trips) || 0;
        const fuelCost = exp.fuel + (Number(m.fuel_per_trip) || 0) * tripCount;
        const travelCost = exp.travel + (Number(m.travel_labour_cost) || 0);
        const hotelMealsCost = exp.hotel + (Number(m.hotel_cost) || 0) + (Number(m.meal_cost) || 0);
        const labourFromExp = exp.labour;
        const labourEst = labourFromExp > 0 ? labourFromExp : vis.hours * DEFAULT_LABOUR_RATE;
        const materialCost = exp.material + exp.equipment;

        const totalCost = fuelCost + travelCost + hotelMealsCost + labourEst + materialCost;

        let baseline = 0;
        let baselineSource: Source = 'No source';
        if (inv.total > 0) { baseline = inv.total; baselineSource = 'Invoice'; }
        else if (quoteAmount > 0) { baseline = quoteAmount; baselineSource = 'Quote'; }
        else if (jobEstimate > 0) { baseline = jobEstimate; baselineSource = 'Job estimate'; }

        const profit = baseline - totalCost;
        const margin = baseline > 0 ? (profit / baseline) * 100 : 0;

        const hasMeta = !!meta.get(j.id);
        const hasCostData = exp.count > 0 || vis.hours > 0 || hasMeta;

        const warnings: string[] = [];
        if (baselineSource === 'No source') warnings.push('Missing Source Data');
        if (!hasCostData) warnings.push('Cost Data Missing');
        if (baseline > 0 && totalCost > baseline) warnings.push('Losing Money');
        else if (baseline > 0 && totalCost >= baseline * 0.85 && hasCostData) warnings.push('Tight Margin');
        if (exp.count > 0 && inv.total === 0) warnings.push('Unbilled Receipts');
        if (tripCount > 3) warnings.push('Extra Trip Warning');
        if (quoteAmount > 0 && labourEst > quoteAmount * 0.6) warnings.push('Labour Overrun');
        if (outOfTown && hasMeta && m.travel_included_in_quote === false) warnings.push('Travel Not In Quote');

        let status: Status;
        if (baselineSource === 'No source') status = 'Missing Source Data';
        else if (!hasCostData) status = 'Needs Cost Review';
        else if (margin < 0) status = 'Losing';
        else if (margin < 15) status = 'Tight';
        else status = 'Profitable';

        const override: Override = (m.tracker_override as Override) ?? null;
        const routine = isRoutineJob(j.service_category, j.service_frequency);
        const autoExcluded = override === null && routine && !outOfTown;

        return {
          jobId: j.id,
          jobNumber: j.job_number ?? '—',
          jobTitle: j.job_title ?? '',
          customer: customerName,
          city,
          province: prop?.province ?? null,
          outOfTown,
          serviceCategory: j.service_category ?? null,
          serviceFrequency: j.service_frequency ?? null,
          quoteAmount,
          invoiceAmount: inv.total,
          amountCollected: inv.paid,
          baseline,
          baselineSource,
          fuelCost,
          travelCost,
          labourHours: vis.hours,
          labourCost: labourEst,
          materialCost,
          hotelMealsCost,
          tripCount,
          totalCost,
          profit,
          margin,
          status,
          warnings,
          hasCostData,
          travelIncludedInQuote: hasMeta ? !!m.travel_included_in_quote : null,
          override,
          autoExcluded,
        };
      });

      return rows;
    },
    staleTime: 30_000,
  });

  async function setOverride(jobId: string, value: Override) {
    const payload: any = { job_id: jobId, tracker_override: value };
    const { error } = await supabase
      .from('job_cost_meta')
      .upsert(payload, { onConflict: 'job_id' });
    if (error) {
      toast.error('Could not update: ' + error.message);
      return;
    }
    toast.success(
      value === 'exclude' ? 'Removed from tracker' :
      value === 'include' ? 'Added to tracker' : 'Reset to automatic',
    );
    qc.invalidateQueries({ queryKey: ['job-cost-profit-tracker'] });
  }

  const visibleRows = useMemo(() => {
    const rows = data ?? [];
    return rows.filter(r => {
      const excluded = r.override === 'exclude' || r.autoExcluded;
      return showExcluded ? excluded : !excluded;
    });
  }, [data, showExcluded]);

  const filtered = useMemo(() => {
    let r = visibleRows;
    if (filter === 'outOfTown') r = r.filter(x => x.outOfTown);
    else if (filter === 'losing') r = r.filter(x => x.status === 'Losing');
    else if (filter === 'tight') r = r.filter(x => x.status === 'Tight');
    else if (filter === 'review') r = r.filter(x => x.status === 'Needs Cost Review' || x.status === 'Missing Source Data');
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        (x.jobNumber ?? '').toLowerCase().includes(q) ||
        (x.jobTitle ?? '').toLowerCase().includes(q) ||
        (x.customer ?? '').toLowerCase().includes(q) ||
        (x.city ?? '').toLowerCase().includes(q),
      );
    }
    return r;
  }, [visibleRows, filter, search]);

  const summary = useMemo(() => {
    const rows = visibleRows;
    return {
      total: rows.length,
      profitable: rows.filter(r => r.status === 'Profitable').length,
      tight: rows.filter(r => r.status === 'Tight').length,
      losing: rows.filter(r => r.status === 'Losing').length,
      review: rows.filter(r => r.status === 'Needs Cost Review' || r.status === 'Missing Source Data').length,
      outOfTown: rows.filter(r => r.outOfTown).length,
      netProfit: rows.filter(r => r.hasCostData && r.baseline > 0).reduce((a, r) => a + r.profit, 0),
      totalInvoiced: rows.reduce((a, r) => a + r.invoiceAmount, 0),
      totalCollected: rows.reduce((a, r) => a + r.amountCollected, 0),
      excludedCount: (data ?? []).filter(r => r.override === 'exclude' || r.autoExcluded).length,
    };
  }, [visibleRows, data]);

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg md:text-xl font-extrabold tracking-tight flex items-center gap-2">
                <span className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </span>
                Job Cost &amp; Profit Tracker
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                For project/labour-heavy jobs (drywall, paint, reno, out-of-town).
                Routine landscaping/maintenance/junk jobs are hidden unless you opt them in.
                Data sources: <span className="font-semibold">Invoices → Quotes → Job estimate</span> for revenue,
                {' '}<span className="font-semibold">Expenses + Visits + Manual entry</span> for cost.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1"><TrendingUp className="h-3 w-3 text-emerald-600" />{summary.profitable} profitable</Badge>
              <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" />{summary.tight} tight</Badge>
              <Badge variant="outline" className="gap-1"><TrendingDown className="h-3 w-3 text-rose-600" />{summary.losing} losing</Badge>
              <Badge variant="outline" className="gap-1"><HelpCircle className="h-3 w-3 text-slate-500" />{summary.review} need review</Badge>
              <Badge variant="outline" className="gap-1"><Truck className="h-3 w-3 text-blue-600" />{summary.outOfTown} out-of-town</Badge>
              <Badge className={cn('gap-1', summary.netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600')}>
                Net {money(summary.netProfit)}
              </Badge>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Kpi label="Total Invoiced" value={money(summary.totalInvoiced)} />
            <Kpi label="Total Collected" value={money(summary.totalCollected)} />
            <Kpi label="Net Profit (costed jobs)"
              value={money(summary.netProfit)}
              tone={summary.netProfit >= 0 ? 'positive' : 'negative'} />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search job, customer, city…"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {(['all', 'outOfTown', 'tight', 'losing', 'review'] as const).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'default' : 'outline'}
                  className="h-7 text-[11px] px-2"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All'
                    : f === 'outOfTown' ? 'Out of Town'
                      : f === 'tight' ? 'Tight'
                        : f === 'losing' ? 'Losing'
                          : 'Needs Review'}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto rounded border px-2 py-1 bg-muted/30">
              <Label htmlFor="show-excluded" className="text-[11px] cursor-pointer flex items-center gap-1">
                {showExcluded ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Show excluded ({summary.excludedCount})
              </Label>
              <Switch id="show-excluded" checked={showExcluded} onCheckedChange={setShowExcluded} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Loading job costing…</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              {showExcluded
                ? 'No excluded jobs.'
                : 'No tracked jobs yet. Routine landscaping/maintenance jobs are hidden by default — toggle "Show excluded" to opt one in.'}
            </p>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase">Job</TableHead>
                    <TableHead className="text-[10px] uppercase">Customer / Location</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Revenue (source)</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Collected</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Fuel/Travel</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Labour</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Mat./Equip</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Trips</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Total Cost</TableHead>
                    <TableHead className="text-[10px] uppercase text-right">Profit</TableHead>
                    <TableHead className="text-[10px] uppercase">Status</TableHead>
                    <TableHead className="text-[10px] uppercase"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const excluded = r.override === 'exclude' || r.autoExcluded;
                    return (
                      <TableRow key={r.jobId} className={cn(
                        !r.hasCostData && 'bg-amber-50/40 dark:bg-amber-950/10',
                        excluded && 'opacity-70',
                      )}>
                        <TableCell className="text-xs">
                          <Link to={`/jobs/${r.jobId}`} className="font-mono font-semibold text-primary hover:underline">
                            {r.jobNumber}
                          </Link>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{r.jobTitle}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {r.serviceCategory && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                                {r.serviceCategory}
                              </span>
                            )}
                            {r.override === 'include' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Manually tracked</span>
                            )}
                            {r.autoExcluded && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">Auto-excluded</span>
                            )}
                            {r.warnings.map(w => (
                              <span key={w} className={cn(
                                'text-[9px] px-1.5 py-0.5 rounded font-semibold',
                                w === 'Cost Data Missing' || w === 'Losing Money' || w === 'Travel Not In Quote' || w === 'Missing Source Data'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                              )}>
                                {w}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-medium truncate max-w-[180px]">{r.customer}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" />
                            {r.city || '—'}{r.province ? `, ${r.province}` : ''}
                            {r.outOfTown && (
                              <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] border-blue-300 text-blue-700">
                                <Truck className="h-2.5 w-2.5 mr-0.5" />OOT
                              </Badge>
                            )}
                          </p>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          <div>{money(r.baseline)}</div>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                            from {r.baselineSource}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{money(r.amountCollected)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          <span className="inline-flex items-center gap-0.5">
                            <Fuel className="h-2.5 w-2.5 text-muted-foreground" />
                            {money(r.fuelCost + r.travelCost)}
                          </span>
                          {r.hotelMealsCost > 0 && (
                            <div className="text-[10px] text-muted-foreground">+{money(r.hotelMealsCost)} hotel/meals</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">
                          <div>{money(r.labourCost)}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                            <Clock className="h-2.5 w-2.5" />{(r.labourHours || 0).toFixed(1)}h
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{money(r.materialCost)}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums">{r.tripCount}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-semibold">{money(r.totalCost)}</TableCell>
                        <TableCell className={cn('text-xs text-right tabular-nums font-bold',
                          !r.hasCostData || r.baseline === 0 ? 'text-muted-foreground' : r.profit >= 0 ? 'text-emerald-600' : 'text-rose-600',
                        )}>
                          {r.hasCostData && r.baseline > 0 ? money(r.profit) : '—'}
                          {r.hasCostData && r.baseline > 0 && (
                            <div className="text-[10px] font-normal opacity-80">{(r.margin || 0).toFixed(0)}%</div>
                          )}
                        </TableCell>
                        <TableCell><StatusPill status={r.status} /></TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-[11px] px-2"
                              onClick={() => setEditing({ id: r.jobId, number: r.jobNumber, title: r.jobTitle })}>
                              <Pencil className="h-3 w-3 mr-1" /> Manage Costs
                            </Button>
                            {excluded ? (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-emerald-700"
                                onClick={() => setOverride(r.jobId, 'include')}>
                                <Plus className="h-3 w-3 mr-1" /> Add to tracker
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-rose-700"
                                onClick={() => setOverride(r.jobId, 'exclude')}>
                                <EyeOff className="h-3 w-3 mr-1" /> Remove
                              </Button>
                            )}
                            {r.override !== null && (
                              <Button size="sm" variant="ghost" className="h-5 text-[9px] px-1 text-muted-foreground"
                                onClick={() => setOverride(r.jobId, null)}>
                                reset to auto
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <ManageJobCostsDrawer
        jobId={editing?.id ?? null}
        jobNumber={editing?.number}
        jobTitle={editing?.title}
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
      />
    </>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    Profitable: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    Tight: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    Losing: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    'Needs Cost Review': 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
    'Missing Source Data': 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300',
  };
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap', map[status])}>
      {status}
    </span>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="rounded-lg border p-2.5 bg-card">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className={cn(
        'text-lg font-extrabold tabular-nums',
        tone === 'positive' && 'text-emerald-600',
        tone === 'negative' && 'text-rose-600',
      )}>{value}</p>
    </div>
  );
}
