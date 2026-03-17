import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  open: 'bg-amber-500/10 text-amber-700 border-amber-200',
  investigating: 'bg-blue-500/10 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  closed: 'bg-muted text-muted-foreground',
};

export default function SubcontractorIncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading } = useQuery({
    queryKey: ['incident_report', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="px-4 pt-6 pb-4 text-center">
        <p className="text-muted-foreground">Report not found.</p>
        <Link to="/subcontractor/incidents"><Button variant="link">Back to reports</Button></Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to="/subcontractor/incidents">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{report.incident_type}</h1>
          <p className="text-xs text-muted-foreground font-mono">{report.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 ${statusColors[report.follow_up_status] ?? ''}`}>
          {report.follow_up_status}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{format(new Date(report.date_time), 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(report.date_time), 'h:mm a')}</p>
            </div>
          </div>
          {report.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm">{report.location}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm whitespace-pre-wrap">{report.description || 'No description provided.'}</p>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground text-center">
        Filed {format(new Date(report.created_at), 'MMM d, yyyy · h:mm a')}
      </p>
    </div>
  );
}
