import { useIncidentReports } from '@/hooks/useIncidentReports';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Plus, AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  open: 'bg-amber-500/10 text-amber-700 border-amber-200',
  investigating: 'bg-blue-500/10 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground',
};

const severityIcon: Record<string, string> = {
  'Injury Report': '🩹',
  'Vehicle Accident': '🚗',
  'Equipment Damage': '🔧',
  'Property Damage': '🏠',
  'Near Miss': '⚠️',
  'Incident Report': '📋',
};

export default function WorkerIncidentsPage() {
  const { data: reports = [], isLoading } = useIncidentReports();

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="page-header-row">
        <h1 className="text-lg font-bold page-header-title">Safety & Incidents</h1>
        <Link to="/worker/incidents/new" className="page-header-action">
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Report
          </Button>
        </Link>
      </div>

      {/* Safety banner */}
      <Card className="border-amber-200 bg-amber-500/5">
        <CardContent className="p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Report all safety incidents, near misses, and property/equipment damage immediately.
          </p>
        </CardContent>
      </Card>

      {/* Reports list */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No incident reports filed.</p>
            <Link to="/worker/incidents/new">
              <Button size="sm" variant="outline" className="mt-3">
                <Plus className="h-4 w-4 mr-1" /> File a Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reports.map((r: any) => (
            <Link key={r.id} to={`/worker/incidents/${r.id}`}>
              <Card className="active:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="text-lg">{severityIcon[r.incident_type] || '📋'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{r.incident_type}</p>
                      {r.report_number && <span className="text-[10px] font-mono text-muted-foreground">{r.report_number}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.date_time), 'MMM d, yyyy · h:mm a')}
                    </p>
                    {r.location && <p className="text-xs text-muted-foreground truncate">{r.location}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[r.follow_up_status] ?? ''}`}>
                      {r.follow_up_status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
