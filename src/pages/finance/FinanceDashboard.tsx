import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinanceDashboard, useFinanceExpenses, useFinanceBills, useFinanceReceipts } from '@/hooks/useFinance';
import { DollarSign, TrendingUp, TrendingDown, Receipt, FileText, AlertTriangle, ArrowRight, CreditCard, BarChart3, Calendar, Landmark, Scale, Plus, Upload, CheckCircle, Users, Banknote, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, differenceInDays } from 'date-fns';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const COLORS = ['hsl(215,65%,48%)', 'hsl(158,50%,42%)', 'hsl(38,90%,50%)', 'hsl(0,68%,52%)', 'hsl(270,50%,50%)', 'hsl(180,50%,40%)', 'hsl(30,70%,50%)', 'hsl(340,60%,50%)'];

type DatePreset = 'today' | 'week' | 'month' | 'last_month' | 'custom';

export default function FinanceDashboard() {
  const nav = useNavigate();
  const [preset, setPreset] = useState<DatePreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const getDateRange = () => {
    const now = new Date();
    switch (preset) {
      case 'today': return { from: format(now, 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
      case 'week': return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
      case 'month': return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'last_month': { const lm = subMonths(now, 1); return { from: format(startOfMonth(lm), 'yyyy-MM-dd'), to: format(endOfMonth(lm), 'yyyy-MM-dd') }; }
      case 'custom': return { from: customFrom || undefined, to: customTo || undefined };
    }
  };

  const dateRange = getDateRange();
  const { data: stats, isLoading } = useFinanceDashboard(dateRange);
  const { data: recentExpenses } = useFinanceExpenses();
  const { data: recentBills } = useFinanceBills();
  const { data: recentReceipts } = useFinanceReceipts();

  // Compute extra warnings
  const pendingApprovalExpenses = (recentExpenses ?? []).filter((e: any) => e.status === 'submitted').length;
  const pendingReimbursements = (recentExpenses ?? []).filter((e: any) => e.status === 'approved').length;
  const billsDueSoon = (recentBills ?? []).filter((b: any) => {
    if (!b.due_date || b.status === 'paid' || b.status === 'void') return false;
    const days = differenceInDays(new Date(b.due_date), new Date());
    return days >= 0 && days <= 3;
  }).length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Finance Hub</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Revenue', value: fmt(stats?.totalRevenue ?? 0), icon: TrendingUp, color: 'text-accent', link: '/invoices' },
    { label: 'Total Expenses', value: fmt(stats?.totalExpenses ?? 0), icon: TrendingDown, color: 'text-destructive', link: '/finance/expenses' },
    { label: 'Gross Margin', value: fmt(stats?.grossMargin ?? 0), icon: DollarSign, color: (stats?.grossMargin ?? 0) >= 0 ? 'text-accent' : 'text-destructive', link: '/finance/job-costing' },
    { label: 'Outstanding Invoices', value: fmt(stats?.outstandingInvoices ?? 0), icon: FileText, color: 'text-primary', link: '/invoices' },
    { label: 'Open Bills', value: fmt(stats?.openBills ?? 0), icon: CreditCard, color: 'text-warning', link: '/finance/bills' },
    { label: 'Receipts to Review', value: String(stats?.receiptsAwaitingReview ?? 0), icon: Receipt, color: 'text-warning', link: '/finance/receipts' },
  ];

  const catData = Object.entries(stats?.categoryBreakdown ?? {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Hub</h1>
          <p className="text-sm text-muted-foreground">Financial overview and operations</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => nav('/finance/accounts')}>
            <Landmark className="h-4 w-4 mr-1" /> Accounts
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav('/finance/reconciliation')}>
            <Scale className="h-4 w-4 mr-1" /> Reconcile
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav('/finance/payroll')}>
            <Users className="h-4 w-4 mr-1" /> Payroll
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav('/finance/subcontractor-payouts')}>
            <Banknote className="h-4 w-4 mr-1" /> Payouts
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav('/finance/remittances')}>
            <FileCheck className="h-4 w-4 mr-1" /> Remittances
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav('/finance/reports')}>
            <BarChart3 className="h-4 w-4 mr-1" /> Reports
          </Button>
        </div>
      </div>

      {/* Date Range */}
      <div className="flex flex-wrap gap-2 items-center">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {(['today', 'week', 'month', 'last_month', 'custom'] as DatePreset[]).map(p => (
          <Button key={p} variant={preset === p ? 'default' : 'outline'} size="sm" onClick={() => setPreset(p)}>
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : p === 'last_month' ? 'Last Month' : 'Custom'}
          </Button>
        ))}
        {preset === 'custom' && (
          <div className="flex gap-2 items-center">
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-[140px] h-8" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-[140px] h-8" />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => nav(kpi.link)}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-lg bg-muted ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground truncate">{kpi.value}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => nav('/invoices/new')}><Plus className="h-3.5 w-3.5 mr-1" /> New Invoice</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/invoices')}><FileText className="h-3.5 w-3.5 mr-1" /> Invoice Hub</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/accounts-receivable')}><DollarSign className="h-3.5 w-3.5 mr-1" /> A/R Aging</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/statements')}><FileText className="h-3.5 w-3.5 mr-1" /> Statements</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/expenses')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Expense</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/bills')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Bill</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/receipts')}><Upload className="h-3.5 w-3.5 mr-1" /> Upload Receipt</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/vendors')}><Plus className="h-3.5 w-3.5 mr-1" /> Add Vendor</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/reconciliation')}><Scale className="h-3.5 w-3.5 mr-1" /> Reconcile</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/accounts')}><Landmark className="h-3.5 w-3.5 mr-1" /> Manage Accounts</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/payroll')}><Users className="h-3.5 w-3.5 mr-1" /> Payroll</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/subcontractor-payouts')}><Banknote className="h-3.5 w-3.5 mr-1" /> Payouts</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/remittances')}><FileCheck className="h-3.5 w-3.5 mr-1" /> Remittances</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/finance/tax-slips')}><FileText className="h-3.5 w-3.5 mr-1" /> Tax Slips</Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Spend by Category</CardTitle></CardHeader>
          <CardContent>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={catData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No expense data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Expense Distribution</CardTitle></CardHeader>
          <CardContent>
            {catData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No expense data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Finance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(stats?.receiptsAwaitingReview ?? 0) > 0 && (
              <Badge variant="outline" className="cursor-pointer border-warning text-warning" onClick={() => nav('/finance/receipts')}>
                {stats?.receiptsAwaitingReview} unreviewed receipts
              </Badge>
            )}
            {(stats?.overdueBillCount ?? 0) > 0 && (
              <Badge variant="outline" className="cursor-pointer border-destructive text-destructive" onClick={() => nav('/finance/bills')}>
                {stats?.overdueBillCount} overdue bills
              </Badge>
            )}
            {billsDueSoon > 0 && (
              <Badge variant="outline" className="cursor-pointer border-warning text-warning" onClick={() => nav('/finance/bills')}>
                {billsDueSoon} bills due in 3 days
              </Badge>
            )}
            {pendingApprovalExpenses > 0 && (
              <Badge variant="outline" className="cursor-pointer border-primary text-primary" onClick={() => nav('/finance/expenses')}>
                {pendingApprovalExpenses} expenses awaiting approval
              </Badge>
            )}
            {pendingReimbursements > 0 && (
              <Badge variant="outline" className="cursor-pointer border-accent text-accent" onClick={() => nav('/finance/expenses')}>
                {pendingReimbursements} pending reimbursements
              </Badge>
            )}
            {(stats?.outstandingInvoices ?? 0) > 0 && (
              <Badge variant="outline" className="cursor-pointer border-primary text-primary" onClick={() => nav('/invoices')}>
                {fmt(stats?.outstandingInvoices ?? 0)} outstanding AR
              </Badge>
            )}
            {(stats?.receiptsAwaitingReview ?? 0) === 0 && (stats?.overdueBillCount ?? 0) === 0 && (stats?.outstandingInvoices ?? 0) === 0 && billsDueSoon === 0 && pendingApprovalExpenses === 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-accent" /> No alerts — everything looks good
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Expenses</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => nav('/finance/expenses')}>View All</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentExpenses?.slice(0, 5) ?? []).map((e: any) => (
              <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{e.expense_number}</p>
                  <p className="text-xs text-muted-foreground">{e.category || 'Uncategorized'}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{fmt(Number(e.amount_total))}</p>
                  <Badge variant="outline" className="text-[10px]">{e.status}</Badge>
                </div>
              </div>
            ))}
            {(!recentExpenses || recentExpenses.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No expenses yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Bills</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => nav('/finance/bills')}>View All</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentBills?.slice(0, 5) ?? []).map((b: any) => (
              <div key={b.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{b.bill_number}</p>
                  <p className="text-xs text-muted-foreground">{(b as any).finance_vendors?.vendor_name || 'No vendor'}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{fmt(Number(b.total))}</p>
                  <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                </div>
              </div>
            ))}
            {(!recentBills || recentBills.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No bills yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Receipts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => nav('/finance/receipts')}>View All</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentReceipts?.slice(0, 5) ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{r.file_name}</p>
                  <p className="text-xs text-muted-foreground">{r.vendor_name_raw || 'Unknown vendor'}</p>
                </div>
                <Badge variant={r.review_status === 'unreviewed' ? 'destructive' : 'outline'} className="text-[10px]">{r.review_status}</Badge>
              </div>
            ))}
            {(!recentReceipts || recentReceipts.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No receipts yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
