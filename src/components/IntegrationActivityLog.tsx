import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  created_at: string;
  provider: string;
  event_name: string;
  channel: string | null;
  status: string;
  recipient: string | null;
  record_type: string | null;
  record_id: string | null;
  provider_response_id: string | null;
  error_message: string | null;
  environment: string | null;
}

const providerColors: Record<string, string> = {
  resend: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  twilio: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  stripe: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  n8n: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const statusVariant: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  success: 'default',
  failed: 'destructive',
  queued: 'secondary',
};

export function IntegrationActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('integration_logs')
      .select('id, created_at, provider, event_name, channel, status, recipient, record_type, record_id, provider_response_id, error_message, environment')
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs((data as LogEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Recent Integration Activity</h2>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {logs.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground py-4 text-center">No integration activity yet. Run a test above to generate logs.</p>
      )}

      {logs.length > 0 && (
        <div className="border rounded-lg overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Provider</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead>Recipient / Ref</TableHead>
                <TableHead className="w-[60px]">Env</TableHead>
                <TableHead className="w-[140px]">Time</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${providerColors[log.provider] || 'bg-muted text-muted-foreground'}`}>
                      {log.provider}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{log.event_name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[log.status] || 'outline'} className="text-xs">
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate">
                    {log.recipient || log.record_id || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.environment || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                    {log.error_message || ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
