import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useEmployeeTimesheets, useApproveTimesheet, useRejectTimesheet } from '@/hooks/useTimesheets';
import { Check, X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';

type Props = { userId: string };

export function EmployeeTimesheetsTab({ userId }: Props) {
  const [from, setFrom] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: entries = [], isLoading } = useEmployeeTimesheets(userId, {
    from: `${from}T00:00:00`,
    to: `${to}T23:59:59`,
  });
  const approveMut = useApproveTimesheet();
  const rejectMut = useRejectTimesheet();

  const totals = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0, totalHrs = 0, approvedHrs = 0;
    for (const e of entries as any[]) {
      const hrs = e.clock_out
        ? (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3_600_000
        : 0;
      totalHrs += hrs;
      if (e.status === 'approved') { approved++; approvedHrs += hrs; }
      else if (e.status === 'rejected') rejected++;
      else pending++;
    }
    return { pending, approved, rejected, totalHrs, approvedHrs };
  }, [entries]);

  const handleApprove = (id: string) => {
    approveMut.mutate(id, {
      onSuccess: () => toast.success('Timesheet approved'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const submitReject = () => {
    if (!rejectFor) return;
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }
    rejectMut.mutate({ id: rejectFor, reason: reason.trim() }, {
      onSuccess: () => {
        toast.success('Timesheet rejected');
        setRejectFor(null);
        setReason('');
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <div className="text-[11px] uppercase font-semibold text-muted-foreground">Total Hours</div>
          <div className="text-2xl font-bold">{totals.totalHrs.toFixed(1)}h</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-[11px] uppercase font-semibold text-emerald-600">Approved</div>
          <div className="text-2xl font-bold">{totals.approvedHrs.toFixed(1)}h</div>
          <div className="text-[11px] text-muted-foreground">{totals.approved} entries</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-[11px] uppercase font-semibold text-amber-600">Pending</div>
          <div className="text-2xl font-bold">{totals.pending}</div>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <div className="text-[11px] uppercase font-semibold text-destructive">Rejected</div>
          <div className="text-2xl font-bold">{totals.rejected}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-end justify-between flex-wrap gap-3">
          <CardTitle className="text-base">Timesheet Entries</CardTitle>
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-[11px] text-muted-foreground block">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
          ) : !entries.length ? (
            <div className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
              No timesheets in this range
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(entries as any[]).map((e) => {
                    const hrs = e.clock_out
                      ? (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / 3_600_000
                      : null;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{format(new Date(e.clock_in), 'EEE MMM d')}</TableCell>
                        <TableCell className="font-mono text-xs">{format(new Date(e.clock_in), 'HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {e.clock_out ? format(new Date(e.clock_out), 'HH:mm') : <Badge variant="outline">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {hrs !== null ? `${hrs.toFixed(2)}h` : '—'}
                        </TableCell>
                        <TableCell>
                          {e.status === 'approved' && (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
                          )}
                          {e.status === 'rejected' && (
                            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
                          )}
                          {(!e.status || e.status === 'pending') && (
                            <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                          )}
                          {e.rejection_reason && (
                            <div className="text-[11px] text-destructive mt-1 max-w-[200px] truncate" title={e.rejection_reason}>
                              {e.rejection_reason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {e.clock_out && e.status !== 'approved' && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleApprove(e.id)}
                                disabled={approveMut.isPending}>
                                <Check className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              {e.status !== 'rejected' && (
                                <Button size="sm" variant="ghost" onClick={() => setRejectFor(e.id)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectFor} onOpenChange={(o) => { if (!o) { setRejectFor(null); setReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Timesheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Forgot to clock out, hours need correction..." />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRejectFor(null); setReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={rejectMut.isPending}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
