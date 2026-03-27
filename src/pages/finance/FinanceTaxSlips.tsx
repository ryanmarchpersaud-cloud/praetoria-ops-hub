import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

function useT4Preview(year: number) {
  return useQuery({
    queryKey: ['t4_preview', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_run_items')
        .select('employee_name, user_id, gross_pay, cpp_amount, ei_amount, income_tax_amount, payroll_runs!inner(pay_date, status)')
        .gte('payroll_runs.pay_date', `${year}-01-01`)
        .lte('payroll_runs.pay_date', `${year}-12-31`)
        .eq('payroll_runs.status', 'processed');
      if (error) throw error;

      const grouped: Record<string, { name: string; gross: number; cpp: number; ei: number; tax: number }> = {};
      (data || []).forEach((r: any) => {
        const key = r.employee_name || r.user_id || 'Unknown';
        if (!grouped[key]) grouped[key] = { name: key, gross: 0, cpp: 0, ei: 0, tax: 0 };
        grouped[key].gross += Number(r.gross_pay || 0);
        grouped[key].cpp += Number(r.cpp_amount || 0);
        grouped[key].ei += Number(r.ei_amount || 0);
        grouped[key].tax += Number(r.income_tax_amount || 0);
      });
      return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

function useT5018Preview(year: number) {
  return useQuery({
    queryKey: ['t5018_preview', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_payout_items')
        .select('subcontractor_name, company_name, total_payable, subcontractor_payout_runs!inner(payout_date, status)')
        .gte('subcontractor_payout_runs.payout_date', `${year}-01-01`)
        .lte('subcontractor_payout_runs.payout_date', `${year}-12-31`)
        .eq('subcontractor_payout_runs.status', 'processed');
      if (error) throw error;

      const grouped: Record<string, { name: string; company: string; total: number }> = {};
      (data || []).forEach((r: any) => {
        const key = r.subcontractor_name || 'Unknown';
        if (!grouped[key]) grouped[key] = { name: key, company: r.company_name || '', total: 0 };
        grouped[key].total += Number(r.total_payable || 0);
      });
      return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

function exportCSV(rows: any[], cols: { key: string; label: string }[], filename: string) {
  const header = cols.map(c => c.label).join(',');
  const body = rows.map(r => cols.map(c => {
    const v = r[c.key];
    return typeof v === 'number' ? v.toFixed(2) : `"${String(v || '').replace(/"/g, '""')}"`;
  }).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success('CSV exported');
}

export default function FinanceTaxSlips() {
  const [year, setYear] = useState(currentYear);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tax Slip Previews</h1>
          <p className="text-sm text-muted-foreground">T4 and T5018 data previews for export — not government filing</p>
        </div>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Badge variant="outline" className="border-warning text-warning"><FileText className="h-3 w-3 mr-1" /> Preview / Export Only — Not CRA Filing</Badge>

      <Tabs defaultValue="t4">
        <TabsList><TabsTrigger value="t4">Employee T4</TabsTrigger><TabsTrigger value="t5018">Subcontractor T5018</TabsTrigger></TabsList>

        <TabsContent value="t4"><T4Tab year={year} /></TabsContent>
        <TabsContent value="t5018"><T5018Tab year={year} /></TabsContent>
      </Tabs>
    </div>
  );
}

function T4Tab({ year }: { year: number }) {
  const { data, isLoading } = useT4Preview(year);
  const totals = (data ?? []).reduce((a, r) => ({ gross: a.gross + r.gross, cpp: a.cpp + r.cpp, ei: a.ei + r.ei, tax: a.tax + r.tax }), { gross: 0, cpp: 0, ei: 0, tax: 0 });

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">T4 Summary — {year}</CardTitle>
        <Button size="sm" variant="outline" disabled={!data?.length} onClick={() => exportCSV(data!, [{ key: 'name', label: 'Employee' }, { key: 'gross', label: 'Gross Earnings' }, { key: 'cpp', label: 'CPP' }, { key: 'ei', label: 'EI' }, { key: 'tax', label: 'Income Tax' }], `T4_Preview_${year}.csv`)}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isLoading ? <Skeleton className="h-32 m-4" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead className="text-right">Gross Earnings</TableHead><TableHead className="text-right">CPP</TableHead><TableHead className="text-right">EI</TableHead><TableHead className="text-right">Income Tax</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-right">{fmt(r.gross)}</TableCell>
                  <TableCell className="text-right">{fmt(r.cpp)}</TableCell>
                  <TableCell className="text-right">{fmt(r.ei)}</TableCell>
                  <TableCell className="text-right">{fmt(r.tax)}</TableCell>
                </TableRow>
              ))}
              {data && data.length > 0 && (
                <TableRow className="font-bold bg-muted/30">
                  <TableCell>Totals</TableCell>
                  <TableCell className="text-right">{fmt(totals.gross)}</TableCell>
                  <TableCell className="text-right">{fmt(totals.cpp)}</TableCell>
                  <TableCell className="text-right">{fmt(totals.ei)}</TableCell>
                  <TableCell className="text-right">{fmt(totals.tax)}</TableCell>
                </TableRow>
              )}
              {(!data || data.length === 0) && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No processed payroll data for {year}</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function T5018Tab({ year }: { year: number }) {
  const { data, isLoading } = useT5018Preview(year);
  const total = (data ?? []).reduce((s, r) => s + r.total, 0);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">T5018 Summary — {year}</CardTitle>
        <Button size="sm" variant="outline" disabled={!data?.length} onClick={() => exportCSV(data!, [{ key: 'name', label: 'Subcontractor' }, { key: 'company', label: 'Company' }, { key: 'total', label: 'Total Paid' }], `T5018_Preview_${year}.csv`)}>
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {isLoading ? <Skeleton className="h-32 m-4" /> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Subcontractor</TableHead><TableHead>Company</TableHead><TableHead className="text-right">Total Paid</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.company || '—'}</TableCell>
                  <TableCell className="text-right">{fmt(r.total)}</TableCell>
                </TableRow>
              ))}
              {data && data.length > 0 && (
                <TableRow className="font-bold bg-muted/30">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">{fmt(total)}</TableCell>
                </TableRow>
              )}
              {(!data || data.length === 0) && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No processed payout data for {year}</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
