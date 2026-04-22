import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from '@/components/SettingsLayout';
import { useActivities } from '@/hooks/useActivities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { Search, Activity, Shield, FileText, AlertTriangle, Eye, ShieldCheck } from 'lucide-react';

const recordTypes = ['lead', 'quote', 'customer', 'property', 'job', 'visit', 'invoice', 'request'];
const statusOptions = ['completed', 'failed', 'pending'];

const AUDIT_ACTION_GROUPS = [
  'auth.login', 'auth.logout', 'auth.password_changed', 'auth.password_reset_requested',
  'pay_stub.view', 'payroll.export',
  'invoice.view', 'invoice.print', 'payment.refund', 'payment.record',
  'document.signed_url_generated', 'document.download',
  'admin.user.password_reset', 'admin.user.temp_password_set', 'admin.user.ban',
  'role.grant', 'role.revoke', 'permission.grant', 'permission.revoke',
];

const getRecordLink = (type: string | null, id: string | null) => {
  if (!type || !id) return null;
  const map: Record<string, string> = {
    lead: '/leads/', quote: '/quotes/', customer: '/customers/', property: '/properties/',
    job: '/jobs/', visit: '/visits/', invoice: '/invoices/', request: '/requests/',
  };
  const prefix = map[type.toLowerCase()];
  return prefix ? `${prefix}${id}` : null;
};

interface AuditEntry {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  customer_id: string | null;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  before_data: any;
  after_data: any;
  metadata: any;
}

