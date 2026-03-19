import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Plus, Pencil, Trash2, Search, Loader2, Receipt, TrendingUp, AlertTriangle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EXPENSE_CATEGORIES = [
  'Fuel', 'Equipment', 'Maintenance', 'Materials', 'Payroll-Related',
  'Subcontractor Costs', 'Office/Admin', 'Marketing', 'Insurance',
  'Software/Subscriptions', 'Utilities', 'Rent/Storage', 'Vehicle', 'Miscellaneous',
];
const PAYMENT_METHODS = ['Cash', 'E-Transfer', 'Credit Card', 'Cheque', 'Company Card', 'Other'];
const SERVICE_LINES = ['Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance', 'Cleaning Services', 'Power Washing', 'General'];

type Expense = Record<string, any>;
type Vendor = Record<string, any>;

export default function ExpenseTrackingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({
    expense_date: format(new Date(), 'yyyy-MM-dd'), amount: '', tax_amount: '',
    category: 'Miscellaneous', vendor_name: '', description: '', payment_method: 'Other',
    service_line: 'General', notes: '',
  });
  const [vendorForm, setVendorForm] = useState({ name: '', contact_name: '', email: '', phone: '', notes: '' });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*').eq('status', 'active').order('name');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        expense_date: form.expense_date,
        amount: parseFloat(form.amount) || 0,
        tax_amount: parseFloat(form.tax_amount) || 0,
        category: form.category,
        vendor_name: form.vendor_name,
        description: form.description,
        payment_method: form.payment_method,
        service_line: form.service_line,
        notes: form.notes,
        created_by: user?.id || null,
      };
      if (editingId) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Expense updated' : 'Expense added');
      setDialogOpen(false); setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const vendorMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vendors').insert(vendorForm);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vendor added');
      setVendorDialogOpen(false);
      setVendorForm({ name: '', contact_name: '', email: '', phone: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      expense_date: e.expense_date, amount: String(e.amount), tax_amount: String(e.tax_amount || 0),
      category: e.category, vendor_name: e.vendor_name || '', description: e.description || '',
      payment_method: e.payment_method || 'Other', service_line: e.service_line || 'General', notes: e.notes || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      expense_date: format(new Date(), 'yyyy-MM-dd'), amount: '', tax_amount: '',
      category: 'Miscellaneous', vendor_name: '', description: '', payment_method: 'Other',
      service_line: 'General', notes: '',
    });
    setDialogOpen(true);
  };

  const filtered = expenses.filter((e: Expense) => {
    if (search) {
      const q = search.toLowerCase();
      if (![e.description, e.vendor_name, e.category, e.notes].join(' ').toLowerCase().includes(q)) return false;
    }
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    return true;
  });

  // Summary stats
  const now = new Date();
  const thisMonth = expenses.filter((e: Expense) => {
    const d = new Date(e.expense_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonth.reduce((s: number, e: Expense) => s + (e.amount || 0), 0);
  const allTotal = expenses.reduce((s: number, e: Expense) => s + (e.amount || 0), 0);
  const topCategory = expenses.reduce((acc: Record<string, number>, e: Expense) => {
    acc[e.category] = (acc[e.category] || 0) + (e.amount || 0);
    return acc;
  }, {});
  const topCatName = Object.entries(topCategory).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'N/A';

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expense Tracking</h1>
            <p className="text-sm text-muted-foreground">Track, categorize, and manage business expenses</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setVendorDialogOpen(true)}>
              <Building2 className="h-4 w-4 mr-1" />Vendor
            </Button>
            <Button size="sm" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-1" />Add Expense
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold text-foreground">${thisMonthTotal.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">All Time</p>
            <p className="text-2xl font-bold text-foreground">${allTotal.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Top Category</p>
            <p className="text-lg font-semibold text-foreground">{topCatName}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold text-foreground">{expenses.length}</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="font-medium text-foreground">No expenses found</p>
                <p className="text-sm text-muted-foreground">Add your first expense to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e: Expense) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{e.expense_date}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{e.description || '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{e.category}</Badge></TableCell>
                      <TableCell className="text-sm">{e.vendor_name || '—'}</TableCell>
                      <TableCell className="text-right font-medium">${Number(e.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(e.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Worker Reimbursement Claims */}
        <WorkerClaimsSection />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Date *</Label>
                  <Input type="date" value={form.expense_date} onChange={e => setForm(prev => ({ ...prev, expense_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Amount ($) *</Label>
                  <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tax Amount ($)</Label>
                  <Input type="number" step="0.01" min="0" value={form.tax_amount} onChange={e => setForm(prev => ({ ...prev, tax_amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Category *</Label>
                  <Select value={form.category} onValueChange={v => setForm(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vendor</Label>
                <Input value={form.vendor_name} onChange={e => setForm(prev => ({ ...prev, vendor_name: e.target.value }))} placeholder="Vendor name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="What was this expense for?" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(prev => ({ ...prev, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Service Line</Label>
                  <Select value={form.service_line} onValueChange={v => setForm(prev => ({ ...prev, service_line: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SERVICE_LINES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Internal notes..." rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.amount}>
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingId ? 'Update' : 'Add Expense'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vendor Dialog */}
        <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Vendor</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vendor Name *</Label>
                <Input value={vendorForm.name} onChange={e => setVendorForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Company name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Contact</Label>
                  <Input value={vendorForm.contact_name} onChange={e => setVendorForm(prev => ({ ...prev, contact_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <Input value={vendorForm.phone} onChange={e => setVendorForm(prev => ({ ...prev, phone: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input type="email" value={vendorForm.email} onChange={e => setVendorForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={vendorForm.notes} onChange={e => setVendorForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => vendorMutation.mutate()} disabled={vendorMutation.isPending || !vendorForm.name}>
                  {vendorMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Add Vendor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  );
}
