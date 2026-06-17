import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  TrendingUp, TrendingDown, AlertTriangle, Truck, MapPin, Fuel, Clock,
  DollarSign, Search, Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Configurable home city — anything else is "Out of Town"
const HOME_CITIES = ['regina'];
// Default labour rate when we have to estimate from hours
const DEFAULT_LABOUR_RATE = 45;

type Row = {
  jobId: string;
  jobNumber: string;
  jobTitle: string;
  customer: string;
  city: string | null;
  province: string | null;
  outOfTown: boolean;
  quoteAmount: number;
  invoiceAmount: number;
  fuelCost: number;
  labourHours: number;
  labourCost: number;
  materialCost: number;
  tripCount: number;
  hasUnbilledReceipts: boolean;
  totalCost: number;
  profit: number;
  margin: number;
  status: 'Profitable' | 'Tight' | 'Losing' | 'Needs Review';
  warnings: string[];
};

function classifyCategory(catRaw: string | null, descRaw: string | null) {
  const c = `${catRaw ?? ''} ${descRaw ?? ''}`.toLowerCase();
  if (/(fuel|gas|mileage|travel|kilometr|km |hotel|lodging|meal|per diem|per-diem)/.test(c)) return 'fuel';
  if (/(labour|labor|wage|payroll|crew)/.test(c)) return 'labour';
  return 'material';
}

