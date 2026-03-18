import { useState } from 'react';
import { useJobs, useCreateJob } from '@/hooks/useJobs';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, ChevronRight, Briefcase } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { JOB_STATUSES, JOB_PRIORITIES, SERVICE_CATEGORIES } from '@/lib/constants';
import { useCustomers } from '@/hooks/useCustomers';
import { useProperties } from '@/hooks/useProperties';
import { format } from 'date-fns';

export default function Jobs() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const { toast } = useToast();

  const { data: jobs = [], isLoading } = useJobs({ status: statusFilter || undefined, search: search || undefined });
  const { data: customers = [] } = useCustomers();
  const { data: properties = [] } = useProperties();
  const createJob = useCreateJob();

  const filteredProperties = selectedCustomerId
    ? (properties as any[]).filter((p: any) => p.customer_id === selectedCustomerId)
    : [];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createJob.mutateAsync({
        job_number: '',
        customer_id: fd.get('customer_id') as string,
        property_id: (fd.get('property_id') as string) || null,
        service_category: (fd.get('service_category') as any) || 'Other',
        job_title: fd.get('job_title') as string,
        scope_of_work: (fd.get('scope_of_work') as string) || null,
        priority: (fd.get('priority') as any) || 'Normal',
        scheduled_date: (fd.get('scheduled_date') as string) || null,
        internal_notes: (fd.get('internal_notes') as string) || null,
      });
      toast({ title: 'Job created' });
      setDialogOpen(false);
      setSelectedCustomerId('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const priorityColor = (p: string) => {
    if (p === 'Urgent') return 'text-destructive font-semibold';
    if (p === 'High') return 'text-orange-600 font-medium';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Jobs</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{jobs.length} total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">New </span>Job</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3">
            <DialogHeader><DialogTitle>Create Job</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label>Customer *</Label>
                <select name="customer_id" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10"
                  onChange={e => setSelectedCustomerId(e.target.value)}>
                  <option value="">Select customer...</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.company_name ? ` — ${c.company_name}` : ''}</option>)}
                </select>
              </div>
              {filteredProperties.length > 0 && (
                <div>
                  <Label>Property</Label>
                  <select name="property_id" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    <option value="">No property</option>
                    {filteredProperties.map((p: any) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                  </select>
                </div>
              )}
              <div><Label>Job Title *</Label><Input name="job_title" required placeholder="e.g. Winter Snow Clearing" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Service</Label>
                  <select name="service_category" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {SERVICE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <select name="priority" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {JOB_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Scheduled Date</Label><Input name="scheduled_date" type="date" /></div>
              <div><Label>Scope of Work</Label><Textarea name="scope_of_work" rows={3} /></div>
              <div><Label>Internal Notes</Label><Textarea name="internal_notes" rows={2} /></div>
              <Button type="submit" className="w-full h-11" disabled={createJob.isPending}>
                {createJob.isPending ? 'Creating...' : 'Create Job'}
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
            {JOB_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? <p className="text-center text-muted-foreground py-8 text-sm">Loading...</p>
        : jobs.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">No jobs found</p>
        : jobs.map((j: any) => (
          <Link key={j.id} to={`/jobs/${j.id}`} className="block bg-card border rounded-lg p-3 active:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{j.job_title}</p>
                <p className="text-[11px] text-muted-foreground mono">{j.job_number}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted-foreground">{j.service_category}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className={`text-[11px] ${priorityColor(j.priority)}`}>{j.priority}</span>
                </div>
                {j.properties && <p className="text-[11px] text-muted-foreground mt-0.5">{j.properties.property_name}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={j.status} showIcon={false} />
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
              <TableHead>Job</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            : jobs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No jobs found</TableCell></TableRow>
            : jobs.map((j: any) => (
              <TableRow key={j.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link to={`/jobs/${j.id}`} className="block">
                    <p className="font-medium">{j.job_title}</p>
                    <p className="text-xs text-muted-foreground mono">{j.job_number}</p>
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.customers ? `${j.customers.first_name} ${j.customers.last_name}` : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.properties?.property_name || '—'}</TableCell>
                <TableCell className="text-sm">{j.service_category}</TableCell>
                <TableCell className={`text-sm ${priorityColor(j.priority)}`}>{j.priority}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.scheduled_date ? format(new Date(j.scheduled_date), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell><StatusBadge status={j.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
