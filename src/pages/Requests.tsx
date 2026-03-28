import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquarePlus, ChevronRight, Search, Inbox, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { CreateRequestDialog } from '@/components/CreateRequestDialog';
import { useActionPermissions } from '@/hooks/useActionPermissions';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled'];

export default function Requests() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(searchParams.get('new') === '1');
  const defaultCustomerId = searchParams.get('customer_id') || undefined;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['service_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_requests')
        .select('*, customers(first_name, last_name, company_name), properties(property_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = requests.filter((r: any) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const name = `${r.customers?.first_name || ''} ${r.customers?.last_name || ''}`.toLowerCase();
      const prop = (r.properties?.property_name || '').toLowerCase();
      const subj = (r.subject || '').toLowerCase();
      if (!name.includes(s) && !prop.includes(s) && !subj.includes(s)) return false;
    }
    return true;
  });

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = requests.filter((r: any) => r.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Service Requests</h1>
          <p className="text-xs md:text-sm text-muted-foreground">{requests.length} total</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      <CreateRequestDialog open={createOpen} onOpenChange={setCreateOpen} defaultCustomerId={defaultCustomerId} />

      {/* Status chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`
              shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all active:scale-95
              ${statusFilter === s ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground'}
            `}
          >
            {s}
            <span className={statusFilter === s ? 'text-primary' : 'text-muted-foreground/60'}>{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
      </div>

      {statusFilter && (
        <button onClick={() => setStatusFilter('')} className="text-xs text-muted-foreground hover:text-foreground">
          Clear filter ×
        </button>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No requests found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((req: any) => (
            <Link key={req.id} to={`/requests/${req.id}`} className="block">
              <Card className="active:shadow-sm transition-shadow hover:bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{req.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.customers?.first_name} {req.customers?.last_name}
                        {req.properties?.property_name && ` · ${req.properties.property_name}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <StatusBadge status={req.status} showIcon={false} />
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{req.urgency}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="py-8">
                <div className="flex justify-center"><Skeleton className="h-4 w-32" /></div>
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Inbox className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
                  <p className="text-sm text-muted-foreground">No requests found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req: any) => (
                <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/requests/${req.id}`)}>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{req.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{req.customers?.first_name} {req.customers?.last_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{req.properties?.property_name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground capitalize">{req.service_type}</TableCell>
                  <TableCell className="text-sm capitalize">{req.urgency}</TableCell>
                  <TableCell><StatusBadge status={req.status} showIcon={false} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