export function JobCostProfitTracker() {
  const [filter, setFilter] = useState<'all' | 'outOfTown' | 'losing' | 'tight'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['job-cost-profit-tracker'],
    queryFn: async () => {
      const [jobsRes, customersRes, propsRes, quotesRes, invoicesRes, expensesRes, visitsRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, job_number, job_title, customer_id, property_id, quote_id, status, estimated_total, created_at')
          .in('status', ['In Progress', 'Completed', 'Scheduled'])
          .order('created_at', { ascending: false })
          .limit(60),
        supabase.from('customers').select('id, company_name, first_name, last_name'),
        supabase.from('properties').select('id, city, province, address_line_1'),
        supabase.from('quotes').select('id, total'),
        supabase.from('invoices').select('id, job_id, total'),
        supabase.from('expenses').select('id, job_id, category, description, amount'),
        supabase.from('visits').select('id, job_id, arrival_time, completion_time, estimated_duration_minutes'),
      ]);

      const jobs = jobsRes.data ?? [];
      const customers = new Map((customersRes.data ?? []).map(c => [c.id, c]));
      const props = new Map((propsRes.data ?? []).map(p => [p.id, p]));
      const quotes = new Map((quotesRes.data ?? []).map(q => [q.id, Number(q.total) || 0]));
      const invoicesByJob = new Map<string, number>();
      (invoicesRes.data ?? []).forEach(inv => {
        if (!inv.job_id) return;
        invoicesByJob.set(inv.job_id, (invoicesByJob.get(inv.job_id) ?? 0) + (Number(inv.total) || 0));
      });
      const expensesByJob = new Map<string, { fuel: number; labour: number; material: number; unbilledCount: number }>();
      (expensesRes.data ?? []).forEach(e => {
        if (!e.job_id) return;
        const bucket = expensesByJob.get(e.job_id) ?? { fuel: 0, labour: 0, material: 0, unbilledCount: 0 };
        const kind = classifyCategory(e.category, e.description);
        bucket[kind] += Number(e.amount) || 0;
        bucket.unbilledCount += 1;
        expensesByJob.set(e.job_id, bucket);
      });
      const visitsByJob = new Map<string, { trips: number; hours: number }>();
      (visitsRes.data ?? []).forEach(v => {
        if (!v.job_id) return;
        const b = visitsByJob.get(v.job_id) ?? { trips: 0, hours: 0 };
        b.trips += 1;
        if (v.arrival_time && v.completion_time) {
          const hrs = (new Date(v.completion_time).getTime() - new Date(v.arrival_time).getTime()) / 3600000;
          if (hrs > 0 && hrs < 24) b.hours += hrs;
        } else if (v.estimated_duration_minutes) {
          b.hours += v.estimated_duration_minutes / 60;
        }
        visitsByJob.set(v.job_id, b);
      });

      const rows: Row[] = jobs.map((j: any) => {
        const cust = customers.get(j.customer_id);
        const prop = props.get(j.property_id);
        const customerName = cust?.company_name || `${cust?.first_name ?? ''} ${cust?.last_name ?? ''}`.trim() || 'Unknown';
        const city = prop?.city ?? null;
        const outOfTown = !!city && !HOME_CITIES.includes(city.trim().toLowerCase());

        const quoteAmount = (j.quote_id && quotes.get(j.quote_id)) || Number(j.estimated_total) || 0;
        const invoiceAmount = invoicesByJob.get(j.id) ?? 0;
        const exp = expensesByJob.get(j.id) ?? { fuel: 0, labour: 0, material: 0, unbilledCount: 0 };
        const vis = visitsByJob.get(j.id) ?? { trips: 0, hours: 0 };

        const labourCostFromExpenses = exp.labour;
        const labourCostEstimated = labourCostFromExpenses > 0
          ? labourCostFromExpenses
          : vis.hours * DEFAULT_LABOUR_RATE;
        const totalCost = exp.fuel + labourCostEstimated + exp.material;
        const baseline = invoiceAmount > 0 ? invoiceAmount : quoteAmount;
        const profit = baseline - totalCost;
        const margin = baseline > 0 ? (profit / baseline) * 100 : 0;

        const warnings: string[] = [];
        if (baseline > 0 && totalCost > baseline) warnings.push('Losing Money');
        else if (baseline > 0 && totalCost >= baseline * 0.85) warnings.push('Tight Margin');
        if (exp.unbilledCount > 0 && invoiceAmount === 0) warnings.push('Unbilled Receipts');
        if (vis.trips > 3) warnings.push('Extra Trip Warning');
        // Labour overrun heuristic: labour cost > 60% of quote
        if (quoteAmount > 0 && labourCostEstimated > quoteAmount * 0.6) warnings.push('Labour Overrun');

        let status: Row['status'] = 'Needs Review';
        if (baseline > 0) {
          if (margin < 0) status = 'Losing';
          else if (margin < 15) status = 'Tight';
          else status = 'Profitable';
        }

        return {
          jobId: j.id,
          jobNumber: j.job_number,
          jobTitle: j.job_title,
          customer: customerName,
          city,
          province: prop?.province ?? null,
          outOfTown,
          quoteAmount,
          invoiceAmount,
          fuelCost: exp.fuel,
          labourHours: vis.hours,
          labourCost: labourCostEstimated,
          materialCost: exp.material,
          tripCount: vis.trips,
          hasUnbilledReceipts: exp.unbilledCount > 0 && invoiceAmount === 0,
          totalCost,
          profit,
          margin,
          status,
          warnings,
        };
      });

      return rows;
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    let r = rows;
    if (filter === 'outOfTown') r = r.filter(x => x.outOfTown);
    else if (filter === 'losing') r = r.filter(x => x.status === 'Losing');
    else if (filter === 'tight') r = r.filter(x => x.status === 'Tight');
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        x.jobNumber.toLowerCase().includes(q) ||
        x.jobTitle?.toLowerCase().includes(q) ||
        x.customer.toLowerCase().includes(q) ||
        x.city?.toLowerCase().includes(q),
      );
    }
    return r;
  }, [data, filter, search]);

  const summary = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      profitable: rows.filter(r => r.status === 'Profitable').length,
      tight: rows.filter(r => r.status === 'Tight').length,
      losing: rows.filter(r => r.status === 'Losing').length,
      outOfTown: rows.filter(r => r.outOfTown).length,
      netProfit: rows.reduce((a, r) => a + r.profit, 0),
    };
  }, [data]);

  return (
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
              Quote vs actuals — labour, fuel, travel, trips. Out-of-town jobs flagged automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1"><TrendingUp className="h-3 w-3 text-emerald-600" />{summary.profitable} profitable</Badge>
            <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3 text-amber-600" />{summary.tight} tight</Badge>
            <Badge variant="outline" className="gap-1"><TrendingDown className="h-3 w-3 text-rose-600" />{summary.losing} losing</Badge>
            <Badge variant="outline" className="gap-1"><Truck className="h-3 w-3 text-blue-600" />{summary.outOfTown} out-of-town</Badge>
            <Badge className={cn('gap-1', summary.netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600')}>
              Net ${summary.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Badge>
          </div>
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
          <div className="flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {(['all', 'outOfTown', 'tight', 'losing'] as const).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                className="h-7 text-[11px] px-2"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'outOfTown' ? 'Out of Town' : f === 'tight' ? 'Tight' : 'Losing'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading job costing…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No jobs match this filter.</p>
        ) : (
          <ScrollArea className="max-h-[480px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase">Job</TableHead>
                  <TableHead className="text-[10px] uppercase">Customer / Location</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Quote</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Invoiced</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Fuel/Travel</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Labour</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Material</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Trips</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Total Cost</TableHead>
                  <TableHead className="text-[10px] uppercase text-right">Profit</TableHead>
                  <TableHead className="text-[10px] uppercase">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.jobId}>
                    <TableCell className="text-xs">
                      <Link to={`/jobs/${r.jobId}`} className="font-mono font-semibold text-primary hover:underline">
                        {r.jobNumber}
                      </Link>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{r.jobTitle}</p>
                      {r.warnings.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.warnings.map(w => (
                            <span key={w} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-semibold">
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
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
                    <TableCell className="text-xs text-right tabular-nums">${r.quoteAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">${r.invoiceAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      <span className="inline-flex items-center gap-0.5"><Fuel className="h-2.5 w-2.5 text-muted-foreground" />${r.fuelCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      <div>${r.labourCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                        <Clock className="h-2.5 w-2.5" />{r.labourHours.toFixed(1)}h
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">${r.materialCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{r.tripCount}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-semibold">${r.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className={cn('text-xs text-right tabular-nums font-bold', r.profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      ${r.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <div className="text-[10px] font-normal opacity-80">{r.margin.toFixed(0)}%</div>
                    </TableCell>
                    <TableCell>
                      <StatusPill status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: Row['status'] }) {
  const map: Record<Row['status'], string> = {
    Profitable: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    Tight: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    Losing: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
    'Needs Review': 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
  };
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap', map[status])}>
      {status}
    </span>
  );
}