function useAuditLogEntries(filters: { action?: string; from?: string; to?: string; search?: string }) {
  return useQuery<AuditEntry[]>({
    queryKey: ['audit_log', filters],
    queryFn: async () => {
      let q = supabase
        .from('audit_log' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (filters.action) q = q.eq('action', filters.action);
      if (filters.from) q = q.gte('created_at', startOfDay(new Date(filters.from)).toISOString());
      if (filters.to) q = q.lte('created_at', endOfDay(new Date(filters.to)).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as AuditEntry[];
      if (!filters.search) return rows;
      const s = filters.search.toLowerCase();
      return rows.filter((r) => {
        const hay = [r.action, r.actor_email, r.actor_role, r.target_type, r.target_id, JSON.stringify(r.metadata ?? {})]
          .filter(Boolean).join(' ').toLowerCase();
        return hay.includes(s);
      });
    },
    staleTime: 30 * 1000,
  });
}

function exportToCsv(rows: AuditEntry[]) {
  const headers = ['timestamp', 'action', 'actor_email', 'actor_role', 'target_type', 'target_id', 'success', 'ip_address', 'user_agent', 'metadata'];
  const escape = (v: any) => {
    if (v == null) return '';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.join(',')].concat(
    rows.map((r) => [
      r.created_at, r.action, r.actor_email, r.actor_role,
      r.target_type, r.target_id, r.success, r.ip_address, r.user_agent, r.metadata,
    ].map(escape).join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'security' | 'workflow'>('security');

  // Security audit log filters
  const [auditAction, setAuditAction] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditDetail, setAuditDetail] = useState<AuditEntry | null>(null);
  const { data: auditEntries = [], isLoading: auditLoading } = useAuditLogEntries({
    action: auditAction || undefined,
    from: auditFrom || undefined,
    to: auditTo || undefined,
    search: auditSearch || undefined,
  });

  // Workflow activities (existing)
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

  const securityFailed = auditEntries.filter((e) => !e.success).length;
  const totalCount = filtered.length;
  const failedCount = filtered.filter((a: any) => a.status === 'failed').length;
  const approvalPending = filtered.filter((a: any) => a.needs_approval && !a.approved_by).length;

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Security-sensitive events (logins, role changes, payroll access, refunds, document downloads) and workflow history.
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'security' | 'workflow')}>
          <TabsList>
            <TabsTrigger value="security" className="gap-2">
              <ShieldCheck className="h-4 w-4" /> Security events
            </TabsTrigger>
            <TabsTrigger value="workflow" className="gap-2">
              <Activity className="h-4 w-4" /> Workflow activity
            </TabsTrigger>
          </TabsList>

          {/* ───────── Security audit log ───────── */}
          <TabsContent value="security" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardContent className="pt-4 flex items-center gap-3"><ShieldCheck className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{auditEntries.length}</p><p className="text-xs text-muted-foreground">Events Shown</p></div></CardContent></Card>
              <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{securityFailed}</p><p className="text-xs text-muted-foreground">Failed Attempts</p></div></CardContent></Card>
              <Card><CardContent className="pt-4 flex items-center gap-3"><Shield className="h-8 w-8 text-muted-foreground" /><div><p className="text-2xl font-bold">{AUDIT_ACTION_GROUPS.length}</p><p className="text-xs text-muted-foreground">Tracked Action Types</p></div></CardContent></Card>
            </div>

            <div className="flex flex-wrap gap-2 items-end">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search actor, action, target…" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={auditAction || 'all'} onValueChange={(v) => setAuditAction(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {AUDIT_ACTION_GROUPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} className="w-[150px]" />
              <Input type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} className="w-[150px]" />
              {(auditSearch || auditAction || auditFrom || auditTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setAuditSearch(''); setAuditAction(''); setAuditFrom(''); setAuditTo(''); }}>Clear</Button>
              )}
              <Button variant="outline" size="sm" onClick={() => exportToCsv(auditEntries)} disabled={auditEntries.length === 0}>
                Export CSV
              </Button>
            </div>

            <div className="rounded-lg border bg-card overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden md:table-cell">Target</TableHead>
                    <TableHead className="hidden md:table-cell">Result</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : auditEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No security events found.</TableCell></TableRow>
                  ) : (
                    auditEntries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          <span title={format(new Date(e.created_at), 'PPpp')}>{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</span>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{e.actor_email ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{e.actor_role ?? '—'}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.action}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">
                          {e.target_type ? `${e.target_type}:${(e.target_id ?? '').slice(0, 8)}` : '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={e.success ? 'default' : 'destructive'}>{e.success ? 'Success' : 'Failed'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAuditDetail(e)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ───────── Workflow activity (existing behavior preserved) ───────── */}
          <TabsContent value="workflow" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardContent className="pt-4 flex items-center gap-3"><Activity className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{totalCount}</p><p className="text-xs text-muted-foreground">Events Shown</p></div></CardContent></Card>
              <Card><CardContent className="pt-4 flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{failedCount}</p><p className="text-xs text-muted-foreground">Failed</p></div></CardContent></Card>
              <Card><CardContent className="pt-4 flex items-center gap-3"><Shield className="h-8 w-8 text-orange-500" /><div><p className="text-2xl font-bold">{approvalPending}</p><p className="text-xs text-muted-foreground">Pending Approval</p></div></CardContent></Card>
              <Card><CardContent className="pt-4 flex items-center gap-3"><FileText className="h-8 w-8 text-muted-foreground" /><div><p className="text-2xl font-bold">{recordTypes.length}</p><p className="text-xs text-muted-foreground">Record Types</p></div></CardContent></Card>
            </div>

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
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[150px]" />
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[150px]" />
              {(searchQuery || statusFilter || dateFrom || dateTo || typeFilter) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setTypeFilter(''); }}>Clear</Button>
              )}
            </div>

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
          </TabsContent>
        </Tabs>

        {/* Security audit detail dialog */}
        <Dialog open={!!auditDetail} onOpenChange={() => setAuditDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Security Event</DialogTitle></DialogHeader>
            {auditDetail && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Action:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{auditDetail.action}</code></div>
                  <div><span className="text-muted-foreground">Result:</span> <Badge variant={auditDetail.success ? 'default' : 'destructive'} className="ml-1">{auditDetail.success ? 'Success' : 'Failed'}</Badge></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Actor:</span> {auditDetail.actor_email ?? '—'} <span className="text-muted-foreground">({auditDetail.actor_role ?? 'unknown role'})</span></div>
                  <div><span className="text-muted-foreground">Target Type:</span> {auditDetail.target_type ?? '—'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Target ID:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{auditDetail.target_id ?? '—'}</code></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Timestamp:</span> {format(new Date(auditDetail.created_at), 'PPpp')}</div>
                  {auditDetail.ip_address && <div><span className="text-muted-foreground">IP:</span> {auditDetail.ip_address}</div>}
                  {auditDetail.user_agent && <div className="col-span-2 text-xs"><span className="text-muted-foreground">User Agent:</span> <span className="break-all">{auditDetail.user_agent}</span></div>}
                </div>
                {auditDetail.metadata && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Metadata</p>
                    <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40 font-mono">{JSON.stringify(auditDetail.metadata, null, 2)}</pre>
                  </div>
                )}
                {(auditDetail.before_data || auditDetail.after_data) && (
                  <div className="grid grid-cols-2 gap-2">
                    {auditDetail.before_data && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Before</p>
                        <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40 font-mono">{JSON.stringify(auditDetail.before_data, null, 2)}</pre>
                      </div>
                    )}
                    {auditDetail.after_data && (
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">After</p>
                        <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-40 font-mono">{JSON.stringify(auditDetail.after_data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Workflow detail dialog (preserved) */}
        <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Workflow Event</DialogTitle></DialogHeader>
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
