import React, { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  useIsPersonalOwner, useClaimPersonalOwnership, usePersonalExpenses, usePersonalFundingSources,
  usePersonalIncome, usePersonalPayments, useUpsertPersonalExpense, useDeletePersonalExpense,
  useUpsertFundingSource, useDeleteFundingSource, useUpsertIncome, useDeleteIncome, useMarkPaid, useSeedFromNotepad,
  useUpdatePayment, useDeletePayment,
} from '@/hooks/usePersonalAccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Plus, Sprout, Calendar as CalIcon, Printer, Download, FileText, Trash2, Pencil, CheckCircle2, CreditCard, Wallet, Receipt, Repeat, Briefcase, AlertTriangle, TrendingUp, TrendingDown, Copy, LockKeyhole, Eye } from 'lucide-react';
import PersonalPinGate from '@/components/PersonalPinGate';
import { useSessionUnlock } from '@/hooks/usePersonalAccountsPin';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { format, differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

const CATEGORY_META: Record<string, { label: string; color: string; icon: any }> = {
  payment: { label: 'Payment', color: '#dc2626', icon: CreditCard },
  bill: { label: 'Bill', color: '#0ea5e9', icon: Receipt },
  subscription: { label: 'Subscription', color: '#8b5cf6', icon: Repeat },
  business_writeoff: { label: 'Business Write-off', color: '#16a34a', icon: Briefcase },
  other: { label: 'Other', color: '#64748b', icon: Wallet },
};

const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

function downloadCSV(filename: string, rows: any[]) {
  if (!rows.length) { toast.error('Nothing to export'); return; }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}`);
}

function downloadICS(expenses: any[]) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PraetoriaPersonal//EN', 'CALSCALE:GREGORIAN'];
  expenses.forEach(e => {
    if (!e.next_due_date) return;
    const dt = e.next_due_date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.id}@personal.praetoriagroup.ca`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-]|[:]|[.]/g, '').slice(0, 15)}Z`);
    lines.push(`DTSTART;VALUE=DATE:${dt}`);
    lines.push(`SUMMARY:Pay ${e.account_name} — ${fmt(e.minimum_amount)}`);
    lines.push(`DESCRIPTION:${CATEGORY_META[e.category]?.label || e.category}${e.is_business_writeoff ? ' (Business write-off)' : ''}`);
    lines.push('RRULE:FREQ=MONTHLY');
    lines.push(`BEGIN:VALARM\nACTION:DISPLAY\nDESCRIPTION:${e.account_name} due\nTRIGGER:-PT${(e.reminder_days_before || 3) * 24}H\nEND:VALARM`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'personal-accounts.ics'; a.click();
  URL.revokeObjectURL(url);
  toast.success('Calendar file downloaded — import into Google/Apple/Outlook');
}

// ============ Sub-components defined outside main (per project rule) ============

function ExpenseDialog({ open, onOpenChange, editing, fundingSources, onSave }: any) {
  const [form, setForm] = useState<any>(editing || {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Personal Expense</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Account Name *</Label><Input value={form.account_name || ''} onChange={e => setForm({ ...form, account_name: e.target.value })} placeholder="e.g. Capital One Card" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category *</Label>
              <Select value={form.category || 'payment'} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_META).map(([v, m]) => <SelectItem key={v} value={v}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Due Day (1–31) *</Label><Input type="number" min="1" max="31" value={form.due_day || ''} onChange={e => setForm({ ...form, due_day: parseInt(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Minimum Amount *</Label><Input type="number" step="0.01" value={form.minimum_amount || ''} onChange={e => setForm({ ...form, minimum_amount: parseFloat(e.target.value) })} /></div>
            <div><Label>Full Amount</Label><Input type="number" step="0.01" value={form.full_amount || ''} onChange={e => setForm({ ...form, full_amount: parseFloat(e.target.value) || null })} /></div>
          </div>
          <div><Label>Funding Source</Label>
            <Select value={form.funding_source_id || 'none'} onValueChange={v => setForm({ ...form, funding_source_id: v === 'none' ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Which card/account?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {fundingSources.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name} ({f.source_type})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded border p-3"><div><Label>Business Write-off</Label><p className="text-xs text-muted-foreground">Tag for accountant at tax time</p></div><Switch checked={form.is_business_writeoff || false} onCheckedChange={v => setForm({ ...form, is_business_writeoff: v })} /></div>
          <div><Label>Reminder Days Before Due</Label><Input type="number" value={form.reminder_days_before ?? 3} onChange={e => setForm({ ...form, reminder_days_before: parseInt(e.target.value) })} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={() => { onSave(form); onOpenChange(false); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FundingSourceDialog({ open, onOpenChange, editing, onSave }: any) {
  const [form, setForm] = useState<any>({ source_type: 'credit_card' });
  // Reset form whenever dialog opens with new "editing" target
  React.useEffect(() => {
    if (open) setForm(editing && editing.id ? { ...editing } : { source_type: 'credit_card' });
  }, [open, editing]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Funding Source</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Capital One Visa" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={form.source_type} onValueChange={v => setForm({ ...form, source_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="line_of_credit">Line of Credit</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Last 4 digits</Label><Input maxLength={4} value={form.last4 || ''} onChange={e => setForm({ ...form, last4: e.target.value })} /></div>
          </div>

          <div className="rounded border p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Last Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Last Paid Date</Label><Input type="date" value={form.last_paid_date || ''} onChange={e => setForm({ ...form, last_paid_date: e.target.value || null })} /></div>
              <div><Label>Amount Paid</Label><Input type="number" step="0.01" value={form.last_paid_amount ?? ''} onChange={e => setForm({ ...form, last_paid_amount: e.target.value === '' ? null : parseFloat(e.target.value) })} /></div>
            </div>
            <div><Label>Payment Type</Label>
              <Select value={form.last_payment_type || 'none'} onValueChange={v => setForm({ ...form, last_payment_type: v === 'none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Full / Minimum / Partial" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Not specified —</SelectItem>
                  <SelectItem value="full">Full (paid off entirely)</SelectItem>
                  <SelectItem value="minimum">Minimum (only required min)</SelectItem>
                  <SelectItem value="partial">Partial (regular installment, e.g. mortgage)</SelectItem>
                  <SelectItem value="scheduled">Scheduled (auto-debit / fixed)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">Tip: For mortgages or loans paid in fixed monthly installments, "Partial" is correct — you're paying down a long-term balance.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Current Balance</Label><Input type="number" step="0.01" value={form.current_balance ?? ''} onChange={e => setForm({ ...form, current_balance: e.target.value === '' ? null : parseFloat(e.target.value) })} placeholder="What you owe" /></div>
            <div><Label>Credit Limit</Label><Input type="number" step="0.01" value={form.credit_limit ?? ''} onChange={e => setForm({ ...form, credit_limit: e.target.value === '' ? null : parseFloat(e.target.value) })} placeholder="(if applicable)" /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Interest Rate (APR %)</Label><Input type="number" step="0.01" value={form.interest_rate ?? ''} onChange={e => setForm({ ...form, interest_rate: e.target.value === '' ? null : parseFloat(e.target.value) })} placeholder="e.g. 19.99" /></div>
            <div><Label>Minimum Payment ($/mo)</Label><Input type="number" step="0.01" value={form.minimum_payment ?? ''} onChange={e => setForm({ ...form, minimum_payment: e.target.value === '' ? null : parseFloat(e.target.value) })} placeholder="Required monthly min" /></div>
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={() => { onSave(form); onOpenChange(false); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncomeDialog({ open, onOpenChange, editing, onSave }: any) {
  const [form, setForm] = useState<any>(editing || { income_type: 'recurring' });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing?.id ? 'Edit' : 'Add'} Income Source</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Source Name *</Label><Input value={form.source_name || ''} onChange={e => setForm({ ...form, source_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Monthly Amount *</Label><Input type="number" step="0.01" value={form.monthly_amount || ''} onChange={e => setForm({ ...form, monthly_amount: parseFloat(e.target.value) })} /></div>
            <div><Label>Expected Day</Label><Input type="number" min="1" max="31" value={form.expected_day || ''} onChange={e => setForm({ ...form, expected_day: parseInt(e.target.value) || null })} /></div>
          </div>
          <div><Label>Type</Label>
            <Select value={form.income_type} onValueChange={v => setForm({ ...form, income_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recurring">Recurring</SelectItem>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter><Button onClick={() => { onSave(form); onOpenChange(false); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkPaidDialog({ open, onOpenChange, expense, fundingSources, onConfirm }: any) {
  const [amount, setAmount] = useState(expense?.minimum_amount || 0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState('full');
  const [fund, setFund] = useState(expense?.funding_source_id || 'none');
  if (!expense) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Mark "{expense.account_name}" as Paid</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount *</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} /></div>
            <div><Label>Paid Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <div><Label>Payment Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="full">Full</SelectItem><SelectItem value="minimum">Minimum</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Paid From</Label>
            <Select value={fund} onValueChange={setFund}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Not specified —</SelectItem>
                {fundingSources.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onConfirm({ amount_paid: amount, paid_date: date, payment_type: type, funding_source_id: fund === 'none' ? null : fund }); onOpenChange(false); }}>
            <CheckCircle2 className="h-4 w-4 mr-2" />Confirm Paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPaymentDialog({ open, onOpenChange, payment, fundingSources, onSave }: any) {
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState('');
  const [type, setType] = useState('full');
  const [fund, setFund] = useState('none');
  React.useEffect(() => {
    if (open && payment) {
      setAmount(Number(payment.amount_paid) || 0);
      setDate(payment.paid_date || format(new Date(), 'yyyy-MM-dd'));
      setType(payment.payment_type || 'full');
      setFund(payment.funding_source_id || 'none');
    }
  }, [open, payment]);
  if (!payment) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Payment — {payment.personal_expenses?.account_name || 'Card payment'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount *</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} /></div>
            <div><Label>Paid Date *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <div><Label>Payment Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="full">Full</SelectItem><SelectItem value="minimum">Minimum</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Paid From</Label>
            <Select value={fund} onValueChange={setFund}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Not specified —</SelectItem>
                {fundingSources.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => { onSave({ id: payment.id, amount_paid: amount, paid_date: date, payment_type: type, funding_source_id: fund === 'none' ? null : fund }); onOpenChange(false); }}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Main page ============

export default function PersonalAccountsPage() {
  const { user } = useAuth();
  const isOwnerQ = useIsPersonalOwner();
  const claim = useClaimPersonalOwnership();
  const expensesQ = usePersonalExpenses();
  const fundingQ = usePersonalFundingSources();
  const incomeQ = usePersonalIncome();
  const paymentsQ = usePersonalPayments();
  const upsertExpense = useUpsertPersonalExpense();
  const delExpense = useDeletePersonalExpense();
  const upsertFunding = useUpsertFundingSource();
  const delFunding = useDeleteFundingSource();
  const upsertIncome = useUpsertIncome();
  const delIncome = useDeleteIncome();
  const markPaid = useMarkPaid();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const seed = useSeedFromNotepad();
  const { unlocked, lock } = useSessionUnlock();

  const [expenseDialog, setExpenseDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });
  const [fundingDialog, setFundingDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });
  const [incomeDialog, setIncomeDialog] = useState<{ open: boolean; editing: any }>({ open: false, editing: null });
  const [paidDialog, setPaidDialog] = useState<{ open: boolean; expense: any }>({ open: false, expense: null });
  const [editPaymentDialog, setEditPaymentDialog] = useState<{ open: boolean; payment: any }>({ open: false, payment: null });
  const [cardHistoryDialog, setCardHistoryDialog] = useState<{ open: boolean; card: any }>({ open: false, card: null });
  const [payoffStrategy, setPayoffStrategy] = useState<'snowball' | 'avalanche'>('avalanche');
  const [extraPayment, setExtraPayment] = useState<number>(500);

  // ---- Loading / not-claimed gates ----
  if (isOwnerQ.isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  if (!isOwnerQ.data) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-6 w-6 text-primary" />
              <CardTitle>Personal Accounts — Private Vault</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is a private space for tracking your personal monthly bills, payments, and income.
              It is <strong>walled off from the business books</strong>, and only you (the user who claims it) will ever see this data.
            </p>
            <div className="rounded border-l-4 border-amber-500 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>One-time setup:</strong> Click below to claim this vault as <code>{user?.email}</code>. After that, no other admin or user can access it.
            </div>
            <Button onClick={() => claim.mutate()} disabled={claim.isPending} className="w-full">
              <Lock className="h-4 w-4 mr-2" />Claim Personal Vault for {user?.email}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- PIN gate (after claim, before content) ----
  if (!unlocked) {
    return <PersonalPinGate ownerEmail={user?.email} onUnlocked={() => {}} />;
  }

  // ---- Computed metrics ----
  const expenses = expensesQ.data || [];
  const funding = fundingQ.data || [];
  const income = incomeQ.data || [];
  const payments = paymentsQ.data || [];

  const totalMinMonthly = expenses.reduce((s: number, e: any) => s + Number(e.minimum_amount || 0), 0);
  const totalIncome = income.reduce((s: number, i: any) => s + Number(i.monthly_amount || 0), 0);
  const surplus = totalIncome - totalMinMonthly;
  const businessWriteoff = expenses.filter((e: any) => e.is_business_writeoff).reduce((s: number, e: any) => s + Number(e.minimum_amount || 0), 0);

  const today = new Date();
  const overdue = expenses.filter((e: any) => e.next_due_date && parseISO(e.next_due_date) < today);
  const dueSoon = expenses.filter((e: any) => {
    if (!e.next_due_date) return false;
    const d = differenceInDays(parseISO(e.next_due_date), today);
    return d >= 0 && d <= 7;
  });

  const byCategory = Object.entries(
    expenses.reduce((acc: any, e: any) => { acc[e.category] = (acc[e.category] || 0) + Number(e.minimum_amount); return acc; }, {})
  ).map(([k, v]) => ({ name: CATEGORY_META[k]?.label || k, value: v as number, color: CATEGORY_META[k]?.color || '#64748b' }));

  const bySource = funding.map((f: any) => ({
    name: f.name,
    value: expenses.filter((e: any) => e.funding_source_id === f.id).reduce((s: number, e: any) => s + Number(e.minimum_amount), 0),
  })).filter((x: any) => x.value > 0);

  const incomeVsExpense = [{ name: 'This Month', Income: totalIncome, Expenses: totalMinMonthly }];

  // 12-month forecast (recurring)
  const forecast = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { month: format(d, 'MMM'), Expenses: totalMinMonthly, Income: totalIncome, Net: totalIncome - totalMinMonthly };
  });

  // Funding sources: limits vs current balance (for chart)
  const fundingLimitsData = funding
    .filter((f: any) => Number(f.credit_limit || 0) > 0 || Number(f.current_balance || 0) > 0)
    .map((f: any) => ({
      name: f.name.length > 14 ? f.name.slice(0, 12) + '…' : f.name,
      Limit: Number(f.credit_limit || 0),
      Balance: Number(f.current_balance || 0),
      Available: Math.max(0, Number(f.credit_limit || 0) - Number(f.current_balance || 0)),
    }));
  const totalLimits = fundingLimitsData.reduce((s: number, f: any) => s + f.Limit, 0);
  const totalBalances = fundingLimitsData.reduce((s: number, f: any) => s + f.Balance, 0);
  const totalAvailable = totalLimits - totalBalances;

  // (payoffStrategy/extraPayment hooks moved to top of component to keep hook order stable)

  const debts = funding
    .filter((f: any) => Number(f.current_balance || 0) > 0)
    .map((f: any) => ({
      id: f.id,
      name: f.name,
      balance: Number(f.current_balance || 0),
      apr: Number(f.interest_rate || 0),
      minimum: Number(f.minimum_payment || 0) || Math.max(25, Number(f.current_balance || 0) * 0.02),
    }));

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayments = debts.reduce((s, d) => s + d.minimum, 0);

  const simulatePayoff = (strategy: 'snowball' | 'avalanche', extra: number) => {
    const list = debts.map(d => ({ ...d }));
    if (list.length === 0) return { months: 0, totalInterest: 0, payoffDate: null as Date | null, schedule: [] as any[] };
    let month = 0;
    let totalInterest = 0;
    const schedule: any[] = [];
    const maxMonths = 600;
    while (list.some(d => d.balance > 0.01) && month < maxMonths) {
      month++;
      // Sort active debts by strategy
      const active = list.filter(d => d.balance > 0.01);
      active.sort((a, b) => strategy === 'snowball' ? a.balance - b.balance : b.apr - a.apr);
      // Apply interest + minimums
      let extraPool = extra;
      for (const d of list) {
        if (d.balance <= 0.01) continue;
        const interest = (d.balance * (d.apr / 100)) / 12;
        totalInterest += interest;
        d.balance += interest;
        const pay = Math.min(d.minimum, d.balance);
        d.balance -= pay;
      }
      // Apply extra to top-priority debt
      for (const target of active) {
        const live = list.find(d => d.id === target.id)!;
        if (live.balance <= 0.01) continue;
        const apply = Math.min(extraPool, live.balance);
        live.balance -= apply;
        extraPool -= apply;
        if (extraPool <= 0) break;
      }
      const remaining = list.reduce((s, d) => s + Math.max(0, d.balance), 0);
      schedule.push({ month, remaining: Math.round(remaining) });
    }
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + month);
    return { months: month, totalInterest, payoffDate, schedule };
  };

  const minOnlyPlan = simulatePayoff(payoffStrategy, 0);
  const acceleratedPlan = simulatePayoff(payoffStrategy, extraPayment);
  const interestSaved = Math.max(0, minOnlyPlan.totalInterest - acceleratedPlan.totalInterest);
  const monthsSaved = Math.max(0, minOnlyPlan.months - acceleratedPlan.months);
  const payoffOrder = [...debts].sort((a, b) => payoffStrategy === 'snowball' ? a.balance - b.balance : b.apr - a.apr);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="h-6 w-6 text-primary" /> Personal Accounts</h1>
          <p className="text-sm text-muted-foreground">Private — only visible to {user?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { lock(); toast.success('Vault locked'); }} className="border-amber-300 text-amber-700 hover:bg-amber-50"><LockKeyhole className="h-4 w-4 mr-1" />Lock Now</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV('personal-expenses.csv', expenses.map((e: any) => ({
            account: e.account_name, category: e.category, minimum: e.minimum_amount, full: e.full_amount, due_day: e.due_day, next_due: e.next_due_date, business_writeoff: e.is_business_writeoff,
          })))}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button size="sm" variant="outline" onClick={() => downloadICS(expenses)}><CalIcon className="h-4 w-4 mr-1" />Calendar (.ics)</Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV('personal-payment-history.csv', payments)}><FileText className="h-4 w-4 mr-1" />Payment Log</Button>
          {expenses.length === 0 && (
            <Button size="sm" variant="secondary" onClick={() => seed.mutate()} disabled={seed.isPending}><Sprout className="h-4 w-4 mr-1" />Seed 29 from notepad</Button>
          )}
          <Button size="sm" onClick={() => setExpenseDialog({ open: true, editing: {} })}><Plus className="h-4 w-4 mr-1" />Add Expense</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Monthly Income</p><p className="text-2xl font-bold text-green-600">{fmt(totalIncome)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Monthly Min Expenses</p><p className="text-2xl font-bold text-red-600">{fmt(totalMinMonthly)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net (Surplus / Deficit)</p><p className={`text-2xl font-bold ${surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}>{surplus >= 0 ? '+' : ''}{fmt(surplus)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Business Write-offs</p><p className="text-2xl font-bold text-blue-600">{fmt(businessWriteoff)}</p></CardContent></Card>
      </div>

      {/* Alerts */}
      {(overdue.length > 0 || dueSoon.length > 0) && (
        <Card className="border-amber-500 border-2 print:hidden">
          <CardContent className="p-4 space-y-2">
            {overdue.length > 0 && (
              <div className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" /><strong>{overdue.length} overdue:</strong> {overdue.slice(0, 3).map((e: any) => e.account_name).join(', ')}{overdue.length > 3 && ` +${overdue.length - 3} more`}</div>
            )}
            {dueSoon.length > 0 && (
              <div className="flex items-center gap-2 text-amber-700"><CalIcon className="h-5 w-5" /><strong>{dueSoon.length} due in next 7 days:</strong> {dueSoon.slice(0, 3).map((e: any) => `${e.account_name} (${format(parseISO(e.next_due_date), 'MMM d')})`).join(', ')}</div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="expenses">
        <TabsList className="print:hidden">
          <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="income">Income ({income.length})</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="funding">Funding Sources ({funding.length})</TabsTrigger>
          <TabsTrigger value="history">Payment History ({payments.length})</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          <TabsTrigger value="payoff">💪 Debt Payoff</TabsTrigger>
        </TabsList>

        {/* Expenses */}
        <TabsContent value="expenses" className="space-y-2">
          {expenses.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No expenses yet — click "Seed 29 from notepad" or "Add Expense"</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2">#</th><th className="p-2">Account</th><th className="p-2">Category</th><th className="p-2 text-right">Min</th><th className="p-2 text-right">Full</th><th className="p-2">Due</th><th className="p-2">Funding</th><th className="p-2">Tags</th><th className="p-2 print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e: any, i: number) => {
                    const meta = CATEGORY_META[e.category] || CATEGORY_META.other;
                    const Icon = meta.icon;
                    const due = e.next_due_date ? parseISO(e.next_due_date) : null;
                    const daysAway = due ? differenceInDays(due, today) : null;
                    return (
                      <tr key={e.id} className="border-t hover:bg-muted/30">
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-medium">{e.account_name}</td>
                        <td className="p-2"><Badge variant="outline" style={{ borderColor: meta.color, color: meta.color }}><Icon className="h-3 w-3 mr-1" />{meta.label}</Badge></td>
                        <td className="p-2 text-right font-mono">{fmt(e.minimum_amount)}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">{e.full_amount ? fmt(e.full_amount) : '—'}</td>
                        <td className="p-2"><div>{due ? format(due, 'MMM d') : `Day ${e.due_day}`}</div>{daysAway !== null && <div className={`text-xs ${daysAway < 0 ? 'text-red-600' : daysAway <= 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>{daysAway < 0 ? `${Math.abs(daysAway)}d overdue` : `in ${daysAway}d`}</div>}</td>
                        <td className="p-2 text-xs text-muted-foreground">{e.personal_funding_sources?.name || '—'}</td>
                        <td className="p-2">{e.is_business_writeoff && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Briefcase className="h-3 w-3 mr-1" />Write-off</Badge>}</td>
                        <td className="p-2 print:hidden">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white h-7 px-2"
                              title={`Quick pay ${fmt(e.minimum_amount)} today`}
                              disabled={markPaid.isPending}
                              onClick={() => {
                                markPaid.mutate({
                                  expense_id: e.id,
                                  amount_paid: Number(e.minimum_amount || 0),
                                  paid_date: format(today, 'yyyy-MM-dd'),
                                  payment_type: 'partial',
                                  funding_source_id: e.funding_source_id || null,
                                });
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />Pay
                            </Button>
                            <Button size="sm" variant="outline" title="Mark paid with details…" onClick={() => setPaidDialog({ open: true, expense: e })}><CheckCircle2 className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setExpenseDialog({ open: true, editing: e })}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${e.account_name}"?`)) delExpense.mutate(e.id); }}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/30 font-bold"><tr><td className="p-2" colSpan={3}>TOTAL ({expenses.length} accounts)</td><td className="p-2 text-right font-mono">{fmt(totalMinMonthly)}</td><td colSpan={5}></td></tr></tfoot>
              </table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Income */}
        <TabsContent value="income" className="space-y-2">
          <div className="flex justify-end print:hidden"><Button size="sm" onClick={() => setIncomeDialog({ open: true, editing: {} })}><Plus className="h-4 w-4 mr-1" />Add Income</Button></div>
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-left"><th className="p-2">Source</th><th className="p-2">Type</th><th className="p-2 text-right">Monthly</th><th className="p-2">Expected Day</th><th className="p-2 print:hidden">Actions</th></tr></thead>
              <tbody>
                {income.map((i: any) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2 font-medium">{i.source_name}</td>
                    <td className="p-2 capitalize">{i.income_type}</td>
                    <td className="p-2 text-right font-mono text-green-600">{fmt(i.monthly_amount)}</td>
                    <td className="p-2">{i.expected_day ? `Day ${i.expected_day}` : '—'}</td>
                    <td className="p-2 print:hidden"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setIncomeDialog({ open: true, editing: i })}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${i.source_name}"?`)) delIncome.mutate(i.id); }}><Trash2 className="h-3 w-3 text-red-500" /></Button></div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 font-bold"><tr><td className="p-2" colSpan={2}>TOTAL</td><td className="p-2 text-right font-mono text-green-600">{fmt(totalIncome)}</td><td colSpan={2}></td></tr></tfoot>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Charts */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-base">By Category</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => fmt(e.value)}>{byCategory.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}</Pie><Tooltip formatter={(v: any) => fmt(v)} /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Income vs Expenses (This Month)</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={incomeVsExpense}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: any) => fmt(v)} /><Legend /><Bar dataKey="Income" fill="#16a34a" /><Bar dataKey="Expenses" fill="#dc2626" /></BarChart></ResponsiveContainer></CardContent></Card>
            {bySource.length > 0 && <Card><CardHeader><CardTitle className="text-base">By Funding Source</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><BarChart data={bySource}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: any) => fmt(v)} /><Bar dataKey="value" fill="#0F172A" /></BarChart></ResponsiveContainer></CardContent></Card>}
            <Card><CardHeader><CardTitle className="text-base">12-Month Cash Flow Forecast</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={300}><LineChart data={forecast}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v: any) => fmt(v)} /><Legend /><Line type="monotone" dataKey="Income" stroke="#16a34a" strokeWidth={2} /><Line type="monotone" dataKey="Expenses" stroke="#dc2626" strokeWidth={2} /><Line type="monotone" dataKey="Net" stroke="#0F172A" strokeWidth={3} /></LineChart></ResponsiveContainer></CardContent></Card>

            {/* NEW: Funding Source Limits vs Balances */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funding Sources — Limits vs Balances</CardTitle>
                <p className="text-xs text-muted-foreground">Total Limits: <span className="text-green-600 font-semibold">{fmt(totalLimits)}</span> · Owed: <span className="text-red-600 font-semibold">{fmt(totalBalances)}</span> · Available: <span className="text-blue-600 font-semibold">{fmt(totalAvailable)}</span></p>
              </CardHeader>
              <CardContent>
                {fundingLimitsData.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">Add a Credit Limit and Current Balance to your funding sources to see this chart.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fundingLimitsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="Limit" fill="#16a34a" />
                      <Bar dataKey="Balance" fill="#dc2626" />
                      <Bar dataKey="Available" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Funding Sources */}
        <TabsContent value="funding" className="space-y-2">
          <div className="flex justify-end print:hidden"><Button size="sm" onClick={() => setFundingDialog({ open: true, editing: {} })}><Plus className="h-4 w-4 mr-1" />Add Funding Source</Button></div>
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2">Name</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Last 4</th>
                  <th className="p-2">Last Paid</th>
                  <th className="p-2">Month</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2">Type</th>
                  <th className="p-2 text-right">Balance</th>
                  <th className="p-2 text-right">Limit</th>
                  <th className="p-2 text-right">Linked Exp.</th>
                  <th className="p-2 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody>
                {funding.map((f: any) => {
                  const linked = expenses.filter((e: any) => e.funding_source_id === f.id).reduce((s: number, e: any) => s + Number(e.minimum_amount), 0);
                  const lpd = f.last_paid_date ? parseISO(f.last_paid_date) : null;
                  return (
                    <tr key={f.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 font-medium">{f.name}</td>
                      <td className="p-2 capitalize">{f.source_type.replace('_', ' ')}</td>
                      <td className="p-2">{f.last4 ? `••••${f.last4}` : '—'}</td>
                      <td className="p-2">{lpd ? format(lpd, 'MMM d, yyyy') : '—'}</td>
                      <td className="p-2">{lpd ? format(lpd, 'MMMM') : '—'}</td>
                      <td className="p-2 text-right font-mono">{f.last_paid_amount != null ? fmt(f.last_paid_amount) : '—'}</td>
                      <td className="p-2">{f.last_payment_type ? <Badge variant="outline" className="capitalize">{f.last_payment_type}</Badge> : '—'}</td>
                      <td className="p-2 text-right font-mono text-red-600">{f.current_balance != null ? fmt(f.current_balance) : '—'}</td>
                      <td className="p-2 text-right font-mono font-semibold text-green-600">{f.credit_limit != null ? fmt(f.credit_limit) : '—'}</td>
                      <td className="p-2 text-right font-mono">{fmt(linked)}</td>
                      <td className="p-2 print:hidden">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" title="View payment history" onClick={() => setCardHistoryDialog({ open: true, card: f })}><Eye className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setFundingDialog({ open: true, editing: f })}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${f.name}"?`)) delFunding.mutate(f.id); }}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {funding.length === 0 && <tr><td colSpan={11} className="p-6 text-center text-muted-foreground">No funding sources yet — add cards or accounts to track which one each expense comes from.</td></tr>}
              </tbody>
              {funding.length > 0 && (() => {
                const totLimit = funding.reduce((s: number, f: any) => s + Number(f.credit_limit || 0), 0);
                const totBalance = funding.reduce((s: number, f: any) => s + Number(f.current_balance || 0), 0);
                const totLinked = funding.reduce((s: number, f: any) => s + expenses.filter((e: any) => e.funding_source_id === f.id).reduce((ss: number, e: any) => ss + Number(e.minimum_amount), 0), 0);
                return (
                  <tfoot className="bg-muted/30 font-bold">
                    <tr>
                      <td className="p-2" colSpan={7}>TOTALS ({funding.length} sources)</td>
                      <td className="p-2 text-right font-mono text-red-600">{fmt(totBalance)}</td>
                      <td className="p-2 text-right font-mono text-green-600">{fmt(totLimit)}</td>
                      <td className="p-2 text-right font-mono">{fmt(totLinked)}</td>
                      <td className="print:hidden"></td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </CardContent></Card>
          <p className="text-xs text-muted-foreground px-1">
            💡 <strong>Linked Exp.</strong> shows the total of all monthly bills assigned to this card (in the Expenses tab, set "Funding Source" on each bill). If it shows $0, none of your expenses are linked to that card yet.
          </p>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-2">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-left">
                <th className="p-2">Paid Date</th>
                <th className="p-2">Month</th>
                <th className="p-2">Bill / Account</th>
                <th className="p-2">Paid From (Card)</th>
                <th className="p-2">Type</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-right print:hidden">Actions</th>
              </tr></thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{format(parseISO(p.paid_date), 'MMM d, yyyy')}</td>
                    <td className="p-2 text-muted-foreground">{format(parseISO(p.paid_date), 'MMMM yyyy')}</td>
                    <td className="p-2 font-medium">{p.personal_expenses?.account_name || <span className="italic text-muted-foreground">Card payment</span>}</td>
                    <td className="p-2">{p.personal_funding_sources?.name ? `${p.personal_funding_sources.name}${p.personal_funding_sources.last4 ? ` ••${p.personal_funding_sources.last4}` : ''}` : '—'}</td>
                    <td className="p-2"><Badge variant="outline" className="capitalize">{p.payment_type}</Badge></td>
                    <td className="p-2 text-right font-mono">{fmt(p.amount_paid)}</td>
                    <td className="p-2 text-right print:hidden">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" title="Edit payment" onClick={() => setEditPaymentDialog({ open: true, payment: p })}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" title="Delete payment" onClick={() => { if (confirm(`Delete payment of ${fmt(p.amount_paid)} on ${format(parseISO(p.paid_date), 'MMM d, yyyy')}?`)) deletePayment.mutate(p.id); }}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No payments recorded yet. Click ✓ on any expense or edit a card's "Last Paid" to log one.</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Monthly Summary */}
        <TabsContent value="monthly" className="space-y-2">
          <Card><CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr className="text-left">
                <th className="p-2">Month</th>
                <th className="p-2 text-center"># Payments</th>
                <th className="p-2 text-right">Total Paid</th>
                <th className="p-2 text-right">Full</th>
                <th className="p-2 text-right">Minimum</th>
                <th className="p-2 text-right">Partial</th>
              </tr></thead>
              <tbody>
                {(() => {
                  const groups: Record<string, any> = {};
                  payments.forEach((p: any) => {
                    const key = format(parseISO(p.paid_date), 'yyyy-MM');
                    if (!groups[key]) groups[key] = { label: format(parseISO(p.paid_date), 'MMMM yyyy'), count: 0, total: 0, full: 0, minimum: 0, partial: 0 };
                    groups[key].count += 1;
                    groups[key].total += Number(p.amount_paid);
                    groups[key][p.payment_type] = (groups[key][p.payment_type] || 0) + Number(p.amount_paid);
                  });
                  const rows = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
                  if (rows.length === 0) return <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No payments yet to summarize.</td></tr>;
                  return rows.map(([key, g]: any) => (
                    <tr key={key} className="border-t hover:bg-muted/30">
                      <td className="p-2 font-medium">{g.label}</td>
                      <td className="p-2 text-center">{g.count}</td>
                      <td className="p-2 text-right font-mono font-bold">{fmt(g.total)}</td>
                      <td className="p-2 text-right font-mono text-green-700">{g.full ? fmt(g.full) : '—'}</td>
                      <td className="p-2 text-right font-mono text-amber-700">{g.minimum ? fmt(g.minimum) : '—'}</td>
                      <td className="p-2 text-right font-mono text-blue-700">{g.partial ? fmt(g.partial) : '—'}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        {/* Debt Payoff Planner */}
        <TabsContent value="payoff" className="space-y-4">
          {debts.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              Add a <strong>Current Balance</strong> to your funding sources to use the Debt Payoff Planner.
            </CardContent></Card>
          ) : (
            <>
              {/* Strategy controls */}
              <Card>
                <CardHeader><CardTitle className="text-base">Plan Your Path to Debt-Free 💪</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Strategy</Label>
                      <Select value={payoffStrategy} onValueChange={(v: any) => setPayoffStrategy(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avalanche">🏔️ Avalanche — Highest interest first (saves most $)</SelectItem>
                          <SelectItem value="snowball">⛄ Snowball — Smallest balance first (quick wins)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {payoffStrategy === 'avalanche'
                          ? 'Mathematically optimal — kills the most expensive interest first.'
                          : 'Psychologically rewarding — knock out small debts fast for momentum.'}
                      </p>
                    </div>
                    <div>
                      <Label>Extra Monthly Payment ($)</Label>
                      <Input type="number" step="50" value={extraPayment} onChange={e => setExtraPayment(parseFloat(e.target.value) || 0)} />
                      <p className="text-xs text-muted-foreground mt-1">Above your minimums — applied to top-priority debt.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Debt</p><p className="text-2xl font-bold text-red-600">{fmt(totalDebt)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Required Monthly Min</p><p className="text-2xl font-bold">{fmt(totalMinPayments)}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Debt-Free Date</p><p className="text-xl font-bold text-green-600">{acceleratedPlan.payoffDate ? format(acceleratedPlan.payoffDate, 'MMM yyyy') : '—'}</p><p className="text-xs text-muted-foreground">{acceleratedPlan.months} months</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Interest Cost</p><p className="text-2xl font-bold text-amber-600">{fmt(acceleratedPlan.totalInterest)}</p></CardContent></Card>
              </div>

              {/* Savings comparison */}
              {extraPayment > 0 && (
                <Card className="border-green-500 border-2 bg-green-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-900">By paying an extra {fmt(extraPayment)}/month you'll save:</p>
                        <p className="text-xl font-bold text-green-700">{fmt(interestSaved)} in interest · {monthsSaved} months sooner debt-free</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payoff order */}
              <Card>
                <CardHeader><CardTitle className="text-base">Attack Order ({payoffStrategy === 'avalanche' ? 'Avalanche' : 'Snowball'})</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">#</th>
                        <th className="p-2 text-left">Debt</th>
                        <th className="p-2 text-right">Balance</th>
                        <th className="p-2 text-right">APR</th>
                        <th className="p-2 text-right">Min Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoffOrder.map((d, i) => (
                        <tr key={d.id} className="border-t">
                          <td className="p-2"><Badge variant={i === 0 ? 'default' : 'outline'}>{i + 1}</Badge></td>
                          <td className="p-2 font-medium">{d.name} {i === 0 && <span className="text-xs text-primary">← attack first</span>}</td>
                          <td className="p-2 text-right font-mono text-red-600">{fmt(d.balance)}</td>
                          <td className="p-2 text-right font-mono">{d.apr ? `${d.apr.toFixed(2)}%` : '—'}</td>
                          <td className="p-2 text-right font-mono">{fmt(d.minimum)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Payoff timeline chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Debt Payoff Timeline</CardTitle>
                  <p className="text-xs text-muted-foreground">Remaining balance month-by-month with your current plan.</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={acceleratedPlan.schedule.filter((_, idx) => idx % Math.max(1, Math.floor(acceleratedPlan.schedule.length / 60)) === 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" label={{ value: 'Months', position: 'insideBottom', offset: -5 }} />
                      <YAxis tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                      <Tooltip formatter={(v: any) => fmt(v)} labelFormatter={(l) => `Month ${l}`} />
                      <Line type="monotone" dataKey="remaining" stroke="#16a34a" strokeWidth={3} dot={false} name="Remaining Debt" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-sm text-blue-900">
                  <strong>💡 Tip:</strong> Add the <strong>APR %</strong> and <strong>Minimum Payment</strong> to each funding source (edit any card) for the most accurate forecast. Without APR, interest is assumed at 0%.
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ExpenseDialog open={expenseDialog.open} onOpenChange={(v: boolean) => setExpenseDialog({ open: v, editing: v ? expenseDialog.editing : null })} editing={expenseDialog.editing} fundingSources={funding} onSave={(f: any) => upsertExpense.mutate(f)} />
      <FundingSourceDialog open={fundingDialog.open} onOpenChange={(v: boolean) => setFundingDialog({ open: v, editing: v ? fundingDialog.editing : null })} editing={fundingDialog.editing} onSave={(f: any) => upsertFunding.mutate(f)} />
      <IncomeDialog open={incomeDialog.open} onOpenChange={(v: boolean) => setIncomeDialog({ open: v, editing: v ? incomeDialog.editing : null })} editing={incomeDialog.editing} onSave={(f: any) => upsertIncome.mutate(f)} />
      <MarkPaidDialog open={paidDialog.open} onOpenChange={(v: boolean) => setPaidDialog({ open: v, expense: v ? paidDialog.expense : null })} expense={paidDialog.expense} fundingSources={funding} onConfirm={(p: any) => markPaid.mutate({ expense_id: paidDialog.expense.id, ...p })} />
      <EditPaymentDialog open={editPaymentDialog.open} onOpenChange={(v: boolean) => setEditPaymentDialog({ open: v, payment: v ? editPaymentDialog.payment : null })} payment={editPaymentDialog.payment} fundingSources={funding} onSave={(p: any) => updatePayment.mutate(p)} />

      {/* Per-card payment history */}
      <Dialog open={cardHistoryDialog.open} onOpenChange={(v) => setCardHistoryDialog({ open: v, card: v ? cardHistoryDialog.card : null })}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Payment History — {cardHistoryDialog.card?.name}</DialogTitle></DialogHeader>
          {(() => {
            const cardPayments = payments.filter((p: any) => p.funding_source_id === cardHistoryDialog.card?.id);
            const total = cardPayments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Payments</p><p className="text-xl font-bold">{cardPayments.length}</p></CardContent></Card>
                  <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Paid (All Time)</p><p className="text-xl font-bold font-mono">{fmt(total)}</p></CardContent></Card>
                </div>
                <Card><CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr className="text-left"><th className="p-2">Date</th><th className="p-2">Month</th><th className="p-2">Bill</th><th className="p-2">Type</th><th className="p-2 text-right">Amount</th></tr></thead>
                    <tbody>
                      {cardPayments.map((p: any) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-2">{format(parseISO(p.paid_date), 'MMM d, yyyy')}</td>
                          <td className="p-2 text-muted-foreground">{format(parseISO(p.paid_date), 'MMMM yyyy')}</td>
                          <td className="p-2">{p.personal_expenses?.account_name || <span className="italic text-muted-foreground">Card payment</span>}</td>
                          <td className="p-2"><Badge variant="outline" className="capitalize">{p.payment_type}</Badge></td>
                          <td className="p-2 text-right font-mono">{fmt(p.amount_paid)}</td>
                        </tr>
                      ))}
                      {cardPayments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No payments yet on this card.</td></tr>}
                    </tbody>
                  </table>
                </CardContent></Card>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
