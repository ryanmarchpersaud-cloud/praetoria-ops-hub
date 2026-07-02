import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Receipt, Eye, EyeOff, Trash2, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import {
  usePMExpenses, useCreatePMExpense, useUpdatePMExpense, useDeletePMExpense,
  usePMExpenseAttachments, useUploadPMReceipt, useDeletePMReceipt, getPMReceiptSignedUrl,
  PM_EXPENSE_CATEGORIES, PM_EXPENSE_STATUSES,
} from '@/hooks/usePMExpenses';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n || 0);

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  approved: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  paid: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-200',
  reimbursed: 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-200',
  billable: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  cancelled: 'bg-destructive/10 text-destructive',
  disputed: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
};

function usePMProperties() {
  return useQuery({
    queryKey: ['pm-properties-for-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_managed_properties').select('id, address_line_1, city').order('address_line_1');
      if (error) throw error;
      return data ?? [];
    },
  });
}

function usePMUnitsForProperty(propertyId?: string) {
  return useQuery({
    queryKey: ['pm-units-for-property', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_units').select('id, unit_label').eq('property_id', propertyId!).order('unit_label');
      if (error) throw error;
      return data ?? [];
    },
  });
}

const PM_VENDOR_OPTIONS = [
  'Rona',
  'Home Depot',
  'Home Hardware',
  "Lowe's",
  'Canadian Tire',
  'Peavey Mart',
  'Princess Auto',
  'Costco',
  'Walmart',
  'Windsor Plywood',
  'Sherwin-Williams',
  'Dulux Paints',
  'Benjamin Moore',
  'Wolseley',
  'EMCO',
  'Westburne Electric',
  'Nelson Lumber',
  'Robinson Supply',
  'Amazon',
];

const PM_PAYMENT_METHODS = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'Company Card',
  'e-Transfer',
  'Cheque',
  'Bank Transfer / EFT',
  'Stripe Payment',
  'PayPal',
  'Other',
];


const emptyForm = {
  property_id: '',
  unit_id: null as string | null,
  tenant_id: null as string | null,
  work_order_id: null as string | null,
  maintenance_request_id: null as string | null,
  vendor_name: '',
  category: 'Repairs & Maintenance',
  expense_date: format(new Date(), 'yyyy-MM-dd'),
  due_date: '',
  subtotal: '',
  gst_percent: '5',
  pst_percent: '6',
  gst_amount: '',
  pst_amount: '',
  status: 'draft',
  payment_method: '',
  reference_number: '',
  description: '',
  admin_note: '',
  owner_visible_note: '',
  is_owner_visible: false,
  is_billable_to_owner: false,
};

