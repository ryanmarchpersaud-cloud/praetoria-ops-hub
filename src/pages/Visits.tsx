import { useState } from 'react';
import { useVisits, useCreateVisit } from '@/hooks/useVisits';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, ChevronRight, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VISIT_STATUSES, VISIT_TYPES } from '@/lib/constants';
import { useJobs } from '@/hooks/useJobs';
import { format } from 'date-fns';

export default function Visits() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: visits = [], isLoading } = useVisits({ visit_status: statusFilter || undefined, search: search || undefined });
  const { data: jobs = [] } = useJobs();
  const createVisit = useCreateVisit();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const selectedJob = (jobs as any[]).find((j: any) => j.id === fd.get('job_id'));
    try {
      await createVisit.mutateAsync({
        visit_number: '',
        job_id: fd.get('job_id') as string,
        property_id: selectedJob?.property_id || null,
        customer_id: selectedJob?.customer_id || null,
        service_date: (fd.get('service_date') as string) || new Date().toISOString().split('T')[0],
        visit_type: (fd.get('visit_type') as any) || 'Routine',
        crew_notes: (fd.get('crew_notes') as string) || null,
        weather_notes: (fd.get('weather_notes') as string) || null,
      });
      toast({ title: 'Visit created' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Visits</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{visits.length} total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">New </span>Visit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-3">
            <DialogHeader><DialogTitle>Log Visit</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <Label>Job *</Label>
                <select name="job_id" required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                  <option value="">Select job...</option>
                  {(jobs as any[]).map((j: any) => <option key={j.id} value={j.id}>{j.job_number} — {j.job_title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Service Date *</Label><Input name="service_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} /></div>
                <div>
                  <Label>Visit Type</Label>
                  <select name="visit_type" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                    {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div><Label>Crew Notes</Label><Textarea name="crew_notes" rows={2} placeholder="Notes for the crew..." /></div>
              <div><Label>Weather Notes</Label><Input name="weather_notes" placeholder="e.g. Light snow, -5C" /></div>
              <Button type="submit" className="w-full h-11" disabled={createVisit.isPending}>
                {createVisit.isPending ? 'Creating...' : 'Log Visit'}
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
            {VISIT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? <p className="text-center text-muted-foreground py-8 text-sm">Loading...</p>
        : visits.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">No visits found</p>
        : visits.map((v: any) => (
          <Link key={v.id} to={`/visits/${v.id}`} className="block bg-card border rounded-lg p-3 active:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{v.visit_number}</p>
                <p className="text-[11px] text-muted-foreground">{v.jobs?.job_title || 'Unknown job'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted-foreground">{v.service_date}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground">{v.visit_type}</span>
                </div>
                {v.weather_notes && (
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <Cloud className="h-3 w-3" /> {v.weather_notes}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={v.visit_status} showIcon={false} />
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
              <TableHead>Visit</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Weather</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            : visits.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No visits found</TableCell></TableRow>
            : visits.map((v: any) => (
              <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link to={`/visits/${v.id}`} className="block font-medium mono text-sm">{v.visit_number}</Link>
                </TableCell>
                <TableCell className="text-sm">
                  {v.jobs ? <Link to={`/jobs/${v.jobs.id || ''}`} className="text-primary hover:underline">{v.jobs.job_number}</Link> : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.properties?.property_name || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.service_date ? format(new Date(v.service_date), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell className="text-sm">{v.visit_type}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{v.weather_notes || '—'}</TableCell>
                <TableCell><StatusBadge status={v.visit_status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
