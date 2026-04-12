import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useAllTimeOffRequests } from '@/hooks/useHRData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const statusBadge: Record<string, { variant: any; label: string }> = {
  pending: { variant: 'secondary', label: 'Pending' },
  approved: { variant: 'default', label: 'Approved' },
  denied: { variant: 'destructive', label: 'Denied' },
};

function useUpdateTimeOffStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, adminNotes, payStatus }: { id: string; status: 'approved' | 'denied'; adminNotes?: string; payStatus?: string }) => {
      const updates: Record<string, any> = {
        status,
        approved_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      };
      if (status === 'approved' && payStatus) {
        updates.pay_status = payStatus;
      }
      const { error } = await supabase
        .from('employee_time_off_requests')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all_time_off_requests'] });
    },
  });
}

export default function HRTimeOffPage() {
  const { data: employees = [] } = useEmployees();
  const { data: requests = [] } = useAllTimeOffRequests();
  const { toast } = useToast();
  const updateStatus = useUpdateTimeOffStatus();

  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const denied = requests.filter(r => r.status === 'denied');

  const getEmpName = (userId: string) => employees.find(e => e.user_id === userId)?.full_name || 'Unknown';

  const [approvalDialog, setApprovalDialog] = useState<{ id: string; action: 'approved' | 'denied'; empName: string } | null>(null);
  const [payStatus, setPayStatus] = useState<string>('paid');
  const [adminNotes, setAdminNotes] = useState('');

  const handleOpenApproval = (id: string, action: 'approved' | 'denied', empName: string) => {
    setPayStatus('paid');
    setAdminNotes('');
    setApprovalDialog({ id, action, empName });
  };

  const handleConfirmAction = () => {
    if (!approvalDialog) return;
    updateStatus.mutate(
      { id: approvalDialog.id, status: approvalDialog.action, adminNotes: adminNotes.trim() || undefined, payStatus: approvalDialog.action === 'approved' ? payStatus : undefined },
      {
        onSuccess: () => {
          toast({ title: `Request ${approvalDialog.action}` });
          setApprovalDialog(null);
        },
        onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
      }
    );
  };

  const RequestTable = ({ items, showActions, showPayStatus }: { items: typeof requests; showActions?: boolean; showPayStatus?: boolean }) => (
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
                {showPayStatus && <TableHead>Pay Status</TableHead>}
                <TableHead>Status</TableHead>
                {showActions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(r => {
                const badge = statusBadge[r.status] || statusBadge.pending;
                const empName = getEmpName(r.user_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link to={`/employees/${r.user_id}`} className="text-sm font-medium text-primary hover:underline">
                        {empName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{r.request_type?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {format(new Date(r.start_date), 'MMM d')} – {format(new Date(r.end_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">{r.days_requested}d</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.reason || '—'}</TableCell>
                    {showPayStatus && (
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] capitalize ${(r as any).pay_status === 'unpaid' ? 'border-amber-300 text-amber-700' : 'border-emerald-300 text-emerald-700'}`}>
                          {(r as any).pay_status || 'paid'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                    </TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex gap-1.5 justify-end">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            disabled={updateStatus.isPending}
                            onClick={() => handleOpenApproval(r.id, 'approved', empName)}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs gap-1"
                            disabled={updateStatus.isPending}
                            onClick={() => handleOpenApproval(r.id, 'denied', empName)}
                          >
                            <XCircle className="h-3 w-3" /> Deny
                          </Button>
                        </div>
                      </TableCell>
                    )}
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
            <div><p className="text-2xl font-bold text-foreground tabular-nums">{pending.length}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div><p className="text-2xl font-bold text-foreground tabular-nums">{approved.length}</p><p className="text-xs text-muted-foreground">Approved</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div><p className="text-2xl font-bold text-foreground tabular-nums">{denied.length}</p><p className="text-xs text-muted-foreground">Denied</p></div>
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
        <TabsContent value="pending" className="mt-4"><RequestTable items={pending} showActions /></TabsContent>
        <TabsContent value="approved" className="mt-4"><RequestTable items={approved} showPayStatus /></TabsContent>
        <TabsContent value="denied" className="mt-4"><RequestTable items={denied} /></TabsContent>
        <TabsContent value="all" className="mt-4"><RequestTable items={requests} showPayStatus /></TabsContent>
      </Tabs>

      {/* Approval / Deny Dialog */}
      <Dialog open={!!approvalDialog} onOpenChange={() => setApprovalDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {approvalDialog?.action === 'approved' ? 'Approve' : 'Deny'} Time Off
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {approvalDialog?.action === 'approved'
              ? `Approve time off for ${approvalDialog?.empName}?`
              : `Deny time off for ${approvalDialog?.empName}?`}
          </p>
          <div className="space-y-3">
            {approvalDialog?.action === 'approved' && (
              <div>
                <Label>Pay Status</Label>
                <Select value={payStatus} onValueChange={setPayStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">With Pay</SelectItem>
                    <SelectItem value="unpaid">Without Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Admin Notes (optional)</Label>
              <Textarea placeholder="Add a note…" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancel</Button>
            <Button
              variant={approvalDialog?.action === 'approved' ? 'default' : 'destructive'}
              onClick={handleConfirmAction}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Saving…' : approvalDialog?.action === 'approved' ? 'Approve' : 'Deny'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
