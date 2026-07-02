import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  useAssignableSubcontractors,
  useAssignableWorkers,
  useCreateWorkOrder,
  useAssignWorkOrder,
  AssigneeType,
} from '@/hooks/usePMWorkOrders';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  requestId: string;
  existingWorkOrderId?: string | null;
  defaultAccessNotes?: string | null;
  mode?: 'create' | 'assign';
  initial?: {
    assignee_type?: AssigneeType;
    assigned_worker_id?: string | null;
    assigned_subcontractor_id?: string | null;
    share_tenant_contact?: boolean;
  };
}

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
  requestId,
  existingWorkOrderId,
  defaultAccessNotes,
  mode = 'create',
  initial,
}: Props) {
  const workers = useAssignableWorkers();
  const subs = useAssignableSubcontractors();
  const create = useCreateWorkOrder();
  const assign = useAssignWorkOrder();

  const [assigneeType, setAssigneeType] = useState<AssigneeType>(
    initial?.assignee_type ?? 'unassigned'
  );
  const [workerId, setWorkerId] = useState<string>(initial?.assigned_worker_id ?? '');
  const [subId, setSubId] = useState<string>(initial?.assigned_subcontractor_id ?? '');
  const [share, setShare] = useState<boolean>(!!initial?.share_tenant_contact);
  const [accessNotes, setAccessNotes] = useState<string>(defaultAccessNotes ?? '');

  const busy = create.isPending || assign.isPending;

  const submit = async () => {
    try {
      if (mode === 'assign' && existingWorkOrderId) {
        await assign.mutateAsync({
          work_order_id: existingWorkOrderId,
          assignee_type: assigneeType,
          assigned_worker_id: assigneeType === 'worker' ? workerId || null : null,
          assigned_subcontractor_id:
            assigneeType === 'subcontractor' ? subId || null : null,
          share_tenant_contact: share,
        });
        toast.success('Work order assigned');
      } else {
        await create.mutateAsync({
          request_id: requestId,
          assignee_type: assigneeType,
          assigned_worker_id: assigneeType === 'worker' ? workerId || null : null,
          assigned_subcontractor_id:
            assigneeType === 'subcontractor' ? subId || null : null,
          share_tenant_contact: share,
          access_notes: accessNotes || null,
        });
        toast.success('Work order created');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'assign' ? 'Assign Work Order' : 'Create Work Order'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Assign to</Label>
            <Select value={assigneeType} onValueChange={(v) => setAssigneeType(v as AssigneeType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Keep unassigned (assign later)</SelectItem>
                <SelectItem value="worker">Worker (internal team)</SelectItem>
                <SelectItem value="subcontractor">Subcontractor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assigneeType === 'worker' && (
            <div>
              <Label>Worker</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                <SelectContent>
                  {(workers.data ?? []).map((w: any) => (
                    <SelectItem key={w.user_id} value={w.user_id}>
                      {w.full_name || w.display_name || 'Unnamed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {assigneeType === 'subcontractor' && (
            <div>
              <Label>Subcontractor</Label>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger><SelectValue placeholder="Select subcontractor" /></SelectTrigger>
                <SelectContent>
                  {(subs.data ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.company_name || s.contact_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === 'create' && (
            <div>
              <Label>Access / on-site notes for assignee (optional)</Label>
              <Textarea
                rows={2}
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                placeholder="Gate code, building entry, best time, etc."
              />
            </div>
          )}

          {assigneeType !== 'unassigned' && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={share}
                onCheckedChange={(v) => setShare(!!v)}
                className="mt-0.5"
              />
              <span>Share tenant contact info (phone/email) with the assignee</span>
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-emerald-700 hover:bg-emerald-800">
            {busy ? 'Saving…' : mode === 'assign' ? 'Save Assignment' : 'Create Work Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
