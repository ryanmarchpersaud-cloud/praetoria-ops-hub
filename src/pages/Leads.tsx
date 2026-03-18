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
import { Plus, Search, Trash2, Phone, Mail, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SERVICE_CATEGORIES, LEAD_STATUSES, LEAD_SOURCES, URGENCY_LEVELS, PROVINCES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

export default function Leads() {
  const navigate = useNavigate();
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
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Leads</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{leads.length} total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="md:size-default"><Plus className="h-4 w-4 mr-1 md:mr-2" /><span className="hidden sm:inline">New </span>Lead</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3">
            <DialogHeader><DialogTitle>Create Lead</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name *</Label><Input name="first_name" required autoComplete="given-name" /></div>
                <div><Label>Last Name *</Label><Input name="last_name" required autoComplete="family-name" /></div>
              </div>
              <div><Label>Company</Label><Input name="company_name" autoComplete="organization" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input name="email" type="email" autoComplete="email" inputMode="email" /></div>
                <div><Label>Phone</Label><Input name="phone" type="tel" autoComplete="tel" inputMode="tel" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Service</Label>
                  <select name="service_type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Source</Label>
                  <select name="lead_source" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Address</Label><Input name="address_line_1" autoComplete="street-address" /></div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2"><Label>City</Label><Input name="city" autoComplete="address-level2" /></div>
                <div className="col-span-1">
                  <Label>Prov.</Label>
                  <select name="province" className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm h-10">
                    <option value="">—</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-2"><Label>Postal</Label><Input name="postal_code" autoComplete="postal-code" /></div>
              </div>
              <div>
                <Label>Urgency</Label>
                <select name="urgency" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                  {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><Label>Description</Label><Textarea name="description" rows={3} /></div>
              <Button type="submit" className="w-full h-11" disabled={createLead.isPending}>
                {createLead.isPending ? 'Creating...' : 'Create Lead'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[120px] md:w-[160px] h-9 text-xs md:text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={v => setServiceFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[120px] md:w-[160px] h-9 text-xs md:text-sm"><SelectValue placeholder="Service" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {SERVICE_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: Card list */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Loading...</p>
        ) : leads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No leads found</p>
        ) : (
          leads.map(lead => (
            <Link
              key={lead.id}
              to={`/leads/${lead.id}`}
              className="block bg-card border rounded-lg p-3 active:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{lead.first_name} {lead.last_name}</p>
                  {lead.company_name && <p className="text-xs text-muted-foreground truncate">{lead.company_name}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-muted-foreground">{lead.service_type}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={lead.status} showIcon={false} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </div>
              {/* Quick tap actions */}
              <div className="flex gap-2 mt-2 pt-2 border-t border-border/50">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] text-primary px-2 py-1 rounded bg-primary/10 active:bg-primary/20"
                  >
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-[11px] text-primary px-2 py-1 rounded bg-primary/10 active:bg-primary/20"
                  >
                    <Mail className="h-3 w-3" /> Email
                  </a>
                )}
                {lead.urgency && ['High', 'Urgent'].includes(lead.urgency) && (
                  <span className="flex items-center text-[11px] text-warning px-2 py-1 rounded bg-warning/10 font-medium">
                    {lead.urgency}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: Table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Service</TableHead>
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
                <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/leads/${lead.id}`)}>
                  <TableCell>
                    <Link to={`/leads/${lead.id}`} className="block">
                      <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                      {lead.company_name && <p className="text-xs text-muted-foreground">{lead.company_name}</p>}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{lead.service_type}</TableCell>
                  <TableCell><StatusBadge status={lead.status} /></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{lead.lead_source || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteLead.mutate(lead.id); }}
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
