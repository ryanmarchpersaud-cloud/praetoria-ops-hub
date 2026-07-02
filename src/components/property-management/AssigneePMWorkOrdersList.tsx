import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMyAssignedPMWorkOrders } from '@/hooks/usePMWorkOrders';

interface Props { basePath: string; }

export function AssigneePMWorkOrdersList({ basePath }: Props) {
  const { data, isLoading } = useMyAssignedPMWorkOrders();
  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;
  const items = data ?? [];
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Property Management Work Orders</h1>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No assigned property-management work orders.</p>}
      {items.map((w: any) => (
        <Card key={w.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">
                <Link to={`${basePath}/${w.id}`} className="text-emerald-700 hover:underline">
                  {w.work_order_number} — {w.title}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-2">
                {w.is_urgent_safety && <Badge className="bg-red-600 text-white">URGENT</Badge>}
                <Badge variant="outline" className="capitalize">{w.status.replace('_', ' ')}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {(w.category ?? '').replace(/_/g, ' ')} · {w.issue_label ?? ''} · Priority {w.priority}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
