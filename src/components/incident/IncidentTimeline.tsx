import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  AlertTriangle, CheckCircle2, Send, FileEdit, Eye, ShieldAlert, Clock,
} from 'lucide-react';

interface TimelineEntry {
  id: string;
  timestamp: Date;
  icon: React.ReactNode;
  title: string;
  detail?: string;
  color: string;
}

interface IncidentTimelineProps {
  report: any;
  shares: any[] | undefined;
}

export function IncidentTimeline({ report, shares }: IncidentTimelineProps) {
  const r = report;
  const entries: TimelineEntry[] = [];

  // 1. Reported
  entries.push({
    id: 'reported',
    timestamp: new Date(r.created_at),
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    title: `Incident reported by ${r.reporter_type === 'worker' ? 'employee' : 'subcontractor'}`,
    detail: r.incident_type,
    color: 'bg-amber-500',
  });

  // 2. First response
  if (r.first_responded_at) {
    entries.push({
      id: 'first-response',
      timestamp: new Date(r.first_responded_at),
      icon: <Eye className="h-3.5 w-3.5" />,
      title: 'First admin response',
      color: 'bg-blue-500',
    });
  }

  // 3. Severity set (if not default)
  if (r.severity && r.severity !== 'medium' && r.updated_at !== r.created_at) {
    entries.push({
      id: 'severity',
      timestamp: new Date(r.updated_at),
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      title: `Severity set to ${r.severity}`,
      color: r.severity === 'critical' || r.severity === 'high' ? 'bg-destructive' : 'bg-amber-500',
    });
  }

  // 4. Admin notes added
  if (r.admin_notes) {
    entries.push({
      id: 'admin-notes',
      timestamp: new Date(r.updated_at),
      icon: <FileEdit className="h-3.5 w-3.5" />,
      title: 'Investigation notes added',
      detail: r.admin_notes.slice(0, 80) + (r.admin_notes.length > 80 ? '…' : ''),
      color: 'bg-blue-500',
    });
  }

  // 5. Corrective actions
  if (r.corrective_action_notes) {
    entries.push({
      id: 'corrective',
      timestamp: new Date(r.updated_at),
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      title: 'Corrective actions documented',
      detail: r.corrective_action_notes.slice(0, 80) + (r.corrective_action_notes.length > 80 ? '…' : ''),
      color: 'bg-emerald-500',
    });
  }

  // 6. Shares
  if (shares?.length) {
    shares.forEach((s: any) => {
      entries.push({
        id: `share-${s.id}`,
        timestamp: new Date(s.shared_at),
        icon: <Send className="h-3.5 w-3.5" />,
        title: `Shared with ${s.recipient_name || s.recipient_email}`,
        detail: s.recipient_type !== 'custom' ? s.recipient_type.toUpperCase() : undefined,
        color: 'bg-primary',
      });
    });
  }

  // 7. Resolved
  if (r.resolved_at) {
    entries.push({
      id: 'resolved',
      timestamp: new Date(r.resolved_at),
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      title: `Report ${r.follow_up_status === 'closed' ? 'closed' : 'resolved'}`,
      color: 'bg-emerald-600',
    });
  }

  // Sort chronologically
  entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Investigation Timeline</h2>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="flex gap-3 relative">
                  <div className={`shrink-0 w-4 h-4 rounded-full ${entry.color} text-white flex items-center justify-center z-10 mt-0.5`}>
                    {entry.icon}
                  </div>
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <p className="text-sm font-medium leading-tight">{entry.title}</p>
                    {entry.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.detail}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(entry.timestamp, 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
