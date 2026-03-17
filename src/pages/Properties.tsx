import { useState } from 'react';
import { useProperties, useCreateProperty } from '@/hooks/useProperties';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PROPERTY_STATUSES, PROPERTY_TYPES, PROVINCES } from '@/lib/constants';
import { useCustomers } from '@/hooks/useCustomers';

export default function Properties() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: properties = [], isLoading } = useProperties({ status: statusFilter || undefined, search: search || undefined });
  const { data: customers = [] } = useCustomers();
  const createProperty = useCreateProperty();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createProperty.mutateAsync({
        customer_id: fd.get('customer_id') as string,
        property_name: fd.get('property_name') as string,
        address_line_1: (fd.get('address_line_1') as string) || null,
        city: (fd.get('city') as string) || null,
        province: (fd.get('province') as string) || null,
        postal_code: (fd.get('postal_code') as string) || null,
        property_type: (fd.get('property_type') as any) || 'Residential',
        access_notes: (fd.get('access_notes') as string) || null,
        gate_code: (fd.get('gate_code') as string) || null,
        seasonal_notes: (fd.get('seasonal_notes') as string) || null,
      });
      toast({ title: 'Property created' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Properties</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{properties.length} total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">New </span>Property</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3">
            <DialogHeader><DialogTitle>Add Property</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label>Customer *</Label>
                <select name="customer_id" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                  <option value="">Select customer...</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company_name ? ` — ${c.company_name}` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Property Name *</Label><Input name="property_name" required placeholder="e.g. Main Office" /></div>
                <div>
                  <Label>Type</Label>
                  <select name="property_type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Address</Label><Input name="address_line_1" /></div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2"><Label>City</Label><Input name="city" /></div>
                <div>
                  <Label>Prov.</Label>
                  <select name="province" className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm h-10">
                    <option value="">—</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><Label>Postal</Label><Input name="postal_code" /></div>
              </div>
              <div><Label>Access Notes</Label><Textarea name="access_notes" rows={2} placeholder="Entry instructions, key locations..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Gate Code</Label><Input name="gate_code" /></div>
                <div><Label>Seasonal Notes</Label><Input name="seasonal_notes" placeholder="e.g. Salt Nov-Mar" /></div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={createProperty.isPending}>
                {createProperty.isPending ? 'Creating...' : 'Create Property'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[130px] h-9 text-xs md:text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PROPERTY_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? <p className="text-center text-muted-foreground py-8 text-sm">Loading...</p>
        : properties.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">No properties found</p>
        : properties.map((p: any) => (
          <Link key={p.id} to={`/properties/${p.id}`} className="block bg-card border rounded-lg p-3 active:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{p.property_name}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{[p.address_line_1, p.city].filter(Boolean).join(', ') || 'No address'}</span>
                </div>
                {p.customers && <p className="text-[11px] text-muted-foreground mt-1">{p.customers.first_name} {p.customers.last_name}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={p.status} showIcon={false} />
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            : properties.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No properties found</TableCell></TableRow>
            : properties.map((p: any) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link to={`/properties/${p.id}`} className="block font-medium">{p.property_name}</Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.customers ? `${p.customers.first_name} ${p.customers.last_name}` : '—'}
                </TableCell>
                <TableCell className="text-sm">{p.property_type}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{[p.city, p.province].filter(Boolean).join(', ') || '—'}</TableCell>
                <TableCell><StatusBadge status={p.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
