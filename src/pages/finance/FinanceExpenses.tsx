import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFinanceExpenses, useCreateFinanceExpense, useUpdateFinanceExpense, useFinanceCategories, useFinanceVendors } from '@/hooks/useFinance';
import { Plus, Search, Download, Receipt, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

const STATUS_OPTIONS = ['all', 'draft', 'submitted', 'approved', 'reimbursed', 'paid', 'void'];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit', 'Bank Transfer', 'Cheque', 'E-Transfer', 'Company Card'];

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-primary/10 text-primary',
  approved: 'bg-accent/10 text-accent',
  reimbursed: 'bg-accent/10 text-accent',
  paid: 'bg-accent/10 text-accent',
  void: 'bg-destructive/10 text-destructive',
};

export default function FinanceExpenses() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: expenses, isLoading } = useFinanceExpenses({ status: statusFilter });
  const { data: categories } = useFinanceCategories();
  const { data: vendors } = useFinanceVendors();
  const createExpense = useCreateFinanceExpense();
  const updateExpense = useUpdateFinanceExpense();

  const filtered = (expenses ?? []).filter((e: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (e.expense_number?.toLowerCase().includes(s)) ||
      (e.description?.toLowerCase().includes(s)) ||
      (e.category?.toLowerCase().includes(s)) ||
      ((e as any).finance_vendors?.vendor_name?.toLowerCase().includes(s));
  });

  const totalFiltered = filtered.reduce((s: number, e: any) => s + Number(e.amount_total || 0), 0);

  const handleCreate = () => {
    const subtotal = Number(form.amount_subtotal || 0);
    const tax = Number(form.amount_tax || 0);
    createExpense.mutate({
      ...form,
      amount_subtotal: subtotal,
      amount_tax: tax,
      amount_total: subtotal + tax,
    }, { onSuccess: () => { setShowCreate(false); setForm({}); } });
  };

  const handleStatusChange = (id: string, status: string) => {
    updateExpense.mutate({ id, status });
  };

  const exportCSV = () => {
    const rows = filtered.map((e: any) => [e.expense_number, e.expense_date, (e as any).finance_vendors?.vendor_name || '', e.category, e.amount_subtotal, e.amount_tax, e.amount_total, e.status].join(','));
    const csv = ['Expense #,Date,Vendor,Category,Subtotal,Tax,Total,Status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'expenses.csv'; a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage all operational expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Expense</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{fmt(totalFiltered)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Count</p><p className="text-lg font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Draft</p><p className="text-lg font-bold">{filtered.filter((e: any) => e.status === 'draft').length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Pending Approval</p><p className="text-lg font-bold">{filtered.filter((e: any) => e.status === 'submitted').length}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No expenses found</p>
              <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Create First Expense</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.expense_number}</TableCell>
                      <TableCell>{e.expense_date ? format(new Date(e.expense_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell>{(e as any).finance_vendors?.vendor_name || '—'}</TableCell>
                      <TableCell>{e.category || '—'}</TableCell>
                      <TableCell className="text-right">{fmt(Number(e.amount_subtotal))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(e.amount_tax))}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(Number(e.amount_total))}</TableCell>
                      <TableCell><Badge className={statusColor[e.status] || ''}>{e.status}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {e.status === 'draft' && <DropdownMenuItem onClick={() => handleStatusChange(e.id, 'submitted')}>Submit</DropdownMenuItem>}
                            {e.status === 'submitted' && <DropdownMenuItem onClick={() => handleStatusChange(e.id, 'approved')}>Approve</DropdownMenuItem>}
                            {e.status === 'approved' && <DropdownMenuItem onClick={() => handleStatusChange(e.id, 'paid')}>Mark Paid</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => handleStatusChange(e.id, 'void')}>Void</DropdownMenuItem>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.expense_date || ''} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div>
                <Label>Vendor</Label>
                <Select value={form.vendor_id || ''} onValueChange={v => setForm({ ...form, vendor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>{(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category || ''} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{(categories ?? []).map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Subtotal</Label><Input type="number" step="0.01" value={form.amount_subtotal || ''} onChange={e => setForm({ ...form, amount_subtotal: e.target.value })} /></div>
              <div><Label>Tax</Label><Input type="number" step="0.01" value={form.amount_tax || ''} onChange={e => setForm({ ...form, amount_tax: e.target.value })} /></div>
              <div><Label>Total</Label><Input type="number" disabled value={(Number(form.amount_subtotal || 0) + Number(form.amount_tax || 0)).toFixed(2)} /></div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method || ''} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Internal Notes</Label><Textarea value={form.notes_internal || ''} onChange={e => setForm({ ...form, notes_internal: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createExpense.isPending}>Create Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
