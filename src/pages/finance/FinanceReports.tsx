import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceDashboard, useFinanceExpenses, useFinanceBills } from '@/hooks/useFinance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, Printer } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const COLORS = ['hsl(215,65%,48%)', 'hsl(158,50%,42%)', 'hsl(38,90%,50%)', 'hsl(0,68%,52%)', 'hsl(270,50%,50%)', 'hsl(180,50%,40%)', 'hsl(30,70%,50%)', 'hsl(340,60%,50%)'];

export default function FinanceReports() {
  const [tab, setTab] = useState('category');
  const { data: stats, isLoading } = useFinanceDashboard();
  const { data: expenses } = useFinanceExpenses();
  const { data: bills } = useFinanceBills();

  const { data: invoices } = useQuery({
    queryKey: ['finance_reports_invoices'],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('total, balance_due, status, issue_date');
      return data || [];
    },
  });

  // Expense by Category
  const catData = Object.entries(stats?.categoryBreakdown ?? {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Expense by Vendor
  const vendorMap: Record<string, number> = {};
  (expenses ?? []).forEach((e: any) => {
    const v = (e as any).finance_vendors?.vendor_name || 'Unknown';
    vendorMap[v] = (vendorMap[v] || 0) + Number(e.amount_total || 0);
  });
  const vendorData = Object.entries(vendorMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  // Invoice aging
  const invAging = { current: 0, '30days': 0, '60days': 0, '90plus': 0 };
  (invoices ?? []).filter((i: any) => ['sent', 'overdue'].includes(i.status)).forEach((i: any) => {
    const days = Math.floor((Date.now() - new Date(i.issue_date).getTime()) / 86400000);
    if (days <= 30) invAging.current += Number(i.balance_due);
    else if (days <= 60) invAging['30days'] += Number(i.balance_due);
    else if (days <= 90) invAging['60days'] += Number(i.balance_due);
    else invAging['90plus'] += Number(i.balance_due);
  });
  const agingData = [
    { name: 'Current', value: invAging.current },
    { name: '31-60 Days', value: invAging['30days'] },
    { name: '61-90 Days', value: invAging['60days'] },
    { name: '90+ Days', value: invAging['90plus'] },
  ];

  // Bills aging
  const billAging = { current: 0, '30days': 0, '60days': 0, '90plus': 0 };
  (bills ?? []).filter((b: any) => ['open', 'partial', 'overdue'].includes(b.status)).forEach((b: any) => {
    const days = Math.floor((Date.now() - new Date(b.bill_date).getTime()) / 86400000);
    if (days <= 30) billAging.current += Number(b.balance_due);
    else if (days <= 60) billAging['30days'] += Number(b.balance_due);
    else if (days <= 90) billAging['60days'] += Number(b.balance_due);
    else billAging['90plus'] += Number(b.balance_due);
  });
  const billAgingData = [
    { name: 'Current', value: billAging.current },
    { name: '31-60 Days', value: billAging['30days'] },
    { name: '61-90 Days', value: billAging['60days'] },
    { name: '90+ Days', value: billAging['90plus'] },
  ];

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Reports</h1>
          <p className="text-sm text-muted-foreground">Preset financial reports and analysis</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="category">By Category</TabsTrigger>
          <TabsTrigger value="vendor">By Vendor</TabsTrigger>
          <TabsTrigger value="inv-aging">Invoice Aging</TabsTrigger>
          <TabsTrigger value="bill-aging">Bills Aging</TabsTrigger>
          <TabsTrigger value="revenue-expense">Revenue vs Expense</TabsTrigger>
        </TabsList>

        <TabsContent value="category">
          <Card>
            <CardHeader><CardTitle className="text-sm">Expense by Category</CardTitle></CardHeader>
            <CardContent>
              {catData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={catData} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => fmt(v)} />
                    <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">No data available</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Vendors by Spend</CardTitle></CardHeader>
            <CardContent>
              {vendorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={vendorData} layout="vertical" margin={{ left: 120 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => fmt(v)} />
                    <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground py-12">No data available</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inv-aging">
          <Card>
            <CardHeader><CardTitle className="text-sm">Invoices Aging (Accounts Receivable)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => fmt(v)} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bill-aging">
          <Card>
            <CardHeader><CardTitle className="text-sm">Bills Aging (Accounts Payable)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={billAgingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(v) => fmt(v)} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue-expense">
          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue vs Expenses Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center mb-6">
                <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-xl font-bold text-accent">{fmt(stats?.totalRevenue ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Expenses</p><p className="text-xl font-bold text-destructive">{fmt(stats?.totalExpenses ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Net</p><p className={`text-xl font-bold ${(stats?.grossMargin ?? 0) >= 0 ? 'text-accent' : 'text-destructive'}`}>{fmt(stats?.grossMargin ?? 0)}</p></div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={[{ name: 'Revenue', value: stats?.totalRevenue ?? 0 }, { name: 'Expenses', value: stats?.totalExpenses ?? 0 }]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${fmt(value)}`}>
                    <Cell fill="hsl(var(--accent))" />
                    <Cell fill="hsl(var(--destructive))" />
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
