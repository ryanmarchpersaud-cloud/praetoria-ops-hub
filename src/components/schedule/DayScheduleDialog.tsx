import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Briefcase, ClipboardCheck, MapPin, Users, Clock, CalendarPlus, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

interface DayScheduleDialogProps {
  dateKey: string | null;
  visits: any[];
  jobs: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisitClick: (visit: any) => void;
}

export function DayScheduleDialog({ dateKey, visits, jobs, open, onOpenChange, onVisitClick }: DayScheduleDialogProps) {
  if (!dateKey) return null;
  const date = parseISO(dateKey + 'T12:00:00');
  const total = visits.length + jobs.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-base">{format(date, 'EEEE, MMMM d, yyyy')}</DialogTitle>
          <DialogDescription className="text-xs">
            {total} scheduled {total === 1 ? 'item' : 'items'} ({visits.length} visit{visits.length === 1 ? '' : 's'}, {jobs.length} job{jobs.length === 1 ? '' : 's'})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {total === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nothing scheduled for this date.</p>
          )}

          {visits.map((v: any) => {
            const customerName = v.customers
              ? (v.customers.company_name || `${v.customers.first_name ?? ''} ${v.customers.last_name ?? ''}`.trim())
              : null;
            const address = v.properties?.property_name;
            const teamNames = [
              v.worker_profiles?.full_name,
              ...(v.crew_names || []),
              ...(v.subcontractor_names || []),
            ].filter(Boolean);
            return (
              <button
                key={v.id}
                onClick={() => onVisitClick(v)}
                className="w-full text-left rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {customerName ? `${customerName}` : v.visit_number}
                        {v.jobs?.job_title && <span className="text-muted-foreground font-normal"> — {v.jobs.job_title}</span>}
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {v.visit_number}
                      {v.jobs?.service_category && ` · ${v.jobs.service_category}`}
                      {v.visit_type && ` · ${v.visit_type}`}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                      {v.arrival_time && (
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(v.arrival_time), 'h:mm a')}</span>
                      )}
                      {!v.arrival_time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />All day</span>}
                      {address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{address}</span>}
                      {teamNames.length > 0 && (
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{teamNames.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={v.visit_status} showIcon={false} />
                    {v.jobs?.id && (
                      <Link
                        to={`/jobs/${v.jobs.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        Open job <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {jobs.map((j: any) => (
            <Link
              key={j.id}
              to={`/jobs/${j.id}`}
              onClick={() => onOpenChange(false)}
              className="block rounded-md border border-dashed p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{j.job_title}</p>
                  <p className="text-[11px] text-muted-foreground">{j.job_number}{j.service_category && ` · ${j.service_category}`}</p>
                </div>
                <StatusBadge status={j.status} showIcon={false} />
              </div>
            </Link>
          ))}
        </div>

        <div className="border-t px-5 py-3">
          <Button asChild size="sm" className="w-full" onClick={() => onOpenChange(false)}>
            <Link to={`/schedule/new-visits?date=${dateKey}`}>
              <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> Create Visit for This Date
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
