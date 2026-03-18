import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivities } from '@/hooks/useActivities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

export default function ActivityPage() {
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('');
  const { data: activities = [], isLoading } = useActivities({
    record_type: recordTypeFilter || undefined,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Agent Activity</h1>
        <p className="text-sm text-muted-foreground">Workflow and action history log</p>
      </div>

      <Select value={recordTypeFilter} onValueChange={v => setRecordTypeFilter(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="lead">Lead</SelectItem>
          <SelectItem value="quote">Quote</SelectItem>
          <SelectItem value="customer">Customer</SelectItem>
        </SelectContent>
      </Select>

      <div className="rounded-lg border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead className="hidden md:table-cell">Workflow</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Approval</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : activities.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No activity recorded</TableCell></TableRow>
            ) : (
              activities.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-sm">{a.action_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{a.workflow_name || '—'}</TableCell>
                  <TableCell className="text-sm">{a.record_type || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{a.status}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{a.needs_approval ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
