import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench } from 'lucide-react';
import { useMyMaintenanceRequests } from '@/hooks/useTenantPortal';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-rose-100 text-rose-800',
};

export default function TenantMaintenanceList() {
  const { data = [], isLoading } = useMyMaintenanceRequests();

  return (
    <div className="p-4 space-y-4">
      <Button asChild className="w-full bg-emerald-700 hover:bg-emerald-800 font-bold">
        <Link to="/tenant/maintenance/new">
          <Plus className="h-4 w-4 mr-1" /> New Maintenance Request
        </Link>
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No maintenance requests yet.
          </CardContent>
        </Card>
      ) : (
        data.map(r => (
          <Link key={r.id} to={`/tenant/maintenance/${r.id}`}>
            <Card className="hover:border-emerald-300 transition-colors">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{r.title}</p>
                  <Badge className={STATUS_COLORS[r.status] || ''}>{r.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(r.created_at).toLocaleDateString()} · {r.category.replace('_', ' ')} · {r.priority}
                </p>
                {r.tenant_facing_update && (
                  <p className="text-xs text-emerald-800 mt-1 italic">Update: {r.tenant_facing_update}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
