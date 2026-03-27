import { useMemo, useState } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, AlertTriangle, Clock, TrendingUp, Download, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

export default function FinanceAR() {
  const nav = useNavigate();
  const { data: allInvoices = [], isLoading } = useInvoices({});

  const arData = useMemo(() => {
    const open = allInvoices.filter((i: any) => ['Sent', 'Viewed', 'Partially Paid', 'Overdue'].includes(i.status) && Number(i.balance_due) > 0);
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
    const byCustomer: Record<string, { name: string; company: string; id: string; current: number; d30: number; d60: number; d90: number; d90plus: number; total: number; count: number }> = {};

    open.forEach((inv: any) => {
      const days = differenceInDays(new Date(), parseISO(inv.due_date));
      const bal = Number(inv.balance_due);
      const custId = inv.customer_id || 'unknown';
      const custName = `${inv.customers?.first_name || ''} ${inv.customers?.last_name || ''}`.trim();
      const company = inv.customers?.company_name || '';

      if (!byCustomer[custId]) byCustomer[custId] = { name: custName, company, id: custId, current: 0, d30: 0, d60: 0, d90: 0, d90plus: 0, total: 0, count: 0 };
      byCustomer[custId].total += bal;
      byCustomer[custId].count++;

      if (days <= 0) { buckets.current += bal; byCustomer[custId].current += bal; }
      else if (days <= 30) { buckets.d30 += bal; byCustomer[custId].d30 += bal; }
      else if (days <= 60) { buckets.d60 += bal; byCustomer[custId].d60 += bal; }
      else if (days <= 90) { buckets.d90 += bal; byCustomer[custId].d90 += bal; }
      else { buckets.d90plus += bal; byCustomer[custId].d90plus += bal; }
    });

    const totalAR = buckets.current + buckets.d30 + buckets.d60 + buckets.d90 + buckets.d90plus;
    const customers = Object.values(byCustomer).sort((a, b) => b.total - a.total);
    const topOverdue = open.sort((a: any, b: any) => Number(b.balance_due) - Number(a.balance_due)).slice(0, 10);

    return { buckets, totalAR, customers, topOverdue, openCount: open.length };
  }, [allInvoices]);

  const exportCSV = () => {
    const csv = [
      'Customer,Company,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total',
      ...arData.customers.map(c => `"${c.name}","${c.company}",${c.current.toFixed(2)},${c.d30.toFixed(2)},${c.d60.toFixed(2)},${c.d90.toFixed(2)},${c.d90plus.toFixed(2)},${c.total.toFixed(2)}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ar-aging.csv'; a.click();
  };

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  const bucketCards = [
    { label: 'Total Outstanding', value: arData.totalAR, color: 'text-foreground', bg: 'bg-primary/10' },
    { label: 'Current', value: arData.buckets.current, color: 'text-accent', bg: 'bg-accent/10' },
    { label: '1–30 Days', value: arData.buckets.d30, color: 'text-warning', bg: 'bg-warning/10' },
    { label: '31–60 Days', value: arData.buckets.d60, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: '61–90 Days', value: arData.buckets.d90, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: '90+ Days', value: arData.buckets.d90plus, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts Receivable</h1>
          <p className="text-sm text-muted-foreground">{arData.openCount} open invoices · {fmt(arData.totalAR)} outstanding</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      {/* Aging Buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {bucketCards.map(b => (
          <Card key={b.label}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">{b.label}</p>
              <p className={cn("text-lg font-bold", b.color)}>{fmt(b.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Customer A/R Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Aging by Customer</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1–30</TableHead>
                <TableHead className="text-right">31–60</TableHead>
                <TableHead className="text-right">61–90</TableHead>
                <TableHead className="text-right">90+</TableHead>
                <TableHead className="text-right font-bold">Total</TableHead>
                <TableHead className="text-right">#</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arData.customers.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No outstanding receivables</TableCell></TableRow>
              ) : arData.customers.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => nav(`/customers/${c.id}`)}>
                  <TableCell>
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.company && <p className="text-[10px] text-muted-foreground">{c.company}</p>}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono">{c.current > 0 ? fmt(c.current) : '—'}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{c.d30 > 0 ? fmt(c.d30) : '—'}</TableCell>
                  <TableCell className="text-right text-sm font-mono text-warning">{c.d60 > 0 ? fmt(c.d60) : '—'}</TableCell>
                  <TableCell className="text-right text-sm font-mono text-orange-500">{c.d90 > 0 ? fmt(c.d90) : '—'}</TableCell>
                  <TableCell className="text-right text-sm font-mono text-destructive">{c.d90plus > 0 ? fmt(c.d90plus) : '—'}</TableCell>
                  <TableCell className="text-right text-sm font-bold font-mono">{fmt(c.total)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{c.count}</TableCell>
                </TableRow>
              ))}
              {arData.customers.length > 0 && (
                <TableRow className="font-bold border-t-2 bg-muted/20">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right font-mono">{fmt(arData.buckets.current)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(arData.buckets.d30)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(arData.buckets.d60)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(arData.buckets.d90)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(arData.buckets.d90plus)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(arData.totalAR)}</TableCell>
                  <TableCell className="text-right">{arData.openCount}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Overdue Invoices */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Top Overdue Invoices</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arData.topOverdue.map((inv: any) => {
                const days = differenceInDays(new Date(), parseISO(inv.due_date));
                return (
                  <TableRow key={inv.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => nav(`/invoices/${inv.id}`)}>
                    <TableCell className="text-sm font-mono text-primary">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm">{inv.customers?.first_name} {inv.customers?.last_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{inv.due_date}</TableCell>
                    <TableCell>
                      {days > 0 ? <Badge variant="destructive" className="text-[10px]">{days}d overdue</Badge> : <Badge variant="outline" className="text-[10px]">Current</Badge>}
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold font-mono text-destructive">{fmt(Number(inv.balance_due))}</TableCell>
                  </TableRow>
                );
              })}
              {arData.topOverdue.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No overdue invoices</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
