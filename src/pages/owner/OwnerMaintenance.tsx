import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOwnerMaintenanceRequests, useOwnerWorkOrders } from '@/hooks/useOwnerPortal';
import { formatStatusLabel } from '@/lib/statusLabel';

export default function OwnerMaintenance() {
  const { data: requests = [], isLoading } = useOwnerMaintenanceRequests();
  const { data: workOrders = [] } = useOwnerWorkOrders();

  return (
    <OwnerLayout>
      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Maintenance activity</h2>
          <p className="text-xs text-muted-foreground">
            Read-only view of maintenance requests and work orders your property manager has chosen to share. All scheduling and dispatch is handled by Praetoria Group.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Requests ({requests.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shared maintenance requests yet.</p>
            ) : (
              requests.map((r: any) => (
                <div key={r.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{r.title || r.category}</p>
                    <Badge variant="outline">{formatStatusLabel(r.status)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.property?.property_name}{r.unit?.unit_label ? ` · ${r.unit.unit_label}` : ''} · Opened {new Date(r.created_at).toLocaleDateString()}
                  </p>
                  {r.owner_visible_summary && (
                    <p className="text-xs mt-1 whitespace-pre-wrap">{r.owner_visible_summary}</p>
                  )}
                  {r.is_urgent_safety && (
                    <p className="text-red-600 font-medium text-xs mt-1">Urgent safety flag</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Work orders ({workOrders.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {workOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shared work orders yet.</p>
            ) : (
              workOrders.map((w: any) => (
                <div key={w.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{w.work_order_number ? `${w.work_order_number} — ` : ''}{w.title}</p>
                    <Badge variant="outline">{formatStatusLabel(w.status)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {w.property?.property_name}{w.unit?.unit_label ? ` · ${w.unit.unit_label}` : ''}
                  </p>
                  {w.owner_visible_summary && (
                    <p className="text-xs mt-1 whitespace-pre-wrap">{w.owner_visible_summary}</p>
                  )}
                  {w.owner_visible_completion_note && (
                    <p className="text-xs mt-1 italic text-emerald-800">Completion note: {w.owner_visible_completion_note}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
