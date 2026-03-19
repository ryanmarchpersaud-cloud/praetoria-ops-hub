import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from '@/components/SettingsLayout';
import { useActivities } from '@/hooks/useActivities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { Search, Filter, Activity, Shield, FileText, AlertTriangle, Eye } from 'lucide-react';

const recordTypes = ['lead', 'quote', 'customer', 'property', 'job', 'visit', 'invoice', 'request'];
const statusOptions = ['completed', 'failed', 'pending'];

const getRecordLink = (type: string | null, id: string | null) => {
  if (!type || !id) return null;
  const map: Record<string, string> = {
    lead: '/leads/', quote: '/quotes/', customer: '/customers/', property: '/properties/',
    job: '/jobs/', visit: '/visits/', invoice: '/invoices/', request: '/requests/',
  };
  const prefix = map[type.toLowerCase()];
  return prefix ? `${prefix}${id}` : null;
};

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailEntry, setDetailEntry] = useState<any>(null);
  const { data: activities = [], isLoading } = useActivities({ record_type: typeFilter || undefined });

  const filtered = useMemo(() => {
    return activities.filter((a: any) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [a.action_name, a.workflow_name, a.record_type, a.record_id, a.error_message].filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      if (dateFrom) {
        const from = startOfDay(new Date(dateFrom));
        if (isBefore(new Date(a.created_at), from)) return false;
      }
      if (dateTo) {
        const to = endOfDay(new Date(dateTo));
        if (isAfter(new Date(a.created_at), to)) return false;
      }
      return true;
    });
  }, [activities, statusFilter, searchQuery, dateFrom, dateTo]);

  const totalCount = filtered.length;
  const failedCount = filtered.filter((a: any) => a.status === 'failed').length;
  const approvalPending = filtered.filter((a: any) => a.needs_approval && !a.approved_by).length;

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Complete history of system actions and workflow events for accountability and troubleshooting.</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="pt-4 flex items-center gap-3"><Activity className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{totalCount}</p><p className="text-xs text-muted-foreground">Events Shown</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{failedCount}</p><p className="text-xs text-muted-foreground">Failed</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><Shield className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{approvalPending}</p><p className="text-xs text-muted-foreground">Pending Approval</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><FileText className="h-8 w-8 text-muted-foreground" /><div><p className="text-2xl font-bold">{recordTypes.length}</p><p className="text-xs text-muted-foreground">Record Types</p></div></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search actions, workflows, records…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Record Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {recordTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" placeholder="From" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" placeholder="To" />
          {(searchQuery || statusFilter || dateFrom || dateTo || typeFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setTypeFilter(''); }}>Clear</Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Workflow</TableHead>
                <TableHead>Record</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Approval</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No matching events found.</TableCell></TableRow>
              ) : (
                filtered.map((a: any) => {
                  const link = getRecordLink(a.record_type, a.record_id);
                  return (
                    <TableRow key={a.id} className={link ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={() => link && navigate(link)}>
                      <TableCell className="whitespace-nowrap text-xs">
                        <span title={format(new Date(a.created_at), 'PPpp')}>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{a.action_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{a.workflow_name ?? '—'}</TableCell>
                      <TableCell>
                        {a.record_type ? <Badge variant="outline" className="capitalize">{a.record_type}</Badge> : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={a.status === 'completed' ? 'default' : a.status === 'failed' ? 'destructive' : 'secondary'}>{a.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {a.needs_approval ? <Badge variant={a.approved_by ? 'default' : 'secondary'}>{a.approved_by ? 'Approved' : 'Pending'}</Badge> : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setDetailEntry(a); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Detail dialog */}
        <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Audit Entry Detail</DialogTitle></DialogHeader>
            {detailEntry && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Action:</span> <span className="font-medium">{detailEntry.action_name}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={detailEntry.status === 'completed' ? 'default' : 'destructive'} className="ml-1">{detailEntry.status}</Badge></div>
                  <div><span className="text-muted-foreground">Workflow:</span> {detailEntry.workflow_name || '—'}</div>
                  <div><span className="text-muted-foreground">Record Type:</span> {detailEntry.record_type || '—'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Record ID:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{detailEntry.record_id || '—'}</code></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Timestamp:</span> {format(new Date(detailEntry.created_at), 'PPpp')}</div>
                </div>
                {detailEntry.error_message && (
                  <div className="bg-destructive/10 text-destructive rounded p-2 text-xs"><strong>Error:</strong> {detailEntry.error_message}</div>
                )}
                {detailEntry.payload_summary && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Payload Summary</p>
                    <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40 font-mono">{JSON.stringify(detailEntry.payload_summary, null, 2)}</pre>
                  </div>
                )}
                {detailEntry.needs_approval && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Approval:</span>
                    <Badge variant={detailEntry.approved_by ? 'default' : 'secondary'}>{detailEntry.approved_by ? 'Approved' : 'Pending Approval'}</Badge>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SettingsLayout>
  );
}
