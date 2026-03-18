import { useState } from 'react';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PROVINCES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: customers = [], isLoading } = useCustomers(search || undefined);
  const createCustomer = useCreateCustomer();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createCustomer.mutateAsync({
        first_name: fd.get('first_name') as string,
        last_name: fd.get('last_name') as string,
        company_name: (fd.get('company_name') as string) || null,
        email: (fd.get('email') as string) || null,
        phone: (fd.get('phone') as string) || null,
        address_line_1: (fd.get('address_line_1') as string) || null,
        city: (fd.get('city') as string) || null,
        province: (fd.get('province') as string) || null,
        postal_code: (fd.get('postal_code') as string) || null,
        notes: (fd.get('notes') as string) || null,
      });
      toast({ title: 'Customer created' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} total customers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name *</Label><Input name="first_name" required /></div>
                <div><Label>Last Name *</Label><Input name="last_name" required /></div>
              </div>
              <div><Label>Company</Label><Input name="company_name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input name="email" type="email" /></div>
                <div><Label>Phone</Label><Input name="phone" /></div>
              </div>
              <div><Label>Address</Label><Input name="address_line_1" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>City</Label><Input name="city" /></div>
                <div>
                  <Label>Province</Label>
                  <select name="province" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">—</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div><Label>Postal Code</Label><Input name="postal_code" /></div>
              </div>
              <div><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full" disabled={createCustomer.isPending}>
                {createCustomer.isPending ? 'Creating...' : 'Add Customer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">City</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : customers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
            ) : (
              customers.map(c => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link to={`/customers/${c.id}`} className="hover:text-primary">{c.first_name} {c.last_name}</Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{c.company_name || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{c.email || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{c.phone || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{c.city || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="w-8"><Link to={`/customers/${c.id}`}><ChevronRight className="h-4 w-4 text-muted-foreground/40" /></Link></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
