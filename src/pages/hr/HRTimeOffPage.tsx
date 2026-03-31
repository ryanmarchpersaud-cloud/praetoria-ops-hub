import { Link } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllTimeOffRequests } from '@/hooks/useHRData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const statusBadge: Record<string, { variant: any; label: string }> = {
  pending: { variant: 'secondary', label: 'Pending' },
  approved: { variant: 'default', label: 'Approved' },
  denied: { variant: 'destructive', label: 'Denied' },
};

export default function HRTimeOffPage() {
  const { data: employees = [] } = useEmployees();
  const { data: requests = [] } = useAllTimeOffRequests();

  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const denied = requests.filter(r => r.status === 'denied');

  const getEmpName = (userId: string) => employees.find(e => e.user_id === userId)?.full_name || 'Unknown';

  const RequestTable = ({ items }: { items: typeof requests }) => (
    <Card>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No requests in this category.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(r => {
                const badge = statusBadge[r.status] || statusBadge.pending;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to={`/employees/${r.user_id}`} className="text-sm font-medium text-primary hover:underline">
                        {getEmpName(r.user_id)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{r.request_type?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{r.days_requested}d</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.reason || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Time Off & Leave</h1>
        <p className="text-sm text-muted-foreground">Review and manage employee leave requests</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={pending.length > 0 ? 'border-amber-500/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{pending.length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{approved.length}</p><p className="text-xs text-muted-foreground">Approved</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div><p className="text-2xl font-bold text-foreground">{denied.length}</p><p className="text-xs text-muted-foreground">Denied</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="denied">Denied ({denied.length})</TabsTrigger>
          <TabsTrigger value="all">All ({requests.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4"><RequestTable items={pending} /></TabsContent>
        <TabsContent value="approved" className="mt-4"><RequestTable items={approved} /></TabsContent>
        <TabsContent value="denied" className="mt-4"><RequestTable items={denied} /></TabsContent>
        <TabsContent value="all" className="mt-4"><RequestTable items={requests} /></TabsContent>
      </Tabs>
    </div>
  );
}
