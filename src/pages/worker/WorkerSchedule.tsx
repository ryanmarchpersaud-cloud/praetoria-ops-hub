import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { WorkerFAB } from '@/components/worker/WorkerFAB';
import {
  ChevronLeft, ChevronRight, MapPin, Calendar, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { startOfWeek, endOfWeek, addWeeks, format, isSameDay, isToday, addDays } from 'date-fns';

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

type Visit = {
  id: string;
  visit_number: string;
  visit_status: string;
  visit_type: string;
  service_date: string;
  arrival_time: string | null;
  completion_time: string | null;
  service_summary: string | null;
  properties: { property_name: string; address_line_1: string | null; city: string | null } | null;
  customers: { first_name: string; last_name: string } | null;
};

export default function WorkerSchedule() {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    return addWeeks(base, weekOffset);
  }, [weekOffset]);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = getWeekDays(weekStart);

  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['worker_week_visits', startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, visit_status, visit_type, service_date, arrival_time, completion_time, service_summary, properties(property_name, address_line_1, city), customers(first_name, last_name)')
        .gte('service_date', startStr)
        .lte('service_date', endStr)
        .order('service_date', { ascending: true })
        .order('arrival_time', { ascending: true });
      if (error) throw error;
      return data as unknown as Visit[];
    },
  });

  const visitsByDay = useMemo(() => {
    const map = new Map<string, Visit[]>();
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));
    visits.forEach(v => {
      const arr = map.get(v.service_date);
      if (arr) arr.push(v);
    });
    return map;
  }, [visits, days]);

  const totalVisits = visits.length;
  const completedVisits = visits.filter(v => v.visit_status === 'Completed').length;

  return (
    <div className="px-4 pt-3 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Schedule
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full transition-colors',
              weekOffset === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {weekOffset === 0 ? 'This Week' : format(weekStart, 'MMM d')}
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Week summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</span>
        <span>{completedVisits}/{totalVisits} completed</span>
      </div>

      {/* Day-by-day timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayVisits = visitsByDay.get(dateKey) || [];
            const today = isToday(day);
            const dayCompleted = dayVisits.filter(v => v.visit_status === 'Completed').length;

            return (
              <div key={dateKey}>
                {/* Day header */}
                <div className={cn(
                  'flex items-center gap-2 py-1.5 mb-1.5 sticky top-0 z-10 bg-background',
                )}>
                  <div className={cn(
                    'w-9 h-9 rounded-full flex flex-col items-center justify-center text-center shrink-0',
                    today ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    <span className="text-[9px] font-semibold leading-none uppercase">
                      {format(day, 'EEE')}
                    </span>
                    <span className={cn('text-sm font-bold leading-none', !today && 'text-foreground')}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className={cn(
                      'text-xs font-medium',
                      today ? 'text-primary' : 'text-foreground'
                    )}>
                      {today ? 'Today' : format(day, 'EEEE')}
                    </span>
                    {dayVisits.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {dayCompleted}/{dayVisits.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Visits */}
                {dayVisits.length === 0 ? (
                  <div className="ml-11 py-3 text-xs text-muted-foreground/60 border-l-2 border-dashed border-border pl-4">
                    No visits
                  </div>
                ) : (
                  <div className="ml-4 border-l-2 border-border pl-3 space-y-2">
                    {dayVisits.map(visit => (
                      <Link key={visit.id} to={`/worker/visit/${visit.id}`}>
                        <Card className={cn(
                          'active:shadow-sm transition-all',
                          visit.visit_status === 'In Progress' && 'ring-2 ring-primary/30 bg-primary/5',
                          visit.visit_status === 'Completed' && 'opacity-75'
                        )}>
                          <CardContent className="py-3 px-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Timeline dot */}
                                <div className={cn(
                                  'w-2 h-2 rounded-full shrink-0 -ml-[22px] mr-1',
                                  visit.visit_status === 'Completed' ? 'bg-emerald-500' :
                                  visit.visit_status === 'In Progress' ? 'bg-primary' :
                                  'bg-border'
                                )} />
                                <span className="font-mono text-[11px] font-medium">{visit.visit_number}</span>
                              </div>
                              <StatusBadge status={visit.visit_status} showIcon={false} />
                            </div>
                            {visit.customers && (
                              <p className="text-sm font-medium text-foreground">
                                {visit.customers.first_name} {visit.customers.last_name}
                              </p>
                            )}
                            {visit.properties && (
                              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="truncate">
                                  {visit.properties.property_name}
                                  {visit.properties.city && `, ${visit.properties.city}`}
                                </span>
                              </div>
                            )}
                            {visit.arrival_time && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {new Date(visit.arrival_time).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                                {visit.completion_time && (
                                  <> – {new Date(visit.completion_time).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}</>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <WorkerFAB />
    </div>
  );
}
