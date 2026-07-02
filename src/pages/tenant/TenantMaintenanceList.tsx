import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench, ChevronRight, AlertCircle } from 'lucide-react';
import { useMyMaintenanceRequests } from '@/hooks/useTenantPortal';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  reviewed: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  in_progress: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  completed: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
  cancelled: 'bg-rose-100 text-rose-800 hover:bg-rose-100',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-600',
  normal: 'text-emerald-700',
  urgent: 'text-rose-700',
};

export default function TenantMaintenanceList() {
  const { data = [], isLoading } = useMyMaintenanceRequests();

  return (
    <div className="p-4 space-y-4">
      <Button
        asChild
        size="lg"
        className="w-full bg-emerald-700 hover:bg-emerald-800 font-bold h-12 shadow-md"
      >
        <Link to="/tenant/maintenance/new">
          <Plus className="h-4 w-4 mr-1" /> New Maintenance Request
        </Link>
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <Wrench className="h-7 w-7 text-emerald-700" />
            </div>
            <p className="font-medium text-slate-900">No maintenance requests yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tap the button above to submit your first request.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {data.map((r: any) => (
            <Link key={r.id} to={`/tenant/maintenance/${r.id}`}>
              <Card className="hover:border-emerald-300 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-900 truncate">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span className="capitalize">{String(r.category).replace('_', ' ')}</span>
                        <span>·</span>
                        <span className={`capitalize font-medium ${PRIORITY_COLORS[r.priority] || ''}`}>
                          {r.priority === 'urgent' && <AlertCircle className="inline h-3 w-3 mr-0.5" />}
                          {r.priority}
                        </span>
                        <span>·</span>
                        <span>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={STATUS_COLORS[r.status] || ''}>
                        {String(r.status).replace('_', ' ')}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {r.tenant_facing_update && (
                    <p className="text-xs text-emerald-800 mt-2 italic border-l-2 border-emerald-200 pl-2">
                      Update: {r.tenant_facing_update}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
