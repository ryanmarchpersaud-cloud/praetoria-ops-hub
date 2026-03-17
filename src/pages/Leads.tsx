import { useState } from 'react';
import { useLeads, useCreateLead, useDeleteLead } from '@/hooks/useLeads';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SERVICE_CATEGORIES, LEAD_STATUSES, LEAD_SOURCES, URGENCY_LEVELS, PROVINCES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

export default function Leads() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: leads = [], isLoading } = useLeads({
    status: statusFilter || undefined,
    service_type: serviceFilter || undefined,
    search: search || undefined,
  });
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createLead.mutateAsync({
        first_name: fd.get('first_name') as string,
        last_name: fd.get('last_name') as string,
        company_name: (fd.get('company_name') as string) || null,
        email: (fd.get('email') as string) || null,
        phone: (fd.get('phone') as string) || null,
        service_type: (fd.get('service_type') as any) || 'Other',
        address_line_1: (fd.get('address_line_1') as string) || null,
        city: (fd.get('city') as string) || null,
        province: (fd.get('province') as string) || null,
        postal_code: (fd.get('postal_code') as string) || null,
        lead_source: (fd.get('lead_source') as string) || null,
        urgency: (fd.get('urgency') as string) || 'Normal',
        description: (fd.get('description') as string) || null,
      });
      toast({ title: 'Lead created' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} total leads</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Lead</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Lead</DialogTitle></DialogHeader>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Service</Label>
                  <select name="service_type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Source</Label>
                  <select name="lead_source" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
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
              <div>
                <Label>Urgency</Label>
                <select name="urgency" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><Label>Description</Label><Textarea name="description" /></div>
              <Button type="submit" className="w-full" disabled={createLead.isPending}>
                {createLead.isPending ? 'Creating...' : 'Create Lead'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={v => setServiceFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {SERVICE_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Source</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : leads.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No leads found</TableCell></TableRow>
            ) : (
              leads.map(lead => (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to={`/leads/${lead.id}`} className="block">
                      <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                      {lead.company_name && <p className="text-xs text-muted-foreground">{lead.company_name}</p>}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{lead.service_type}</TableCell>
                  <TableCell><StatusBadge status={lead.status} /></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{lead.lead_source || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      onClick={(e) => { e.preventDefault(); deleteLead.mutate(lead.id); }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
