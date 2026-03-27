import { useState } from 'react';
import { useJobs } from '@/hooks/useJobs';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { JOB_STATUSES } from '@/lib/constants';
import { useActionPermissions } from '@/hooks/useActionPermissions';
import { format } from 'date-fns';

export default function Jobs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: jobs = [], isLoading } = useJobs({ status: statusFilter || undefined, search: search || undefined });
  const { canManageJobs } = useActionPermissions();

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
        {canManageJobs && (
          <Button size="sm" onClick={() => navigate('/jobs/new')}>
            <Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">New </span>Job
          </Button>
        )}
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
              <TableRow key={j.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/jobs/${j.id}`)}>
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
