import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, MoreHorizontal, Package, Pencil, Archive, Copy, XCircle, Check, Globe, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_TYPES = ['Service', 'Package', 'Add-On', 'Inspection', 'Recurring Plan', 'Material / Product'];
const SERVICE_CATEGORIES = [
  'Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance',
  'Cleaning Services', 'Power Washing', 'Property Inspection', 'Bylaw / Compliance', 'Other',
];
const PRICE_TYPES = ['Flat Rate', 'Hourly', 'Per Visit', 'Per Month', 'Per Unit', 'Custom Quote'];
const STATUS_OPTIONS = ['Active', 'Inactive', 'Archived'];

type Product = {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  service_category: string;
  unit_price: number;
  unit_label: string | null;
  status: string;
  sort_order: number;
  taxable: boolean;
  online_booking_enabled: boolean;
  customer_visible: boolean;
  internal_item_code: string | null;
  price_type: string;
  minimum_charge: number;
  seasonal_label: string | null;
  recurring_eligible: boolean;
  portal_display_description: string | null;
  internal_notes: string | null;
};

type FormState = {
  name: string;
  description: string;
  product_type: string;
  service_category: string;
  unit_price: string;
  unit_label: string;
  status: string;
  taxable: boolean;
  online_booking_enabled: boolean;
  customer_visible: boolean;
  internal_item_code: string;
  price_type: string;
  minimum_charge: string;
  seasonal_label: string;
  recurring_eligible: boolean;
  portal_display_description: string;
  internal_notes: string;
};

const emptyForm: FormState = {
  name: '', description: '', product_type: 'Service', service_category: 'Other',
  unit_price: '0', unit_label: 'per visit', status: 'Active',
  taxable: true, online_booking_enabled: false, customer_visible: true,
  internal_item_code: '', price_type: 'Flat Rate', minimum_charge: '0',
  seasonal_label: '', recurring_eligible: false, portal_display_description: '', internal_notes: '',
};

