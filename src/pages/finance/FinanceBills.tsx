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
import { useFinanceBills, useCreateFinanceBill, useUpdateFinanceBill, useFinanceVendors } from '@/hooks/useFinance';
import { Plus, Search, FileText, MoreHorizontal, Download } from 'lucide-react';
import { format } from 'date-fns';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

const STATUS_OPTIONS = ['all', 'draft', 'open', 'partial', 'paid', 'overdue', 'void'];
const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', open: 'bg-primary/10 text-primary',
  partial: 'bg-warning/10 text-warning', paid: 'bg-accent/10 text-accent',
  overdue: 'bg-destructive/10 text-destructive', void: 'bg-muted text-muted-foreground',
};

export default function FinanceBills() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: bills, isLoading } = useFinanceBills({ status: statusFilter });
  const { data: vendors } = useFinanceVendors();
  const createBill = useCreateFinanceBill();
  const updateBill = useUpdateFinanceBill();

  const filtered = (bills ?? []).filter((b: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return b.bill_number?.toLowerCase().includes(s) || (b as any).finance_vendors?.vendor_name?.toLowerCase().includes(s) || b.memo?.toLowerCase().includes(s);
  });

  const summary = {
    open: filtered.filter((b: any) => ['open', 'partial'].includes(b.status)).reduce((s: number, b: any) => s + Number(b.balance_due || 0), 0),
    overdue: filtered.filter((b: any) => b.status === 'overdue').reduce((s: number, b: any) => s + Number(b.balance_due || 0), 0),
    paidThisMonth: filtered.filter((b: any) => b.status === 'paid').reduce((s: number, b: any) => s + Number(b.total || 0), 0),
  };

  const handleCreate = () => {
    const subtotal = Number(form.subtotal || 0);
    const tax = Number(form.tax || 0);
    const total = subtotal + tax;
    createBill.mutate({
      ...form, subtotal, tax, total, balance_due: total, amount_paid: 0, status: 'open',
    }, { onSuccess: () => { setShowCreate(false); setForm({}); } });
  };

  const exportCSV = () => {
    const rows = filtered.map((b: any) => [b.bill_number, (b as any).finance_vendors?.vendor_name || '', b.bill_date, b.due_date, b.total, b.amount_paid, b.balance_due, b.status].join(','));
    const csv = ['Bill #,Vendor,Bill Date,Due Date,Total,Paid,Balance,Status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bills.csv'; a.click();
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
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Open Bills</p><p className="text-lg font-bold text-primary">{fmt(summary.open)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-lg font-bold text-destructive">{fmt(summary.overdue)}</p></CardContent></Card>
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
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Due Date</TableHead>
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
                      <TableCell>{b.bill_date ? format(new Date(b.bill_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell>{b.due_date ? format(new Date(b.due_date), 'MMM d, yyyy') : '—'}</TableCell>
                      <TableCell className="text-right">{fmt(Number(b.total))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(b.amount_paid))}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(Number(b.balance_due))}</TableCell>
                      <TableCell><Badge className={statusColor[b.status] || ''}>{b.status}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {b.status !== 'paid' && <DropdownMenuItem onClick={() => updateBill.mutate({ id: b.id, status: 'paid', amount_paid: b.total, balance_due: 0 })}>Mark Paid</DropdownMenuItem>}
                            {b.status !== 'void' && <DropdownMenuItem onClick={() => updateBill.mutate({ id: b.id, status: 'void' })}>Void</DropdownMenuItem>}
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
          <DialogHeader><DialogTitle>New Bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vendor</Label>
              <Select value={form.vendor_id || ''} onValueChange={v => setForm({ ...form, vendor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>{(vendors ?? []).map((v: any) => <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>)}</SelectContent>
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
            <div><Label>Memo</Label><Textarea value={form.memo || ''} onChange={e => setForm({ ...form, memo: e.target.value })} /></div>
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
