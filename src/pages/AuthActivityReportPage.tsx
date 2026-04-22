import { useEffect, useMemo, useState } from 'react';
import { SettingsLayout } from '@/components/SettingsLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, RefreshCw, Search, Mail, AlertTriangle, CheckCircle2, XCircle, Clock, Download,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Status = 'pending' | 'sent' | 'failed' | 'dlq' | 'suppressed' | 'bounced' | 'complained';

interface LogRow {
  message_id: string;
  template_name: string;
  recipient_email: string;
  status: Status;
  error_message: string | null;
  created_at: string;
}

const AUTH_TEMPLATES = ['recovery', 'signup', 'invite', 'magiclink', 'email_change', 'reauthentication'];

const TEMPLATE_LABELS: Record<string, string> = {
  recovery: 'Password reset',
  signup: 'Signup confirmation',
  invite: 'Invitation',
  magiclink: 'Magic link',
  email_change: 'Email change',
  reauthentication: 'Reauthentication',
};

const RANGES = [
  { value: '1h', label: 'Last hour', hours: 1 },
  { value: '24h', label: 'Last 24h', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { value: '30d', label: 'Last 30 days', hours: 24 * 30 },
];

function StatusBadge({ status }: { status: Status }) {
  const config: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
    pending: { label: 'Pending', variant: 'secondary', icon: Clock },
    sent: { label: 'Sent', variant: 'default', icon: CheckCircle2 },
    failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
    dlq: { label: 'Failed (DLQ)', variant: 'destructive', icon: XCircle },
    suppressed: { label: 'Suppressed', variant: 'outline', icon: AlertTriangle },
    bounced: { label: 'Bounced', variant: 'destructive', icon: XCircle },
    complained: { label: 'Complained', variant: 'destructive', icon: AlertTriangle },
  };
  const c = config[status] ?? config.pending;
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

export default function AuthActivityReportPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('24h');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const hours = RANGES.find((r) => r.value === range)?.hours ?? 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('email_send_log')
      .select('message_id, template_name, recipient_email, status, error_message, created_at')
      .in('template_name', AUTH_TEMPLATES)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      toast.error(`Failed to load: ${error.message}`);
      setRows([]);
    } else {
      const seen = new Set<string>();
      const deduped: LogRow[] = [];
      for (const r of (data ?? []) as LogRow[]) {
        const key = r.message_id ?? `${r.recipient_email}-${r.created_at}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(r);
      }
      setRows(deduped);
    }
    setLoading(false);
  }

  useEffect(() => { 
    load(); 
  }, [range]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (templateFilter !== 'all' && r.template_name !== templateFilter) return false;
      if (statusFilter !== 'all') {
        if (statusFilter === 'failed' && !['failed', 'dlq', 'bounced'].includes(r.status)) return false;
        if (statusFilter !== 'failed' && r.status !== statusFilter) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!r.recipient_email?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, templateFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const sent = filtered.filter((r) => r.status === 'sent').length;
    const failed = filtered.filter((r) => ['failed', 'dlq', 'bounced'].includes(r.status)).length;
    const pending = filtered.filter((r) => r.status === 'pending').length;
    const deliveryRate = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, failed, pending, deliveryRate };
  }, [filtered]);

  const templateOptions = useMemo(() => {
    const present = Array.from(new Set(rows.map((r) => r.template_name))).sort();
    return present;
  }, [rows]);

  function exportCsv() {
    const header = ['Timestamp', 'Event', 'Recipient', 'Status', 'Error', 'Message ID'];
    const lines = filtered.map((r) => [
      new Date(r.created_at).toISOString(),
      TEMPLATE_LABELS[r.template_name] ?? r.template_name,
      r.recipient_email,
      r.status,
      (r.error_message ?? '').replace(/"/g, '""'),
      r.message_id,
    ].map((v) => `"${v ?? ''}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Auth Activity Report</h1>
            <p className="text-muted-foreground">
              Live audit log of password resets, signups, and other auth emails — diagnose delivery issues fast.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Delivered</p>
              <p className="text-2xl font-bold mt-1 text-primary">{stats.sent}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Failed</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{stats.failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending</p>
              <p className="text-2xl font-bold mt-1">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Delivery rate</p>
              <p className="text-2xl font-bold mt-1">{stats.deliveryRate}%</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>One row per email (deduplicated by message ID, latest status)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger><SelectValue placeholder="Event type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All event types</SelectItem>
                  {templateOptions.map((t) => (
                    <SelectItem key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed / Bounced</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suppressed">Suppressed</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipient…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No auth events match the current filters.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 200).map((r) => (
                      <TableRow key={r.message_id ?? `${r.recipient_email}-${r.created_at}`}>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {TEMPLATE_LABELS[r.template_name] ?? r.template_name}
                        </TableCell>
                        <TableCell className="text-sm">{r.recipient_email}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                          {r.error_message || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filtered.length > 200 && (
                  <div className="text-xs text-muted-foreground p-3 border-t">
                    Showing first 200 of {filtered.length} events. Export CSV for full list.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
