import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRequestActivity } from '@/hooks/usePMWorkOrders';

const EVENT_LABELS: Record<string, string> = {
  submitted: 'Request submitted',
  reviewed: 'Reviewed by admin',
  wo_created: 'Work order created',
  assigned: 'Assigned',
  status_changed: 'Status updated',
  note_added: 'Note added',
  completed: 'Marked completed',
  tenant_notified: 'Tenant notified',
};

export function ActivityTimeline({
  requestId,
  tenantOnly = false,
  title = 'Activity',
}: {
  requestId: string;
  tenantOnly?: boolean;
  title?: string;
}) {
  const { data } = useRequestActivity(requestId, tenantOnly);
  const events = data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="text-sm">
        {events.length === 0 ? (
          <p className="text-muted-foreground text-xs">No activity yet.</p>
        ) : (
          <ol className="space-y-2 border-l-2 border-emerald-200 pl-3">
            {events.map((e: any) => (
              <li key={e.id} className="text-xs">
                <p className="font-medium text-foreground">
                  {EVENT_LABELS[e.event] ?? e.event}
                  {e.detail?.status ? ` → ${e.detail.status}` : ''}
                </p>
                <p className="text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
