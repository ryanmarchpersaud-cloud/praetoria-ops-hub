import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Timer, CheckCircle2, AlertTriangle } from 'lucide-react';
import { differenceInMinutes, differenceInHours, differenceInDays, format } from 'date-fns';

interface ResponseMetricsProps {
  report: any;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs < 24) return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs > 0 ? `${days}d ${remHrs}h` : `${days}d`;
}

export function IncidentResponseMetrics({ report }: ResponseMetricsProps) {
  const r = report;
  const createdAt = new Date(r.created_at);
  const now = new Date();
  const firstRespondedAt = r.first_responded_at ? new Date(r.first_responded_at) : null;
  const resolvedAt = r.resolved_at ? new Date(r.resolved_at) : null;
  const isClosed = r.follow_up_status === 'closed' || r.follow_up_status === 'resolved';

  const responseTimeMin = firstRespondedAt ? differenceInMinutes(firstRespondedAt, createdAt) : null;
  const resolutionTimeMin = resolvedAt ? differenceInMinutes(resolvedAt, createdAt) : null;
  const daysOpen = differenceInDays(isClosed && resolvedAt ? resolvedAt : now, createdAt);

  const metrics = [
    {
      label: 'First Response',
      value: responseTimeMin !== null ? formatDuration(responseTimeMin) : '—',
      sub: firstRespondedAt ? format(firstRespondedAt, 'MMM d, h:mm a') : 'Not yet responded',
      icon: <Timer className="h-4 w-4" />,
      color: responseTimeMin !== null
        ? responseTimeMin <= 60 ? 'text-emerald-600' : responseTimeMin <= 240 ? 'text-amber-600' : 'text-destructive'
        : 'text-muted-foreground',
    },
    {
      label: 'Resolution Time',
      value: resolutionTimeMin !== null ? formatDuration(resolutionTimeMin) : '—',
      sub: resolvedAt ? format(resolvedAt, 'MMM d, h:mm a') : isClosed ? 'Closed without resolution timestamp' : 'Still open',
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: resolutionTimeMin !== null ? 'text-emerald-600' : 'text-muted-foreground',
    },
    {
      label: 'Days Open',
      value: `${daysOpen}d`,
      sub: isClosed ? 'Total duration' : 'And counting',
      icon: <Clock className="h-4 w-4" />,
      color: !isClosed && daysOpen > 7 ? 'text-destructive' : !isClosed && daysOpen > 3 ? 'text-amber-600' : 'text-foreground',
    },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Response Metrics</h2>
        <div className="grid grid-cols-3 gap-3">
          {metrics.map(m => (
            <div key={m.label} className="text-center space-y-1">
              <div className={`flex items-center justify-center gap-1.5 ${m.color}`}>
                {m.icon}
                <span className="text-lg font-bold tabular-nums">{m.value}</span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">{m.label}</p>
              <p className="text-[10px] text-muted-foreground">{m.sub}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
