import { OwnerLayout } from '@/components/owner/OwnerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOwnerMaintenanceRequests } from '@/hooks/useOwnerPortal';

export default function OwnerMaintenance() {
  const { data: requests = [], isLoading } = useOwnerMaintenanceRequests();

  return (
    <OwnerLayout>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Maintenance activity</h2>
        <p className="text-xs text-muted-foreground">
          Read-only view of maintenance requests and work orders across your properties. All scheduling and dispatch is handled by Praetoria Group ops.
        </p>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : requests.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
            No maintenance requests yet.
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {requests.map((r: any) => (
              <Card key={r.id}>
                <CardHeader className="pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{r.title || r.category}</CardTitle>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                      {r.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pt-0">
                  <p>{r.property?.property_name}{r.unit?.unit_label ? ` · ${r.unit.unit_label}` : ''}</p>
                  <p>Priority: {r.priority ?? '—'} · Opened {new Date(r.created_at).toLocaleDateString()}</p>
                  {r.is_urgent_safety && (
                    <p className="text-red-600 font-medium mt-1">Urgent safety flag</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </OwnerLayout>
  );
}
