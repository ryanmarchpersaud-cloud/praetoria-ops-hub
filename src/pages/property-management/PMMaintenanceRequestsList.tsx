import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';
import { useAdminMaintenanceRequests } from '@/hooks/useTenantPortal';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default function PMMaintenanceRequestsList() {
  const { data = [], isLoading } = useAdminMaintenanceRequests();
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-emerald-800 flex items-center gap-2">
          <Wrench className="h-6 w-6" /> Maintenance Requests
        </h1>
        <p className="text-sm text-muted-foreground">Tenant-submitted maintenance requests.</p>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">All requests ({data.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="divide-y">
              {data.map((r: any) => (
                <Link key={r.id} to={`/property-management/maintenance/${r.id}`} className="block py-3 hover:bg-muted/40 -mx-2 px-2 rounded">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{r.title}</p>
                    <Badge className={STATUS_COLORS[r.status] || ''}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.tenant?.first_name} {r.tenant?.last_name} · {r.property?.property_name}
                    {r.unit ? ` · Unit ${r.unit.unit_label}` : ''} · {r.category.replace('_', ' ')} · {r.priority}
                  </p>
                  <p className="text-xs text-muted-foreground">Submitted {new Date(r.created_at).toLocaleString()}</p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
