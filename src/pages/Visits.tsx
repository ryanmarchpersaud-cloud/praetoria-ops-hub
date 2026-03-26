import { useState } from 'react';
import { useVisits } from '@/hooks/useVisits';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ChevronRight, Cloud, Camera, User, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { VISIT_STATUSES } from '@/lib/constants';
import { format } from 'date-fns';
import CreateVisitDialog from '@/components/CreateVisitDialog';

export default function Visits() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: visits = [], isLoading } = useVisits({ visit_status: statusFilter || undefined, search: search || undefined });

  const getPriorityIcon = (p: string) => {
    if (p === 'Urgent' || p === 'High') return <AlertTriangle className="h-3 w-3 text-destructive" />;
    return null;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Visits</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{visits.length} total</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Schedule </span>Visit
        </Button>
      </div>

      <CreateVisitDialog open={dialogOpen} onOpenChange={setDialogOpen} />

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
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm">{v.visit_number}</p>
                  {v.priority && v.priority !== 'Normal' && getPriorityIcon(v.priority)}
                </div>
                <p className="text-[11px] text-muted-foreground">{v.jobs?.job_title || 'Standalone visit'}</p>
                {v.customers && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                    <User className="h-2.5 w-2.5" /> {v.customers.first_name} {v.customers.last_name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted-foreground">{v.service_date}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground">{v.visit_type}</span>
                  {v.visit_photos?.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-primary">
                      <Camera className="h-3 w-3" />{v.visit_photos.length}
                    </span>
                  )}
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
              <TableHead>Customer</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Photos</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            : visits.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No visits found</TableCell></TableRow>
            : visits.map((v: any) => (
              <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/visits/${v.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Link to={`/visits/${v.id}`} className="block font-medium mono text-sm">{v.visit_number}</Link>
                    {v.priority && v.priority !== 'Normal' && (
                      <Badge variant={v.priority === 'Urgent' ? 'destructive' : 'default'} className="text-[10px] px-1.5 py-0">
                        {v.priority}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {v.jobs ? <Link to={`/jobs/${v.jobs.id || ''}`} className="text-primary hover:underline">{v.jobs.job_number}</Link> : <span className="text-muted-foreground/50">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {v.customers ? `${v.customers.first_name} ${v.customers.last_name}` : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.properties ? <Link to={`/properties/${v.properties.id}`} className="text-primary hover:underline">{v.properties.property_name}</Link> : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.service_date ? format(new Date(v.service_date), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell className="text-sm">{v.visit_type}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {v.assigned_worker_id ? (
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> Assigned</span>
                  ) : <span className="text-muted-foreground/40">—</span>}
                </TableCell>
                <TableCell>
                  {v.visit_photos?.length > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Camera className="h-3.5 w-3.5" /> {v.visit_photos.length}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell><StatusBadge status={v.visit_status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
