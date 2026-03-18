import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from '@/components/SettingsLayout';
import { useActivities } from '@/hooks/useActivities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';

const recordTypes = ['lead', 'quote', 'customer', 'property', 'job', 'visit', 'invoice', 'request'];

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
  const { data: activities = [], isLoading } = useActivities({ record_type: typeFilter || undefined });

  return (
    <SettingsLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Complete history of system actions and workflow events.</p>
        </div>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Record Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Record Types</SelectItem>
              {recordTypes.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Workflow</TableHead>
                <TableHead>Record Type</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Approval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : activities.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No activity recorded yet.</TableCell></TableRow>
              ) : (
                activities.map((a: any) => {
                  const link = getRecordLink(a.record_type, a.record_id);
                  return (
                    <TableRow
                      key={a.id}
                      className={link ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => link && navigate(link)}
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        <span title={format(new Date(a.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{a.action_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{a.workflow_name ?? '—'}</TableCell>
                      <TableCell>
                        {a.record_type ? (
                          <Badge variant="outline" className="capitalize">{a.record_type}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={a.status === 'completed' ? 'default' : a.status === 'failed' ? 'destructive' : 'secondary'}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {a.needs_approval ? (
                          <Badge variant={a.approved_by ? 'default' : 'secondary'}>
                            {a.approved_by ? 'Approved' : 'Pending'}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </SettingsLayout>
  );
}