export default function ProductsServicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products_services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_services')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        product_type: form.product_type,
        service_category: form.service_category,
        unit_price: parseFloat(form.unit_price) || 0,
        unit_label: form.unit_label.trim() || 'per visit',
        status: form.status,
        taxable: form.taxable,
        online_booking_enabled: form.online_booking_enabled,
        customer_visible: form.customer_visible,
        internal_item_code: form.internal_item_code.trim() || null,
        price_type: form.price_type,
        minimum_charge: parseFloat(form.minimum_charge) || 0,
        seasonal_label: form.seasonal_label.trim() || null,
        recurring_eligible: form.recurring_eligible,
        portal_display_description: form.portal_display_description.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from('products_services').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products_services').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Item updated' : 'Item created');
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['products_services'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save'),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('products_services').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products_services'] });
      toast.success('Status updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (item: Product) => {
      const { id, sort_order, ...rest } = item;
      const { error } = await supabase.from('products_services').insert({
        ...rest,
        name: `${item.name} (Copy)`,
        status: 'Inactive',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products_services'] });
      toast.success('Item duplicated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description || '',
      product_type: p.product_type,
      service_category: p.service_category,
      unit_price: String(p.unit_price),
      unit_label: p.unit_label || 'per visit',
      status: p.status,
      taxable: p.taxable,
      online_booking_enabled: p.online_booking_enabled,
      customer_visible: p.customer_visible,
      internal_item_code: p.internal_item_code || '',
      price_type: p.price_type,
      minimum_charge: String(p.minimum_charge),
      seasonal_label: p.seasonal_label || '',
      recurring_eligible: p.recurring_eligible,
      portal_display_description: p.portal_display_description || '',
      internal_notes: p.internal_notes || '',
    });
    setDialogOpen(true);
  };

  const filtered = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (![p.name, p.description, p.product_type, p.service_category, p.internal_item_code].join(' ').toLowerCase().includes(q)) return false;
    }
    if (categoryFilter !== 'all' && p.service_category !== categoryFilter) return false;
    if (typeFilter !== 'all' && p.product_type !== typeFilter) return false;
    return true;
  });

  const counts = {
    total: products.length,
    active: products.filter((p) => p.status === 'Active').length,
    inactive: products.filter((p) => p.status === 'Inactive').length,
    archived: products.filter((p) => p.status === 'Archived').length,
    bookable: products.filter((p) => p.online_booking_enabled && p.status === 'Active').length,
    visible: products.filter((p) => p.customer_visible && p.status === 'Active').length,
  };

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products & Services</h1>
            <p className="text-sm text-muted-foreground">Master catalog — used in quotes, jobs, visits, invoices, and customer requests.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                <Plus className="h-4 w-4 mr-2" />Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Product / Service' : 'Add New Product / Service'}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-6 py-2">
                  {/* Core info */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Core Information</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label>Item Type *</Label>
                        <Select value={form.product_type} onValueChange={(v) => updateField('product_type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 col-span-2 sm:col-span-1">
                        <Label>Category *</Label>
                        <Select value={form.service_category} onValueChange={(v) => updateField('service_category', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input placeholder="e.g. Driveway Snow Clearing" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea placeholder="Internal description for quotes and invoices..." value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Internal Item Code</Label>
                        <Input placeholder="e.g. SNW-DRV-01" value={form.internal_item_code} onChange={(e) => updateField('internal_item_code', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Seasonal Label</Label>
                        <Input placeholder="e.g. Winter 2025-26" value={form.seasonal_label} onChange={(e) => updateField('seasonal_label', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Price Type</Label>
                        <Select value={form.price_type} onValueChange={(v) => updateField('price_type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRICE_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price ($)</Label>
                        <Input type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => updateField('unit_price', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Min. Charge ($)</Label>
                        <Input type="number" step="0.01" min="0" value={form.minimum_charge} onChange={(e) => updateField('minimum_charge', e.target.value)} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.taxable} onCheckedChange={(v) => updateField('taxable', v)} />
                      <Label className="font-normal">Taxable (HST/GST applies)</Label>
                    </div>
                  </div>

                  {/* Visibility & Booking */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Visibility & Booking</p>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.customer_visible} onCheckedChange={(v) => updateField('customer_visible', v)} />
                      <Label className="font-normal">Visible to customers in portal</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.online_booking_enabled} onCheckedChange={(v) => updateField('online_booking_enabled', v)} />
                      <Label className="font-normal">Available for online booking / requests</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch checked={form.recurring_eligible} onCheckedChange={(v) => updateField('recurring_eligible', v)} />
                      <Label className="font-normal">Eligible for recurring plans</Label>
                    </div>
                    {form.customer_visible && (
                      <div className="space-y-2">
                        <Label>Portal Display Description</Label>
                        <Textarea placeholder="Customer-friendly description shown in the portal..." value={form.portal_display_description} onChange={(e) => updateField('portal_display_description', e.target.value)} rows={2} />
                      </div>
                    )}
                  </div>

                  {/* Status & Notes */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status & Notes</p>
                    {editingId && (
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Internal Notes</Label>
                      <Textarea placeholder="Admin-only notes..." value={form.internal_notes} onChange={(e) => updateField('internal_notes', e.target.value)} rows={2} />
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name.trim() || saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Item' : 'Create Item'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
          {/* Main table */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search products & services..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{filtered.length} Item{filtered.length !== 1 ? 's' : ''}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading catalog...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    {products.length === 0 ? 'No products yet. Click "Add Item" to create your first catalog entry.' : 'No items match your filters.'}
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden md:table-cell">Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="hidden lg:table-cell text-right">Price</TableHead>
                          <TableHead className="hidden md:table-cell text-center">Tax</TableHead>
                          <TableHead className="hidden lg:table-cell text-center">Booking</TableHead>
                          <TableHead className="hidden lg:table-cell text-center">Visible</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((p) => (
                          <TableRow key={p.id} className={`cursor-pointer ${p.status !== 'Active' ? 'opacity-60' : ''}`} onClick={() => openEdit(p)}>
                            <TableCell>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{p.name}</p>
                                {p.internal_item_code && <p className="text-[10px] text-muted-foreground font-mono">{p.internal_item_code}</p>}
                                {p.description && <p className="text-xs text-muted-foreground truncate max-w-[240px]">{p.description}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline">{p.product_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{p.service_category}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-right font-medium whitespace-nowrap">
                              {p.price_type === 'Custom Quote' ? (
                                <span className="text-muted-foreground text-xs">Custom</span>
                              ) : (
                                <>
                                  ${Number(p.unit_price).toFixed(2)}
                                  <span className="text-xs text-muted-foreground ml-1">/ {p.price_type === 'Flat Rate' ? 'flat' : p.price_type.toLowerCase()}</span>
                                </>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-center">
                              {p.taxable ? <Check className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-center">
                              {p.online_booking_enabled ? <CalendarCheck className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-center">
                              {p.customer_visible ? <Globe className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'Active' ? 'default' : p.status === 'Archived' ? 'secondary' : 'outline'}>
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(p)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => duplicateMutation.mutate(p)}>
                                    <Copy className="h-3.5 w-3.5 mr-2" />Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {p.status === 'Active' ? (
                                    <DropdownMenuItem onClick={() => statusMutation.mutate({ id: p.id, status: 'Inactive' })}>
                                      <XCircle className="h-3.5 w-3.5 mr-2" />Deactivate
                                    </DropdownMenuItem>
                                  ) : p.status === 'Inactive' ? (
                                    <>
                                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: p.id, status: 'Active' })}>
                                        <Package className="h-3.5 w-3.5 mr-2" />Reactivate
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: p.id, status: 'Archived' })}>
                                        <Archive className="h-3.5 w-3.5 mr-2" />Archive
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem onClick={() => statusMutation.mutate({ id: p.id, status: 'Active' })}>
                                      <Package className="h-3.5 w-3.5 mr-2" />Reactivate
                                    </DropdownMenuItem>
                                  )}
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
          </div>

          {/* Right summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />Catalog Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-foreground">{counts.total}</span>
                  <span className="text-xs text-muted-foreground">Total Items</span>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Active</span><span className="font-medium text-emerald-600">{counts.active}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Inactive</span><span className="font-medium text-amber-600">{counts.inactive}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Archived</span><span className="font-medium text-muted-foreground">{counts.archived}</span></div>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><Globe className="h-3.5 w-3.5" />Customer Visible</span>
                    <span className="font-medium text-foreground">{counts.visible}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" />Online Booking</span>
                    <span className="font-medium text-foreground">{counts.bookable}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">How it works</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p><strong>Admin manages</strong> the catalog here. Items appear in quotes, jobs, visits, and invoices.</p>
                <p><strong>Customer portal</strong> only shows items marked as "Customer Visible." Online booking items appear in the request wizard.</p>
                <p><strong>Deactivated items</strong> are hidden from customers but preserved in historical records.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
