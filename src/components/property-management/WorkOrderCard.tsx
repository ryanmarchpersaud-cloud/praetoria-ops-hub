import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateWorkOrderDialog } from './CreateWorkOrderDialog';
import { useAssignableSubcontractors, useAssignableWorkers } from '@/hooks/usePMWorkOrders';

export function WorkOrderCard({ wo, requestId }: { wo: any; requestId: string }) {
  const [openAssign, setOpenAssign] = useState(false);
  const workers = useAssignableWorkers();
  const subs = useAssignableSubcontractors();

  const workerName =
    wo.assigned_worker_id &&
    (workers.data ?? []).find((w: any) => w.user_id === wo.assigned_worker_id);
  const subName =
    wo.assigned_subcontractor_id &&
    (subs.data ?? []).find((s: any) => s.id === wo.assigned_subcontractor_id);

  return (
    <Card className="border-emerald-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">
            Work Order{' '}
            <Link
              to={`/property-management/work-orders/${wo.id}`}
              className="text-emerald-700 hover:underline"
            >
              {wo.work_order_number}
            </Link>
          </CardTitle>
          <Badge variant="outline" className="capitalize">{wo.status.replace('_', ' ')}</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Assignee</p>
            <p className="font-medium capitalize">
              {wo.assignee_type === 'unassigned'
                ? 'Unassigned'
                : wo.assignee_type === 'worker'
                ? workerName
                  ? (workerName as any).full_name || (workerName as any).display_name
                  : 'Worker'
                : subName
                ? (subName as any).company_name
                : 'Subcontractor'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tenant contact shared?</p>
            <p className="font-medium">{wo.share_tenant_contact ? 'Yes' : 'No'}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => setOpenAssign(true)}>
            Assign / Reassign
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/property-management/work-orders/${wo.id}`}>Open Work Order</Link>
          </Button>
        </div>
      </CardContent>

      <CreateWorkOrderDialog
        open={openAssign}
        onOpenChange={setOpenAssign}
        requestId={requestId}
        existingWorkOrderId={wo.id}
        mode="assign"
        initial={{
          assignee_type: wo.assignee_type,
          assigned_worker_id: wo.assigned_worker_id,
          assigned_subcontractor_id: wo.assigned_subcontractor_id,
          share_tenant_contact: wo.share_tenant_contact,
        }}
      />
    </Card>
  );
}