function ReceiptsPanel({ expenseId }: { expenseId: string }) {
  const { data: attachments } = usePMExpenseAttachments(expenseId);
  const upload = useUploadPMReceipt();
  const del = useDeletePMReceipt();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    upload.mutate({ expenseId, file: f });
    e.target.value = '';
  };

  const openReceipt = async (path: string) => {
    try {
      const url = await getPMReceiptSignedUrl(path);
      window.open(url, '_blank');
    } catch {}
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Receipts (private)</p>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={handleFile} accept="image/*,application/pdf" />
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-input hover:bg-accent">
            <Plus className="h-3 w-3" /> Upload
          </span>
        </label>
      </div>
      {(attachments ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">No receipts uploaded.</p>
      ) : (
        <ul className="space-y-1">
          {(attachments ?? []).map((a: any) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-sm border rounded px-2 py-1">
              <button className="flex items-center gap-2 flex-1 text-left hover:underline" onClick={() => openReceipt(a.storage_path)}>
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{a.file_name}</span>
                {a.is_owner_visible && <Badge variant="outline" className="text-[10px]">Owner-visible</Badge>}
              </button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => del.mutate({ id: a.id, expenseId, path: a.storage_path })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PMExpensesPage() {
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: properties } = usePMProperties();
  const { data: units } = usePMUnitsForProperty(form.property_id || undefined);

  const { data: expenses, isLoading } = usePMExpenses({
    propertyId: propertyFilter === 'all' ? undefined : propertyFilter,
    status: statusFilter,
    category: categoryFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: search || undefined,
  });

  const create = useCreatePMExpense();
  const update = useUpdatePMExpense();
  const del = useDeletePMExpense();

  const totals = useMemo(() => {
    const rows = expenses ?? [];
    return {
      count: rows.length,
      total: rows.reduce((s: number, r: any) => s + Number(r.total || 0), 0),
      draft: rows.filter((r: any) => r.status === 'draft').length,
      pending: rows.filter((r: any) => r.status === 'pending').length,
      paid: rows.filter((r: any) => r.status === 'paid' || r.status === 'reimbursed').length,
    };
  }, [expenses]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowCreate(true); };
  const openEdit = (row: any) => {
    setEditingId(row.id);
    setForm({
      property_id: row.property_id,
      unit_id: row.unit_id,
      tenant_id: row.tenant_id,
      work_order_id: row.work_order_id,
      maintenance_request_id: row.maintenance_request_id,
      vendor_name: row.vendor_name ?? '',
      category: row.category ?? 'Other',
      expense_date: row.expense_date,
      due_date: row.due_date ?? '',
      subtotal: String(row.subtotal ?? ''),
      gst_percent: row.subtotal > 0 ? String(+(Number(row.gst_amount ?? 0) / Number(row.subtotal) * 100).toFixed(3)) : '5',
      pst_percent: row.subtotal > 0 ? String(+(Number(row.pst_amount ?? 0) / Number(row.subtotal) * 100).toFixed(3)) : '6',
      gst_amount: String(row.gst_amount ?? ''),
      pst_amount: String(row.pst_amount ?? ''),
      status: row.status ?? 'draft',
      payment_method: row.payment_method ?? '',
      reference_number: row.reference_number ?? '',
      description: row.description ?? '',
      admin_note: row.admin_note ?? '',
      owner_visible_note: row.owner_visible_note ?? '',
      is_owner_visible: !!row.is_owner_visible,
      is_billable_to_owner: !!row.is_billable_to_owner,
    });
    setShowCreate(true);
  };

  const handleSave = () => {
    if (!form.property_id) return;
    const payload = {
      property_id: form.property_id,
      unit_id: form.unit_id || null,
      tenant_id: form.tenant_id || null,
      work_order_id: form.work_order_id || null,
      maintenance_request_id: form.maintenance_request_id || null,
      vendor_name: form.vendor_name || null,
      category: form.category,
      expense_date: form.expense_date,
      due_date: form.due_date || null,
      subtotal: Number(form.subtotal || 0),
      gst_amount: +(Number(form.subtotal || 0) * Number(form.gst_percent || 0) / 100).toFixed(2),
      pst_amount: +(Number(form.subtotal || 0) * Number(form.pst_percent || 0) / 100).toFixed(2),
      total: +(Number(form.subtotal || 0) * (1 + Number(form.gst_percent || 0) / 100 + Number(form.pst_percent || 0) / 100)).toFixed(2),
      status: form.status,
      payment_method: form.payment_method || null,
      reference_number: form.reference_number || null,
      description: form.description || null,
      admin_note: form.admin_note || null,
      owner_visible_note: form.owner_visible_note || null,
      is_owner_visible: form.is_owner_visible,
      is_billable_to_owner: form.is_billable_to_owner,
    };
    if (editingId) {
      update.mutate({ id: editingId, updates: payload }, { onSuccess: () => setShowCreate(false) });
    } else {
      create.mutate(payload, {
        onSuccess: (row: any) => {
          // Switch to edit mode on the just-created row so the receipts panel appears
          setEditingId(row.id);
          toast({ title: 'Expense created', description: 'Now attach a receipt below (optional).' });
        },
      });
    }
  };

  const exportCSV = () => {
    const rows = (expenses ?? []).map((e: any) => [
      e.expense_date, e.category, e.vendor_name || '',
      e.pm_managed_properties?.address_line_1 || '',
      e.subtotal, e.gst_amount, e.pst_amount, e.total, e.status,
      e.is_owner_visible ? 'yes' : 'no',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = ['Date,Category,Vendor,Property,Subtotal,GST,PST,Total,Status,OwnerVisible', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'pm-expenses.csv'; a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property Expenses</h1>
          <p className="text-sm text-muted-foreground">Track property-related expenses. Private by default; mark owner-visible to include in future owner statements.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Expense
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{fmt(totals.total)}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Count</p><p className="text-lg font-bold">{totals.count}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Draft</p><p className="text-lg font-bold">{totals.draft}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold">{totals.pending}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Paid</p><p className="text-lg font-bold">{totals.paid}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search vendor, ref, description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="min-w-[180px]">
            <Label className="text-xs">Property</Label>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.address_line_1}{p.city ? `, ${p.city}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[140px]">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PM_EXPENSE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <Label className="text-xs">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PM_EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (expenses ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No property expenses yet</p>
              <Button size="sm" className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreate}>Add First Expense</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(expenses ?? []).map((e: any) => (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => openEdit(e)}>
                      <TableCell>{format(new Date(e.expense_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{e.pm_managed_properties?.address_line_1}{e.pm_units?.unit_label ? ` · ${e.pm_units.unit_label}` : ''}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell>{e.vendor_name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {e.pm_work_orders?.work_order_number && <Badge variant="outline" className="text-[10px]">{e.pm_work_orders.work_order_number}</Badge>}
                          {e.pm_maintenance_requests?.id && <Badge variant="outline" className="text-[10px]">Req</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmt(Number(e.total))}</TableCell>
                      <TableCell><Badge className={statusColor[e.status] || ''}>{e.status}</Badge></TableCell>
                      <TableCell>
                        {e.is_owner_visible
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Eye className="h-3 w-3" /> Owner</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><EyeOff className="h-3 w-3" /> Private</span>}
                      </TableCell>
                      <TableCell onClick={ev => ev.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(e)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => update.mutate({ id: e.id, updates: { is_owner_visible: !e.is_owner_visible } })}>
                              {e.is_owner_visible ? 'Hide from owner' : 'Mark owner-visible'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm('Delete this expense?')) del.mutate(e.id); }}>Delete</DropdownMenuItem>
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

      {/* Create / Edit */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Property Expense' : 'New Property Expense'}</DialogTitle>
            <DialogDescription>Private by default. Admin-only notes are never shown to owners or tenants.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Property *</Label>
                <Select value={form.property_id || undefined} onValueChange={v => setForm({ ...form, property_id: v, unit_id: null })}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {(properties ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.address_line_1}{p.city ? `, ${p.city}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={form.unit_id || '_none'} onValueChange={v => setForm({ ...form, unit_id: v === '_none' ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Whole property" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Whole property</SelectItem>
                    {(units ?? []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.unit_label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PM_EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendor / Supplier</Label>
                <Select
                  value={PM_VENDOR_OPTIONS.includes(form.vendor_name) ? form.vendor_name : (form.vendor_name ? '__other__' : '')}
                  onValueChange={v => setForm({ ...form, vendor_name: v === '__other__' ? '' : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select vendor..." /></SelectTrigger>
                  <SelectContent>
                    {PM_VENDOR_OPTIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    <SelectItem value="__other__">Other (type below)</SelectItem>
                  </SelectContent>
                </Select>
                {(!PM_VENDOR_OPTIONS.includes(form.vendor_name)) && (
                  <Input
                    className="mt-2"
                    value={form.vendor_name}
                    onChange={e => setForm({ ...form, vendor_name: e.target.value })}
                    placeholder="Enter vendor name..."
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Expense Date</Label><Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div><Label>Subtotal</Label><Input type="number" step="0.01" value={form.subtotal} onChange={e => setForm({ ...form, subtotal: e.target.value })} /></div>
              <div>
                <Label>GST (%)</Label>
                <Input type="number" step="0.01" value={form.gst_percent} onChange={e => setForm({ ...form, gst_percent: e.target.value })} />
              </div>
              <div>
                <Label>PST (%)</Label>
                <Input type="number" step="0.01" value={form.pst_percent} onChange={e => setForm({ ...form, pst_percent: e.target.value })} />
              </div>
              <div>
                <Label>Total</Label>
                <Input disabled value={(Number(form.subtotal || 0) * (1 + Number(form.gst_percent || 0) / 100 + Number(form.pst_percent || 0) / 100)).toFixed(2)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              GST {form.gst_percent || 0}% = ${(Number(form.subtotal || 0) * Number(form.gst_percent || 0) / 100).toFixed(2)} · PST {form.pst_percent || 0}% = ${(Number(form.subtotal || 0) * Number(form.pst_percent || 0) / 100).toFixed(2)}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PM_EXPENSE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={form.payment_method || ''} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                  <SelectContent>
                    {PM_PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Reference / Receipt #</Label>
              <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="rounded-md border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Owner-visible?</p>
                  <p className="text-xs text-muted-foreground">Off = private to admin/ops only. On = will appear on future owner statements.</p>
                </div>
                <Switch checked={form.is_owner_visible} onCheckedChange={v => setForm({ ...form, is_owner_visible: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Billable to owner?</p>
                  <p className="text-xs text-muted-foreground">Flag only — no automatic billing occurs in this phase.</p>
                </div>
                <Switch checked={form.is_billable_to_owner} onCheckedChange={v => setForm({ ...form, is_billable_to_owner: v })} />
              </div>
              <div>
                <Label>Owner-visible note</Label>
                <Textarea rows={2} value={form.owner_visible_note} onChange={e => setForm({ ...form, owner_visible_note: e.target.value })} placeholder="Optional — shown to owner if expense is owner-visible" />
              </div>
            </div>

            <div>
              <Label>Admin-only note</Label>
              <Textarea rows={2} value={form.admin_note} onChange={e => setForm({ ...form, admin_note: e.target.value })} placeholder="Internal only — never shown to owner or tenant" />
            </div>

            {editingId && (
              <div className="border-t pt-3">
                <ReceiptsPanel expenseId={editingId} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={!form.property_id || create.isPending || update.isPending}>
              {editingId ? 'Save Changes' : 'Create Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
