import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Briefcase, ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVisits } from '@/hooks/useVisits';
import { useJobs } from '@/hooks/useJobs';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

type ViewMode = 'week' | 'month';

export default function Schedule() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: visits = [] } = useVisits();
  const { data: jobs = [] } = useJobs();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const days = useMemo(() => {
    if (viewMode === 'week') {
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    // For month, start from Monday of the first week
    const mStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const mEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: mStart, end: mEnd });
  }, [viewMode, currentDate]);

  const navigate = (dir: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(dir === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  // Group visits by date
  const visitsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (visits as any[]).forEach(v => {
      const d = v.service_date;
      if (!map[d]) map[d] = [];
      map[d].push(v);
    });
    return map;
  }, [visits]);

  // Group jobs with scheduled_date by date
  const jobsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (jobs as any[]).forEach(j => {
      if (j.scheduled_date) {
        if (!map[j.scheduled_date]) map[j.scheduled_date] = [];
        map[j.scheduled_date].push(j);
      }
    });
    return map;
  }, [jobs]);

  const rangeLabel = viewMode === 'week'
    ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    : format(currentDate, 'MMMM yyyy');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">Schedule</h1>
        <div className="flex items-center gap-1">
          <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" className="h-8 text-xs px-2.5" onClick={() => setViewMode('week')}>
            <List className="h-3.5 w-3.5 mr-1" /> Week
          </Button>
          <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" className="h-8 text-xs px-2.5" onClick={() => setViewMode('month')}>
            <CalendarIcon className="h-3.5 w-3.5 mr-1" /> Month
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week view — vertical list (mobile-first) */}
      {viewMode === 'week' && (
        <div className="space-y-2">
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayVisits = visitsByDate[dateKey] || [];
            const dayJobs = jobsByDate[dateKey] || [];
            const hasItems = dayVisits.length > 0 || dayJobs.length > 0;

            return (
              <Card key={dateKey} className={`overflow-hidden ${isToday(day) ? 'ring-2 ring-primary/40' : ''}`}>
                <div className={`px-3 py-2 border-b flex items-center justify-between ${isToday(day) ? 'bg-primary/5' : 'bg-muted/30'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday(day) ? 'text-primary' : ''}`}>
                      {format(day, 'EEE')}
                    </span>
                    <span className={`text-sm ${isToday(day) ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                      {format(day, 'MMM d')}
                    </span>
                    {isToday(day) && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">TODAY</span>}
                  </div>
                  {hasItems && (
                    <span className="text-[10px] text-muted-foreground">
                      {dayVisits.length > 0 && `${dayVisits.length} visit${dayVisits.length > 1 ? 's' : ''}`}
                      {dayVisits.length > 0 && dayJobs.length > 0 && ' · '}
                      {dayJobs.length > 0 && `${dayJobs.length} job${dayJobs.length > 1 ? 's' : ''}`}
                    </span>
                  )}
                </div>
                <CardContent className="p-2">
                  {!hasItems ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">No activity</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayJobs.map((j: any) => (
                        <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center gap-2 p-2 rounded-md border border-dashed hover:bg-muted/50 transition-colors">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{j.job_title}</p>
                            <p className="text-[10px] text-muted-foreground">{j.job_number} · {j.service_category}</p>
                          </div>
                          <StatusBadge status={j.status} showIcon={false} />
                        </Link>
                      ))}
                      {dayVisits.map((v: any) => (
                        <Link key={v.id} to={`/visits/${v.id}`} className="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/50 transition-colors">
                          <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{v.visit_number} — {v.jobs?.job_title || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {v.visit_type}
                              {v.arrival_time && ` · ${format(parseISO(v.arrival_time), 'h:mm a')}`}
                              {v.properties?.property_name && ` · ${v.properties.property_name}`}
                            </p>
                          </div>
                          <StatusBadge status={v.visit_status} showIcon={false} />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Month view — compact grid */}
      {viewMode === 'month' && (
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayVisits = visitsByDate[dateKey] || [];
              const dayJobs = jobsByDate[dateKey] || [];
              const inMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={dateKey}
                  className={`min-h-[60px] md:min-h-[80px] p-1 ${inMonth ? 'bg-card' : 'bg-muted/30'} ${isToday(day) ? 'ring-2 ring-inset ring-primary/40' : ''}`}
                >
                  <p className={`text-[10px] font-medium mb-0.5 ${isToday(day) ? 'text-primary' : inMonth ? '' : 'text-muted-foreground/50'}`}>
                    {format(day, 'd')}
                  </p>
                  {dayVisits.slice(0, 2).map((v: any) => (
                    <Link key={v.id} to={`/visits/${v.id}`} className="block text-[9px] leading-tight truncate px-1 py-0.5 rounded bg-primary/10 text-primary mb-0.5 hover:bg-primary/20">
                      {v.visit_number}
                    </Link>
                  ))}
                  {dayJobs.slice(0, 1).map((j: any) => (
                    <Link key={j.id} to={`/jobs/${j.id}`} className="block text-[9px] leading-tight truncate px-1 py-0.5 rounded bg-accent/50 text-accent-foreground mb-0.5 hover:bg-accent">
                      {j.job_number}
                    </Link>
                  ))}
                  {(dayVisits.length + dayJobs.length) > 3 && (
                    <p className="text-[8px] text-muted-foreground text-center">+{dayVisits.length + dayJobs.length - 3}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
