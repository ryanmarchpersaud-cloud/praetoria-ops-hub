import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, MoreHorizontal, Package, Pencil, Archive, Copy, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_TYPES = ['Service', 'Package', 'Add-On', 'Inspection', 'Recurring Plan', 'Seasonal Program'];
const SERVICE_CATEGORIES = [
  'Snow & Ice', 'Landscaping & Grounds', 'Junk Removal', 'Property Care & Maintenance',
  'Cleaning Services', 'Power Washing', 'Property Inspection', 'Bylaw / Compliance', 'Other',
];
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
};

const emptyForm = {
  name: '', description: '', product_type: 'Service', service_category: 'Other',
  unit_price: '0', unit_label: 'per visit', status: 'Active',
};

export default function ProductsServicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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
        name: form.name,
        description: form.description || null,
        product_type: form.product_type,
        service_category: form.service_category,
        unit_price: parseFloat(form.unit_price) || 0,
        unit_label: form.unit_label || 'per visit',
        status: form.status,
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
      const { error } = await supabase.from('products_services').insert({
        name: `${item.name} (Copy)`,
        description: item.description,
        product_type: item.product_type,
        service_category: item.service_category,
        unit_price: item.unit_price,
        unit_label: item.unit_label,
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
    });
    setDialogOpen(true);
  };

  const filtered = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (![p.name, p.description, p.product_type, p.service_category].join(' ').toLowerCase().includes(q)) return false;
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
  };

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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input placeholder="e.g. Driveway Snow Clearing" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Detailed description for quotes and invoices..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.service_category} onValueChange={(v) => setForm({ ...form, service_category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Price ($)</Label>
                    <Input type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Label</Label>
                    <Input placeholder="per visit" value={form.unit_label} onChange={(e) => setForm({ ...form, unit_label: e.target.value })} />
                  </div>
                </div>
                {editingId && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id} className={p.status !== 'Active' ? 'opacity-60' : ''}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{p.name}</p>
                              {p.description && <p className="text-xs text-muted-foreground truncate max-w-[280px]">{p.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">{p.product_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{p.service_category}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-right font-medium">
                            ${Number(p.unit_price).toFixed(2)}
                            {p.unit_label && <span className="text-xs text-muted-foreground ml-1">/{p.unit_label}</span>}
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">How it works</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>Items you create here appear as options when building quotes, creating jobs, and generating invoices.</p>
                <p>Customers can select from active items when submitting service requests through the portal.</p>
                <p>Deactivated items are hidden from customers but preserved in historical records.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
