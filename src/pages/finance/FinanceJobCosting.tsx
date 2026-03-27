import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, TrendingUp, TrendingDown, Download, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

export default function FinanceJobCosting() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [marginFilter, setMarginFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['finance_job_costing'],
    queryFn: async () => {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('id, job_number, job_title, service_category, customer_id, property_id, customers(first_name, last_name, company_name), properties(address_line_1, city)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const [invRes, expRes, billRes] = await Promise.all([
        supabase.from('invoices').select('job_id, total'),
        supabase.from('finance_expenses').select('linked_job_id, amount_total, category'),
        supabase.from('finance_bills').select('linked_job_id, total').not('status', 'eq', 'void'),
      ]);

      const revenueByJob: Record<string, number> = {};
      (invRes.data || []).forEach((inv: any) => {
        if (inv.job_id) revenueByJob[inv.job_id] = (revenueByJob[inv.job_id] || 0) + Number(inv.total || 0);
      });

      const costByJob: Record<string, { total: number; labor: number; materials: number; fuel: number; sub: number; other: number }> = {};
      (expRes.data || []).forEach((exp: any) => {
        if (!exp.linked_job_id) return;
        if (!costByJob[exp.linked_job_id]) costByJob[exp.linked_job_id] = { total: 0, labor: 0, materials: 0, fuel: 0, sub: 0, other: 0 };
        const amt = Number(exp.amount_total || 0);
        costByJob[exp.linked_job_id].total += amt;
        const cat = (exp.category || '').toLowerCase();
        if (cat.includes('labor')) costByJob[exp.linked_job_id].labor += amt;
        else if (cat.includes('material') || cat.includes('supplies')) costByJob[exp.linked_job_id].materials += amt;
        else if (cat.includes('fuel')) costByJob[exp.linked_job_id].fuel += amt;
        else if (cat.includes('subcontractor')) costByJob[exp.linked_job_id].sub += amt;
        else costByJob[exp.linked_job_id].other += amt;
      });

      // Add bill costs
      (billRes.data || []).forEach((bill: any) => {
        if (!bill.linked_job_id) return;
        if (!costByJob[bill.linked_job_id]) costByJob[bill.linked_job_id] = { total: 0, labor: 0, materials: 0, fuel: 0, sub: 0, other: 0 };
        costByJob[bill.linked_job_id].total += Number(bill.total || 0);
        costByJob[bill.linked_job_id].other += Number(bill.total || 0);
      });

      return (jobsData || []).map((j: any) => {
        const revenue = revenueByJob[j.id] || 0;
        const costs = costByJob[j.id] || { total: 0, labor: 0, materials: 0, fuel: 0, sub: 0, other: 0 };
        const margin = revenue - costs.total;
        const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
        const customerName = j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : null;
        const propertyAddr = j.properties?.address_line_1 || null;
        return { ...j, revenue, costs, margin, marginPct, customerName, propertyAddr };
      });
    },
  });

  const categories = [...new Set((jobs ?? []).map((j: any) => j.service_category).filter(Boolean))];

  const filtered = (jobs ?? []).filter((j: any) => {
    if (marginFilter === 'positive' && j.margin <= 0) return false;
    if (marginFilter === 'negative' && j.margin >= 0) return false;
    if (marginFilter === 'low' && (j.marginPct < 0 || j.marginPct > 20)) return false;
    if (categoryFilter !== 'all' && j.service_category !== categoryFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return j.job_number?.toLowerCase().includes(s) || j.job_title?.toLowerCase().includes(s) || j.customerName?.toLowerCase().includes(s) || j.propertyAddr?.toLowerCase().includes(s);
  });

  const totalRevenue = filtered.reduce((s: number, j: any) => s + j.revenue, 0);
  const totalCosts = filtered.reduce((s: number, j: any) => s + j.costs.total, 0);
  const totalMargin = totalRevenue - totalCosts;
  const avgMarginPct = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100) : 0;

  const exportCSV = () => {
    const rows = filtered.map((j: any) => [j.job_number, j.job_title, j.service_category, j.customerName || '', j.propertyAddr || '', j.revenue, j.costs.labor, j.costs.materials, j.costs.sub, j.costs.fuel, j.costs.other, j.costs.total, j.margin, j.marginPct.toFixed(1)].join(','));
    const csv = ['Job #,Title,Category,Customer,Property,Revenue,Labor,Materials,Subcontractor,Fuel,Other,Total Cost,Margin,Margin %', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'job-costing.csv'; a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Costing</h1>
          <p className="text-sm text-muted-foreground">Profitability analysis per job</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-lg font-bold text-accent">{fmt(totalRevenue)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Costs</p><p className="text-lg font-bold text-destructive">{fmt(totalCosts)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Gross Margin</p><p className={`text-lg font-bold ${totalMargin >= 0 ? 'text-accent' : 'text-destructive'}`}>{fmt(totalMargin)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Avg Margin %</p><p className={`text-lg font-bold ${avgMarginPct >= 0 ? 'text-accent' : 'text-destructive'}`}>{pct(avgMarginPct)}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={marginFilter} onValueChange={setMarginFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="positive">Profitable</SelectItem>
            <SelectItem value="negative">Negative Margin</SelectItem>
            <SelectItem value="low">Low Margin (&lt;20%)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Costs</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No jobs match your filters</TableCell></TableRow>
                  ) : filtered.map((j: any) => (
                    <TableRow key={j.id} className="cursor-pointer hover:bg-muted/50" onClick={() => nav(`/jobs/${j.id}`)}>
                      <TableCell className="font-medium">{j.job_number}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{j.job_title}</TableCell>
                      <TableCell className="text-sm">{j.customerName || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{j.service_category || '—'}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(j.revenue)}</TableCell>
                      <TableCell className="text-right">{fmt(j.costs.total)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`flex items-center justify-end gap-1 font-semibold ${j.margin >= 0 ? 'text-accent' : 'text-destructive'}`}>
                          {j.margin >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {fmt(j.margin)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={j.marginPct >= 20 ? 'default' : j.marginPct >= 0 ? 'secondary' : 'destructive'}>
                          {pct(j.marginPct)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
