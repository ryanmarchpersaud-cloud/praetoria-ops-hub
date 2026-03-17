import { useSubcontractorProfile, useSubcontractorAssignments } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { MapPin, ChevronRight, CalendarDays } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { useState, useMemo } from 'react';

export default function SubcontractorSchedule() {
  const { data: profile } = useSubcontractorProfile();
  const { data: assignments = [], isLoading } = useSubcontractorAssignments(profile?.id);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    assignments.forEach((a: any) => {
      const d = a.visits?.service_date;
      if (d) { map[d] = map[d] || []; map[d].push(a); }
    });
    return map;
  }, [assignments]);

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Assigned Schedule</h1>

      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="text-xs text-primary font-medium">← Prev</button>
        <p className="text-sm font-medium text-foreground">{format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}</p>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="text-xs text-primary font-medium">Next →</button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : (
        <div className="space-y-3">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAssignments = assignmentsByDate[dateStr] || [];
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
            return (
              <div key={dateStr}>
                <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'EEEE, MMM d')}{isToday ? ' — Today' : ''}
                </p>
                {dayAssignments.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 pl-2">No assignments</p>
                ) : (
                  dayAssignments.map((a: any) => (
                    <Link key={a.id} to={a.visits?.id ? `/subcontractor/visit/${a.visits.id}` : '#'}>
                      <Card className="mb-1.5 active:shadow-sm transition-shadow">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{a.visits?.visit_number || 'Visit'}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{a.visits?.properties?.property_name || '—'}
                            </p>
                          </div>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{a.visits?.visit_status || a.assignment_status}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
