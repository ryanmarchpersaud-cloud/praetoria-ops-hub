import { useState } from 'react';
import { useVisits } from '@/hooks/useVisits';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, ChevronRight, Cloud, Camera, User, AlertTriangle, Receipt } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { VISIT_STATUSES } from '@/lib/constants';
import { format } from 'date-fns';
import CreateVisitDialog from '@/components/CreateVisitDialog';
import { useActionPermissions } from '@/hooks/useActionPermissions';
import { BulkInvoiceDialog } from '@/components/BulkInvoiceDialog';

export default function Visits() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkInvoiceOpen, setBulkInvoiceOpen] = useState(false);

  const { data: visits = [], isLoading } = useVisits({ visit_status: statusFilter || undefined, search: search || undefined });

  const getPriorityIcon = (p: string) => {
    if (p === 'Urgent' || p === 'High') return <AlertTriangle className="h-3 w-3 text-destructive" />;
    return null;
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === visits.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visits.map((v: any) => v.id)));
    }
  };

  const selectedVisits = visits.filter((v: any) => selected.has(v.id));
  const hasSelection = selected.size > 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Visits</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{visits.length} total</p>
        </div>
        <div className="flex gap-2">
          {hasSelection && (
            <Button size="sm" variant="outline" onClick={() => setBulkInvoiceOpen(true)} className="gap-1.5">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Invoice</span> ({selected.size})
            </Button>
          )}
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">Schedule </span>Visit
          </Button>
        </div>
      </div>

      <CreateVisitDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <BulkInvoiceDialog open={bulkInvoiceOpen} onOpenChange={(v) => { setBulkInvoiceOpen(v); if (!v) setSelected(new Set()); }} selectedVisits={selectedVisits} />

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
          <div key={v.id} className="bg-card border rounded-lg p-3 transition-colors">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={selected.has(v.id)}
                onCheckedChange={() => toggleSelect(v.id)}
                className="mt-1 shrink-0"
              />
              <Link to={`/visits/${v.id}`} className="flex-1 min-w-0 active:bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm">{v.visit_number}</p>
                      {v.priority && v.priority !== 'Normal' && getPriorityIcon(v.priority)}
                      {(v as any).billing_status === 'invoiced' && <Badge variant="secondary" className="text-[9px] px-1">Invoiced</Badge>}
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
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={visits.length > 0 && selected.size === visits.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Visit</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Photos</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            : visits.length === 0 ? <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No visits found</TableCell></TableRow>
            : visits.map((v: any) => (
              <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell onClick={e => e.stopPropagation()}>
                  <Checkbox checked={selected.has(v.id)} onCheckedChange={() => toggleSelect(v.id)} />
                </TableCell>
                <TableCell onClick={() => navigate(`/visits/${v.id}`)}>
                  <div className="flex items-center gap-1.5">
                    <Link to={`/visits/${v.id}`} className="block font-medium mono text-sm">{v.visit_number}</Link>
                    {v.priority && v.priority !== 'Normal' && (
                      <Badge variant={v.priority === 'Urgent' ? 'destructive' : 'default'} className="text-[10px] px-1.5 py-0">
                        {v.priority}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm" onClick={() => navigate(`/visits/${v.id}`)}>
                  {v.jobs ? <Link to={`/jobs/${v.jobs.id || ''}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>{v.jobs.job_number}</Link> : <span className="text-muted-foreground/50">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground" onClick={() => navigate(`/visits/${v.id}`)}>
                  {v.customers ? `${v.customers.first_name} ${v.customers.last_name}` : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground" onClick={() => navigate(`/visits/${v.id}`)}>{v.properties ? <Link to={`/properties/${v.properties.id}`} className="text-primary hover:underline" onClick={e => e.stopPropagation()}>{v.properties.property_name}</Link> : '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground" onClick={() => navigate(`/visits/${v.id}`)}>{v.service_date ? format(new Date(v.service_date), 'MMM d, yyyy') : '—'}</TableCell>
                <TableCell className="text-sm" onClick={() => navigate(`/visits/${v.id}`)}>{v.visit_type}</TableCell>
                <TableCell onClick={() => navigate(`/visits/${v.id}`)}>
                  {(v as any).billing_status === 'invoiced' ? (
                    <Badge variant="secondary" className="text-[10px]">Invoiced</Badge>
                  ) : v.visit_status === 'Completed' ? (
                    <Badge variant="outline" className="text-[10px] text-accent border-accent">Billable</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/visits/${v.id}`)}>
                  {v.visit_photos?.length > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Camera className="h-3.5 w-3.5" /> {v.visit_photos.length}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/visits/${v.id}`)}><StatusBadge status={v.visit_status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
