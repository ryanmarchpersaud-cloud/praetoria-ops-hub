import { useSubcontractorProfile, useSubcontractorAssignments } from '@/hooks/useSubcontractor';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { MapPin, ChevronRight, CalendarDays, Navigation, ClipboardList, Clock } from 'lucide-react';
import { format, startOfWeek, addDays, parseISO } from 'date-fns';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type TaskItem = {
  id: string;
  task_title: string;
  task_category: string;
  status: string;
  priority: string;
  due_date: string | null;
  due_time: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  properties: { property_name: string; address_line_1: string | null; city: string | null } | null;
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-700',
  high: 'bg-orange-500/10 text-orange-700',
  medium: 'bg-blue-500/10 text-blue-700',
  low: 'bg-slate-500/10 text-slate-600',
};

export default function SubcontractorSchedule() {
  const { user } = useAuth();
  const { data: profile } = useSubcontractorProfile();
  const { data: assignments = [], isLoading } = useSubcontractorAssignments(profile?.id);
  useVisitRealtimeSync(['subcontractor_assignments']);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch tasks assigned to this subcontractor
  const { data: myTasks = [] } = useQuery({
    queryKey: ['sub_schedule_tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_tasks')
        .select('id, task_title, task_category, status, priority, due_date, due_time, address, city, province, properties(property_name, address_line_1, city)')
        .eq('assigned_to', user!.id)
        .not('status', 'in', '("Completed","Cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as TaskItem[];
    },
    enabled: !!user,
  });

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    assignments.forEach((a: any) => {
      const d = a.visits?.service_date;
      if (d) { map[d] = map[d] || []; map[d].push(a); }
    });
    return map;
  }, [assignments]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    myTasks.forEach(t => {
      if (t.due_date) { map[t.due_date] = map[t.due_date] || []; map[t.due_date].push(t); }
    });
    return map;
  }, [myTasks]);

  // Undated tasks show on today
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const undatedTasks = useMemo(() => myTasks.filter(t => !t.due_date), [myTasks]);

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
            const dayTasks = tasksByDate[dateStr] || [];
            const extraTasks = dateStr === todayStr ? undatedTasks : [];
            const allTasks = [...dayTasks, ...extraTasks];
            const isToday = dateStr === todayStr;
            const totalItems = dayAssignments.length + allTasks.length;

            return (
              <div key={dateStr}>
                <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'EEEE, MMM d')}{isToday ? ' — Today' : ''}
                  {totalItems > 0 && <span className="ml-1 text-[10px] font-bold">({totalItems})</span>}
                </p>
                {totalItems === 0 ? (
                  <p className="text-[11px] text-muted-foreground/60 pl-2">No assignments or tasks</p>
                ) : (
                  <>
                    {dayAssignments.map((a: any) => (
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
                            {a.visits?.properties?.address_line_1 && (
                              <a
                                href={`https://maps.google.com/maps?daddr=${encodeURIComponent([a.visits.properties.address_line_1, a.visits.properties.city].filter(Boolean).join(', '))}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0"
                              >
                                <Navigation className="h-3.5 w-3.5 text-primary-foreground" />
                              </a>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                    {allTasks.map((task) => {
                      const taskAddress = task.properties?.address_line_1
                        ? [task.properties.address_line_1, task.properties.city].filter(Boolean).join(', ')
                        : task.address
                        ? [task.address, task.city, task.province].filter(Boolean).join(', ')
                        : null;
                      const pColor = priorityColors[task.priority] || priorityColors.medium;
                      return (
                        <Card key={task.id} className="mb-1.5 border-l-4 border-amber-400 bg-amber-500/5">
                          <CardContent className="p-3 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span className="text-sm font-medium text-foreground flex-1 truncate">{task.task_title}</span>
                              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', pColor)}>
                                {task.priority}
                              </span>
                            </div>
                            {task.properties && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{task.properties.property_name}
                              </p>
                            )}
                            {task.due_time && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />{task.due_time}
                              </p>
                            )}
                            {taskAddress && (
                              <a
                                href={`https://maps.google.com/maps?daddr=${encodeURIComponent(taskAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform shadow-sm"
                              >
                                <Navigation className="h-3 w-3" /> Navigate
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
