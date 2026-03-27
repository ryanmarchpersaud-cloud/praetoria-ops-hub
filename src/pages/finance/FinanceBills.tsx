import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFinanceBills, useCreateFinanceBill, useUpdateFinanceBill, useFinanceVendors, useJobsForLinking, useCustomersForLinking, usePropertiesForLinking } from '@/hooks/useFinance';
import { useFinancePayments, useRecordPayment, useReversePayment } from '@/hooks/useFinancePayments';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { Plus, Search, FileText, MoreHorizontal, Download, ExternalLink, AlertTriangle, History } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

const STATUS_OPTIONS = ['all', 'draft', 'open', 'partial', 'paid', 'overdue', 'void'];
const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', open: 'bg-primary/10 text-primary',
  partial: 'bg-warning/10 text-warning', paid: 'bg-accent/10 text-accent',
  overdue: 'bg-destructive/10 text-destructive', void: 'bg-muted text-muted-foreground',
};

const TRANSITIONS: Record<string, string[]> = {
  draft: ['open', 'void'],
  open: ['partial', 'paid', 'void'],
  partial: ['paid', 'void'],
  overdue: ['partial', 'paid', 'void'],
  paid: [],
  void: [],
};

export default function FinanceBills() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState<any>({});
  const [showHistory, setShowHistory] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: bills, isLoading } = useFinanceBills({ status: statusFilter });
  const { data: vendors } = useFinanceVendors();
  const { data: jobs } = useJobsForLinking();
  const { data: customers } = useCustomersForLinking();
  const { data: properties } = usePropertiesForLinking();
  const createBill = useCreateFinanceBill();
  const updateBill = useUpdateFinanceBill();
  const { data: accounts } = useFinanceAccounts();
  const recordPayment = useRecordPayment();
  const reversePayment = useReversePayment();
  const { data: historyPayments } = useFinancePayments(showHistory ? { billId: showHistory.id } : undefined);

  const filtered = (bills ?? []).filter((b: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.bill_number?.toLowerCase().includes(s) || (b as any).finance_vendors?.vendor_name?.toLowerCase().includes(s) || b.memo?.toLowerCase().includes(s);
  });

  const summary = {
    open: filtered.filter((b: any) => ['open', 'partial'].includes(b.status)).reduce((s: number, b: any) => s + Number(b.balance_due || 0), 0),
    overdue: filtered.filter((b: any) => {
      if (b.status === 'overdue') return true;
      return b.due_date && new Date(b.due_date) < new Date() && ['open', 'partial'].includes(b.status);
    }).reduce((s: number, b: any) => s + Number(b.balance_due || 0), 0),
    paidThisMonth: filtered.filter((b: any) => b.status === 'paid').reduce((s: number, b: any) => s + Number(b.total || 0), 0),
    dueSoon: filtered.filter((b: any) => {
      if (!b.due_date || b.status === 'paid' || b.status === 'void') return false;
      const days = differenceInDays(new Date(b.due_date), new Date());
      return days >= 0 && days <= 7;
    }).length,
  };

  const handleCreate = () => {
    const subtotal = Number(form.subtotal || 0);
    const tax = Number(form.tax || 0);
    const total = subtotal + tax;
    createBill.mutate({
      ...form,
      subtotal, tax, total,
      balance_due: total,
      amount_paid: 0,
      status: 'open',
      vendor_id: form.vendor_id || null,
      linked_job_id: form.linked_job_id || null,
      linked_customer_id: form.linked_customer_id || null,
      linked_property_id: form.linked_property_id || null,
    }, { onSuccess: () => { setShowCreate(false); setForm({}); } });
  };

  const handleRecordPayment = () => {
    if (!showPayment) return;
    const payment = Number(paymentForm.amount || 0);
    if (payment <= 0) { toast.error('Enter a valid amount'); return; }
    if (payment > Number(showPayment.balance_due)) { toast.error('Payment exceeds balance due'); return; }
    recordPayment.mutate({
      payment_type: 'bill_payment',
      payment_date: paymentForm.payment_date || new Date().toISOString().split('T')[0],
      amount: payment,
      payment_method: paymentForm.payment_method || null,
      account_id: paymentForm.account_id || null,
      reference_number: paymentForm.reference_number || null,
      internal_note: paymentForm.internal_note || null,
      bill_id: showPayment.id,
    }, { onSuccess: () => { setShowPayment(null); setPaymentForm({}); } });
  };

  const exportCSV = () => {
    const rows = filtered.map((b: any) => [b.bill_number, (b as any).finance_vendors?.vendor_name || '', b.bill_date, b.due_date, b.total, b.amount_paid, b.balance_due, b.status].join(','));
    const csv = ['Bill #,Vendor,Bill Date,Due Date,Total,Paid,Balance,Status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bills.csv'; a.click();
  };

  const isDueSoon = (b: any) => {
    if (!b.due_date || b.status === 'paid' || b.status === 'void') return false;
    const days = differenceInDays(new Date(b.due_date), new Date());
    return days >= 0 && days <= 7;
  };

  const isOverdue = (b: any) => {
    if (b.status === 'overdue') return true;
    return b.due_date && new Date(b.due_date) < new Date() && ['open', 'partial'].includes(b.status);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bills & Payables</h1>
          <p className="text-sm text-muted-foreground">Track vendor bills and payment obligations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Bill</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Open Bills</p><p className="text-lg font-bold text-primary">{fmt(summary.open)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-lg font-bold text-destructive">{fmt(summary.overdue)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Due This Week</p><p className="text-lg font-bold text-warning">{summary.dueSoon}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Paid This Month</p><p className="text-lg font-bold text-accent">{fmt(summary.paidThisMonth)}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bills..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No bills found</p>
              <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Create First Bill</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Linked To</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.bill_number}</TableCell>
                      <TableCell>{(b as any).finance_vendors?.vendor_name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {b.due_date ? format(new Date(b.due_date), 'MMM d, yyyy') : '—'}
                          {isOverdue(b) && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                          {isDueSoon(b) && !isOverdue(b) && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {b.linked_job_id && <Badge variant="outline" className="text-[10px] cursor-pointer" onClick={() => nav(`/jobs/${b.linked_job_id}`)}>Job <ExternalLink className="h-2.5 w-2.5 ml-0.5" /></Badge>}
                          {b.linked_property_id && <Badge variant="outline" className="text-[10px] cursor-pointer" onClick={() => nav(`/properties/${b.linked_property_id}`)}>Property</Badge>}
                          {!b.linked_job_id && !b.linked_property_id && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{fmt(Number(b.total))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(b.amount_paid))}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(Number(b.balance_due))}</TableCell>
                      <TableCell><Badge className={statusColor[b.status] || ''}>{isOverdue(b) && b.status !== 'overdue' ? 'overdue' : b.status}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {b.status !== 'paid' && b.status !== 'void' && (
                              <DropdownMenuItem onClick={() => { setShowPayment(b); setPaymentForm({ amount: String(b.balance_due), payment_date: new Date().toISOString().split('T')[0] }); }}>Record Payment</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setShowHistory(b)}><History className="h-3.5 w-3.5 mr-1" /> Payment History</DropdownMenuItem>
                            {(TRANSITIONS[b.status] || []).filter((s: string) => s !== 'partial').map((next: string) => (
                              <DropdownMenuItem key={next} onClick={() => {
                                if (next === 'paid') {
                                  updateBill.mutate({ id: b.id, status: 'paid', amount_paid: b.total, balance_due: 0 });
                                } else {
                                  updateBill.mutate({ id: b.id, status: next });
                                }
                              }}>
                                {next === 'open' ? 'Mark Open' : next === 'paid' ? 'Mark Fully Paid' : 'Void'}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={!!showPayment} onOpenChange={(o) => { if (!o) setShowPayment(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Bill: <span className="font-medium text-foreground">{showPayment?.bill_number}</span></p>
            <p className="text-sm text-muted-foreground">Balance Due: <span className="font-medium text-foreground">{fmt(Number(showPayment?.balance_due || 0))}</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Payment Date</Label><Input type="date" value={paymentForm.payment_date || ''} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /></div>
              <div><Label>Amount</Label><Input type="number" step="0.01" value={paymentForm.amount || ''} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentForm.payment_method || '_none'} onValueChange={v => setPaymentForm({ ...paymentForm, payment_method: v === '_none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {['Cash', 'Cheque', 'E-Transfer', 'Bank Transfer', 'Credit Card', 'Debit'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Account</Label>
                <Select value={paymentForm.account_id || '_none'} onValueChange={v => setPaymentForm({ ...paymentForm, account_id: v === '_none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {(accounts ?? []).filter((a: any) => a.is_active).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Reference #</Label><Input value={paymentForm.reference_number || ''} onChange={e => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} /></div>
            <div><Label>Internal Note</Label><Textarea rows={2} value={paymentForm.internal_note || ''} onChange={e => setPaymentForm({ ...paymentForm, internal_note: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(null)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={recordPayment.isPending}>Apply Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={!!showHistory} onOpenChange={(o) => { if (!o) setShowHistory(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Payment History — {showHistory?.bill_number}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(historyPayments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payments recorded</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Ref</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(historyPayments ?? []).map((p: any) => (
                    <TableRow key={p.id} className={p.is_reversed ? 'opacity-50 line-through' : ''}>
                      <TableCell className="text-sm">{p.payment_date ? format(new Date(p.payment_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-sm">{p.payment_method || '—'}</TableCell>
                      <TableCell className="text-sm font-mono">{p.reference_number || '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(Number(p.amount))}</TableCell>
                      <TableCell>
                        {p.is_reversed ? <Badge variant="destructive">Reversed</Badge> :
                         p.reconciled ? <Badge className="bg-accent/10 text-accent">Reconciled</Badge> :
                         <Badge variant="outline">Active</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowHistory(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor</Label>
              <Select value={form.vendor_id || '_none'} onValueChange={v => setForm({ ...form, vendor_id: v === '_none' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bill Date</Label><Input type="date" value={form.bill_date || ''} onChange={e => setForm({ ...form, bill_date: e.target.value })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Subtotal</Label><Input type="number" step="0.01" value={form.subtotal || ''} onChange={e => setForm({ ...form, subtotal: e.target.value })} /></div>
              <div><Label>Tax</Label><Input type="number" step="0.01" value={form.tax || ''} onChange={e => setForm({ ...form, tax: e.target.value })} /></div>
              <div><Label>Total</Label><Input disabled value={(Number(form.subtotal || 0) + Number(form.tax || 0)).toFixed(2)} /></div>
            </div>

            {/* Linking */}
            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Link to Records</p>
              <div>
                <Label>Job</Label>
                <Select value={form.linked_job_id || '_none'} onValueChange={v => setForm({ ...form, linked_job_id: v === '_none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {(jobs ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.job_number} — {j.job_title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer</Label>
                <Select value={form.linked_customer_id || '_none'} onValueChange={v => setForm({ ...form, linked_customer_id: v === '_none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {(customers ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property</Label>
                <Select value={form.linked_property_id || '_none'} onValueChange={v => setForm({ ...form, linked_property_id: v === '_none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.address_line_1}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div><Label>Memo</Label><Textarea value={form.memo || ''} onChange={e => setForm({ ...form, memo: e.target.value })} /></div>
            <div><Label>Internal Notes</Label><Textarea value={form.internal_notes || ''} onChange={e => setForm({ ...form, internal_notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createBill.isPending}>Create Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
