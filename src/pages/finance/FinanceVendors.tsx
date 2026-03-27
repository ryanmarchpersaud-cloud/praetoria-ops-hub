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
import { useFinanceVendors, useCreateFinanceVendor, useUpdateFinanceVendor } from '@/hooks/useFinance';
import { Plus, Search, Store, Mail, Phone, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function FinanceVendors() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showInactive, setShowInactive] = useState(false);

  const { data: vendors, isLoading } = useFinanceVendors();
  const createVendor = useCreateFinanceVendor();
  const updateVendor = useUpdateFinanceVendor();

  const filtered = (vendors ?? []).filter((v: any) => {
    if (!showInactive && !v.is_active) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return v.vendor_name?.toLowerCase().includes(s) || v.contact_name?.toLowerCase().includes(s) || v.email?.toLowerCase().includes(s);
  });

  const handleCreate = () => {
    createVendor.mutate(form, { onSuccess: () => { setShowCreate(false); setForm({}); } });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted-foreground">Manage your supplier and vendor directory</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New Vendor</Button>
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
                    <TableHead>Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.vendor_name}</TableCell>
                      <TableCell>{v.contact_name || '—'}</TableCell>
                      <TableCell>{v.email ? <span className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3" />{v.email}</span> : '—'}</TableCell>
                      <TableCell>{v.phone ? <span className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3" />{v.phone}</span> : '—'}</TableCell>
                      <TableCell className="text-sm">{v.payment_terms || '—'}</TableCell>
                      <TableCell><Badge variant={v.is_active ? 'default' : 'secondary'}>{v.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => updateVendor.mutate({ id: v.id, is_active: !v.is_active })}>
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
