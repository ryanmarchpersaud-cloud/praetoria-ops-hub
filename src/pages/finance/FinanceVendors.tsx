import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFinanceVendors, useCreateFinanceVendor, useUpdateFinanceVendor, useFinanceExpenses, useFinanceBills } from '@/hooks/useFinance';
import { Plus, Search, Store, Mail, Phone, MoreHorizontal, DollarSign, FileText, Receipt } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const fmt = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

export default function FinanceVendors() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showInactive, setShowInactive] = useState(false);
  const [detailVendor, setDetailVendor] = useState<any>(null);

  const { data: vendors, isLoading } = useFinanceVendors();
  const { data: expenses } = useFinanceExpenses();
  const { data: bills } = useFinanceBills();
  const createVendor = useCreateFinanceVendor();
  const updateVendor = useUpdateFinanceVendor();

  // Compute spend per vendor
  const vendorSpend: Record<string, number> = {};
  (expenses ?? []).forEach((e: any) => {
    if (e.vendor_id) vendorSpend[e.vendor_id] = (vendorSpend[e.vendor_id] || 0) + Number(e.amount_total || 0);
  });
  const vendorBillTotal: Record<string, number> = {};
  (bills ?? []).forEach((b: any) => {
    if (b.vendor_id) vendorBillTotal[b.vendor_id] = (vendorBillTotal[b.vendor_id] || 0) + Number(b.total || 0);
  });

  const filtered = (vendors ?? []).filter((v: any) => {
    if (!showInactive && !v.is_active) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return v.vendor_name?.toLowerCase().includes(s) || v.contact_name?.toLowerCase().includes(s) || v.email?.toLowerCase().includes(s);
  });

  const handleCreate = () => {
    createVendor.mutate(form, { onSuccess: () => { setShowCreate(false); setForm({}); } });
  };

  const vendorExpenses = detailVendor ? (expenses ?? []).filter((e: any) => e.vendor_id === detailVendor.id) : [];
  const vendorBills = detailVendor ? (bills ?? []).filter((b: any) => b.vendor_id === detailVendor.id) : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage your supplier and vendor directory</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Vendor</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Active Vendors</p><p className="text-lg font-bold">{(vendors ?? []).filter((v: any) => v.is_active).length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Expense Spend</p><p className="text-lg font-bold">{fmt(Object.values(vendorSpend).reduce((a, b) => a + b, 0))}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Bill Volume</p><p className="text-lg font-bold">{fmt(Object.values(vendorBillTotal).reduce((a, b) => a + b, 0))}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant={showInactive ? 'secondary' : 'outline'} size="sm" onClick={() => setShowInactive(!showInactive)}>
          {showInactive ? 'Hide' : 'Show'} Inactive
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No vendors found</p>
              <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Add First Vendor</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v: any) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailVendor(v)}>
                      <TableCell className="font-medium">{v.vendor_name}</TableCell>
                      <TableCell>{v.contact_name || '—'}</TableCell>
                      <TableCell>{v.email ? <span className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" />{v.email}</span> : '—'}</TableCell>
                      <TableCell>{v.phone ? <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{v.phone}</span> : '—'}</TableCell>
                      <TableCell className="text-right font-medium">{fmt((vendorSpend[v.id] || 0) + (vendorBillTotal[v.id] || 0))}</TableCell>
                      <TableCell className="text-sm">{v.payment_terms || '—'}</TableCell>
                      <TableCell><Badge variant={v.is_active ? 'default' : 'secondary'}>{v.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateVendor.mutate({ id: v.id, is_active: !v.is_active }); }}>
                              {v.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
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

      {/* Vendor Detail Dialog */}
      <Dialog open={!!detailVendor} onOpenChange={(o) => { if (!o) setDetailVendor(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" /> {detailVendor?.vendor_name}
              <Badge variant={detailVendor?.is_active ? 'default' : 'secondary'}>{detailVendor?.is_active ? 'Active' : 'Inactive'}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-bold">{fmt(vendorSpend[detailVendor?.id] || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Bills</p><p className="text-lg font-bold">{fmt(vendorBillTotal[detailVendor?.id] || 0)}</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{fmt((vendorSpend[detailVendor?.id] || 0) + (vendorBillTotal[detailVendor?.id] || 0))}</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span className="text-muted-foreground">Contact:</span> {detailVendor?.contact_name || '—'}</div>
            <div><span className="text-muted-foreground">Email:</span> {detailVendor?.email || '—'}</div>
            <div><span className="text-muted-foreground">Phone:</span> {detailVendor?.phone || '—'}</div>
            <div><span className="text-muted-foreground">Terms:</span> {detailVendor?.payment_terms || '—'}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {[detailVendor?.address_line_1, detailVendor?.city, detailVendor?.province, detailVendor?.postal_code].filter(Boolean).join(', ') || '—'}</div>
            {detailVendor?.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {detailVendor.notes}</div>}
          </div>

          <Tabs defaultValue="expenses">
            <TabsList>
              <TabsTrigger value="expenses">Expenses ({vendorExpenses.length})</TabsTrigger>
              <TabsTrigger value="bills">Bills ({vendorBills.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="expenses">
              {vendorExpenses.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No expenses for this vendor</p> : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {vendorExpenses.slice(0, 20).map((e: any) => (
                    <div key={e.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border">
                      <div><span className="font-medium">{e.expense_number}</span> <span className="text-muted-foreground ml-1">{e.category}</span></div>
                      <div className="text-right"><span className="font-medium">{fmt(Number(e.amount_total))}</span> <Badge variant="outline" className="ml-1 text-[10px]">{e.status}</Badge></div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="bills">
              {vendorBills.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No bills for this vendor</p> : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {vendorBills.slice(0, 20).map((b: any) => (
                    <div key={b.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border">
                      <span className="font-medium">{b.bill_number}</span>
                      <div className="text-right"><span className="font-medium">{fmt(Number(b.total))}</span> <Badge variant="outline" className="ml-1 text-[10px]">{b.status}</Badge></div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Vendor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Vendor Name *</Label><Input value={form.vendor_name || ''} onChange={e => setForm({ ...form, vendor_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Name</Label><Input value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Phone</Label><Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Website</Label><Input value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address_line_1 || ''} onChange={e => setForm({ ...form, address_line_1: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City</Label><Input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Province</Label><Input value={form.province || ''} onChange={e => setForm({ ...form, province: e.target.value })} /></div>
              <div><Label>Postal Code</Label><Input value={form.postal_code || ''} onChange={e => setForm({ ...form, postal_code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Payment Terms</Label><Input value={form.payment_terms || 'Net 30'} onChange={e => setForm({ ...form, payment_terms: e.target.value })} /></div>
              <div><Label>Tax Number</Label><Input value={form.tax_number || ''} onChange={e => setForm({ ...form, tax_number: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.vendor_name || createVendor.isPending}>Create Vendor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
