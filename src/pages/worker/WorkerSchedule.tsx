import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ChevronLeft, ChevronRight, MapPin, Calendar, Clock,
  Navigation, Phone, Briefcase, ChevronRight as ChevronR,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { startOfWeek, endOfWeek, addWeeks, format, isToday, addDays, isBefore, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { DirectionsButton } from '@/components/DirectionsButton';

type ScheduleTab = 'today' | 'upcoming' | 'week';

type Visit = {
  id: string;
  visit_number: string;
  visit_status: string;
  visit_type: string;
  service_date: string;
  arrival_time: string | null;
  completion_time: string | null;
  service_summary: string | null;
  crew_notes: string | null;
  assigned_worker_id: string | null;
  properties: { property_name: string; address_line_1: string | null; city: string | null; province: string | null; postal_code: string | null } | null;
  customers: { first_name: string; last_name: string; phone: string | null } | null;
  jobs: { assigned_to: string | null; service_category: string | null; job_title: string | null; job_number: string | null; service_instructions: string | null } | null;
};

const VISIT_SELECT = 'id, visit_number, visit_status, visit_type, service_date, arrival_time, completion_time, service_summary, crew_notes, assigned_worker_id, properties(property_name, address_line_1, city, province, postal_code), customers(first_name, last_name, phone), jobs(assigned_to, service_category, job_title, job_number, service_instructions)';

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString('en-CA', { timeZone: 'America/Regina', hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return null; }
}

const serviceCategoryColors: Record<string, { bg: string; border: string; accent: string }> = {
  'Snow Removal': { bg: 'bg-sky-500/10', border: 'border-sky-400', accent: 'text-sky-700' },
  'Landscaping': { bg: 'bg-emerald-500/10', border: 'border-emerald-400', accent: 'text-emerald-700' },
  'Junk Removal': { bg: 'bg-amber-500/10', border: 'border-amber-400', accent: 'text-amber-700' },
  'Property Maintenance': { bg: 'bg-violet-500/10', border: 'border-violet-400', accent: 'text-violet-700' },
  'Property Management': { bg: 'bg-rose-500/10', border: 'border-rose-400', accent: 'text-rose-700' },
};
const defaultCategoryColor = { bg: 'bg-primary/10', border: 'border-primary/40', accent: 'text-primary' };

function VisitCard({ visit, showDate = false }: { visit: Visit; showDate?: boolean }) {
  const isActive = visit.visit_status === 'In Progress' || visit.visit_status === 'En Route';
  const isCompleted = visit.visit_status === 'Completed';
  const arrivalStr = formatTime(visit.arrival_time);
  const completionStr = formatTime(visit.completion_time);
  const catColor = serviceCategoryColors[visit.jobs?.service_category ?? ''] ?? defaultCategoryColor;

  return (
    <Link to={`/worker/visit/${visit.id}`} className="block">
      <Card className={cn(
        'active:shadow-md transition-all border-l-4',
        catColor.border,
        isActive && 'ring-2 ring-primary/30 shadow-md',
        isCompleted && 'opacity-60',
        !isActive && !isCompleted && catColor.bg,
      )}>
        {isActive && (
          <div className="bg-primary/10 px-3 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-primary">{visit.visit_status}</span>
          </div>
        )}
        <CardContent className="p-3.5 space-y-2">
          {/* Top row: visit number + status */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-bold text-foreground">{visit.visit_number}</span>
              {visit.jobs?.service_category && (
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', catColor.bg, catColor.accent)}>
                  {visit.jobs.service_category}
                </span>
              )}
            </div>
            {!isActive && <StatusBadge status={visit.visit_status} showIcon={false} />}
          </div>

          {/* Date (for upcoming tab) */}
          {showDate && (
            <div className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {format(parseISO(visit.service_date), 'EEE, MMM d')}
            </div>
          )}

          {/* Customer */}
          {visit.customers && (
            <p className="text-sm font-bold text-foreground">
              {visit.customers.first_name} {visit.customers.last_name}
            </p>
          )}

          {/* Property address */}
          {visit.properties && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-xs">{visit.properties.property_name}</p>
                {visit.properties.address_line_1 && (
                  <p className="text-[11px]">
                    {visit.properties.address_line_1}
                    {visit.properties.city && `, ${visit.properties.city}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Time */}
          {arrivalStr && (
            <div className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {arrivalStr}
              {completionStr && <> – {completionStr}</>}
            </div>
          )}

          {/* Job reference */}
          {visit.jobs?.job_title && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Briefcase className="h-3 w-3" />
              <span className="truncate">{visit.jobs.job_title} ({visit.jobs.job_number})</span>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 pt-1">
            {visit.properties?.address_line_1 && (
              <a
                href={`https://maps.google.com/maps?daddr=${encodeURIComponent([visit.properties.address_line_1, visit.properties.city].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform shadow-sm"
              >
                <Navigation className="h-3 w-3" /> Navigate
              </a>
            )}
            {visit.customers?.phone && (
              <a
                href={`tel:${visit.customers.phone}`}
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-[11px] font-bold text-foreground active:scale-95 transition-transform"
              >
                <Phone className="h-3 w-3" /> Call
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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
  customers: { first_name: string; last_name: string } | null;
};

const TASK_SELECT = 'id, task_title, task_category, status, priority, due_date, due_time, address, city, province, properties(property_name, address_line_1, city), customers(first_name, last_name)';

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-700 border-red-400',
  high: 'bg-orange-500/10 text-orange-700 border-orange-400',
  medium: 'bg-blue-500/10 text-blue-700 border-blue-400',
  low: 'bg-slate-500/10 text-slate-600 border-slate-300',
};

function TaskCard({ task, showDate = false }: { task: TaskItem; showDate?: boolean }) {
  const isCompleted = task.status === 'Completed' || task.status === 'Cancelled';
  const pColor = priorityColors[task.priority] || priorityColors.medium;
  const taskAddress = task.properties?.address_line_1
    ? [task.properties.address_line_1, task.properties.city].filter(Boolean).join(', ')
    : task.address
    ? [task.address, task.city, task.province].filter(Boolean).join(', ')
    : null;

  return (
    <Link to={`/worker/tasks`} className="block">
      <Card className={cn(
        'active:shadow-md transition-all border-l-4',
        'border-amber-400 bg-amber-500/5',
        isCompleted && 'opacity-60',
      )}>
        <CardContent className="p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ClipboardList className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">Task</span>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', pColor)}>
                {task.priority}
              </span>
            </div>
            <StatusBadge status={task.status} showIcon={false} />
          </div>

          {showDate && task.due_date && (
            <div className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {format(parseISO(task.due_date), 'EEE, MMM d')}
            </div>
          )}

          <p className="text-sm font-bold text-foreground">{task.task_title}</p>

          {task.customers && (
            <p className="text-xs text-muted-foreground">
              {task.customers.first_name} {task.customers.last_name}
            </p>
          )}

          {task.properties && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
              <span className="font-semibold text-foreground text-xs">{task.properties.property_name}</span>
            </div>
          )}

          {task.due_time && (
            <div className="flex items-center gap-1 text-xs font-medium text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {task.due_time}
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 pt-1">
            {taskAddress && (
              <a
                href={`https://maps.google.com/maps?daddr=${encodeURIComponent(taskAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform shadow-sm"
              >
                <Navigation className="h-3 w-3" /> Navigate
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function WorkerSchedule() {
  const [tab, setTab] = useState<ScheduleTab>('today');
  const [weekOffset, setWeekOffset] = useState(0);
  const { user } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch a wide range for all tabs (current week ± some buffer, or specific ranges)
  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addWeeks(base, weekOffset);
  }, [weekOffset]);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = getWeekDays(weekStart);
  const startStr = format(weekStart, 'yyyy-MM-dd');
  const endStr = format(weekEnd, 'yyyy-MM-dd');

  // Today's visits
  const { data: todayVisits = [], isLoading: loadingToday } = useQuery({
    queryKey: ['worker_today_schedule', todayStr, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(VISIT_SELECT)
        .eq('service_date', todayStr)
        .neq('visit_status', 'Cancelled')
        .is('archived_at', null)
        .order('arrival_time', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Visit[];
    },
    enabled: !!user,
  });

  // Upcoming visits (next 14 days excluding today)
  const upcomingEnd = format(addDays(new Date(), 14), 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const { data: upcomingVisits = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['worker_upcoming_schedule', tomorrowStr, upcomingEnd, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(VISIT_SELECT)
        .gte('service_date', tomorrowStr)
        .lte('service_date', upcomingEnd)
        .neq('visit_status', 'Cancelled')
        .is('archived_at', null)
        .order('service_date', { ascending: true })
        .order('arrival_time', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Visit[];
    },
    enabled: !!user,
  });

  // Week visits
  const { data: weekVisits = [], isLoading: loadingWeek } = useQuery({
    queryKey: ['worker_week_visits', startStr, endStr, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(VISIT_SELECT)
        .gte('service_date', startStr)
        .lte('service_date', endStr)
        .neq('visit_status', 'Cancelled')
        .is('archived_at', null)
        .order('service_date', { ascending: true })
        .order('arrival_time', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Visit[];
    },
    enabled: !!user,
  });

  // ── Operational Tasks ──
  const { data: myTasks = [] } = useQuery({
    queryKey: ['worker_schedule_tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operational_tasks')
        .select(TASK_SELECT)
        .eq('assigned_to', user!.id)
        .not('status', 'in', '("Completed","Cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as TaskItem[];
    },
    enabled: !!user,
  });

  // Tasks for today
  const todayTasks = useMemo(() => myTasks.filter(t => t.due_date === todayStr), [myTasks, todayStr]);
  // Tasks upcoming (next 14 days, not today)
  const upcomingTasks = useMemo(() => myTasks.filter(t => t.due_date && t.due_date > todayStr && t.due_date <= upcomingEnd), [myTasks, todayStr, upcomingEnd]);
  // Tasks with no due date (show in today)
  const undatedTasks = useMemo(() => myTasks.filter(t => !t.due_date), [myTasks]);

  const visitsByDay = useMemo(() => {
    const map = new Map<string, Visit[]>();
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));
    weekVisits.forEach(v => {
      const arr = map.get(v.service_date);
      if (arr) arr.push(v);
    });
    return map;
  }, [weekVisits, days]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));
    myTasks.forEach(t => {
      if (t.due_date) {
        const arr = map.get(t.due_date);
        if (arr) arr.push(t);
      }
    });
    return map;
  }, [myTasks, days]);

  // Sort today: In Progress first, then En Route, then Scheduled, then rest
  const sortedToday = useMemo(() => {
    const order: Record<string, number> = { 'In Progress': 0, 'En Route': 1, 'Scheduled': 2, 'Planned': 3 };
    return [...todayVisits].sort((a, b) => (order[a.visit_status] ?? 5) - (order[b.visit_status] ?? 5));
  }, [todayVisits]);

  const todayCompleted = todayVisits.filter(v => v.visit_status === 'Completed').length;
  const weekCompleted = weekVisits.filter(v => v.visit_status === 'Completed').length;
  const totalTodayItems = todayVisits.length + todayTasks.length + undatedTasks.length;
  const totalUpcomingItems = upcomingVisits.length + upcomingTasks.length;

  const tabs: { key: ScheduleTab; label: string; count: number }[] = [
    { key: 'today', label: 'Today', count: totalTodayItems },
    { key: 'upcoming', label: 'Upcoming', count: totalUpcomingItems },
    { key: 'week', label: 'Week', count: weekVisits.length },
  ];

  return (
    <div className="px-4 pt-3 pb-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Schedule
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5',
              tab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                'min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center',
                tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {tab === 'today' && (
        <div className="space-y-3">
          {/* Progress */}
          {todayVisits.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{format(new Date(), 'EEEE, MMMM d')}</span>
              <span>{todayCompleted}/{todayVisits.length} completed</span>
            </div>
          )}
          {todayVisits.length > 0 && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${todayVisits.length > 0 ? Math.round((todayCompleted / todayVisits.length) * 100) : 0}%` }}
              />
            </div>
          )}

          {loadingToday ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : totalTodayItems === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No visits or tasks for today</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Check upcoming or weekly schedule</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {sortedToday.map(visit => (
                <VisitCard key={visit.id} visit={visit} />
              ))}
              {[...todayTasks, ...undatedTasks].map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* UPCOMING TAB */}
      {tab === 'upcoming' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Next 14 days</p>
          {loadingUpcoming ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : totalUpcomingItems === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No upcoming assignments</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Check back later or contact dispatch</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {upcomingVisits.map(visit => (
                <VisitCard key={visit.id} visit={visit} showDate />
              ))}
              {upcomingTasks.map(task => (
                <TaskCard key={task.id} task={task} showDate />
              ))}
            </div>
          )}
        </div>
      )}

      {/* WEEK TAB */}
      {tab === 'week' && (
        <div className="space-y-3">
          {/* Week nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
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
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}</span>
            <span>{weekCompleted}/{weekVisits.length} completed</span>
          </div>

          {loadingWeek ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayVisits = visitsByDay.get(dateKey) || [];
                const dayTasks = tasksByDay.get(dateKey) || [];
                const today = isToday(day);
                const dayCompleted = dayVisits.filter(v => v.visit_status === 'Completed').length;
                const totalDayItems = dayVisits.length + dayTasks.length;

                return (
                  <div key={dateKey}>
                    {/* Day header */}
                    <div className={cn(
                      'flex items-center gap-3 py-2 px-2 mb-2 sticky top-0 z-10 rounded-lg',
                      totalDayItems > 0
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-background',
                      today && 'bg-primary/15 border border-primary/30'
                    )}>
                      <div className={cn(
                        'w-11 h-11 rounded-full flex flex-col items-center justify-center text-center shrink-0 shadow-sm',
                        today ? 'bg-primary text-primary-foreground' :
                        totalDayItems > 0 ? 'bg-primary/20 text-primary' : 'bg-muted'
                      )}>
                        <span className="text-[9px] font-bold leading-none uppercase">
                          {format(day, 'EEE')}
                        </span>
                        <span className={cn('text-sm font-black leading-none', !today && totalDayItems === 0 && 'text-foreground')}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className={cn(
                          'text-sm font-bold',
                          today ? 'text-primary' :
                          totalDayItems > 0 ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {today ? 'Today' : format(day, 'EEEE')}
                        </span>
                        {totalDayItems > 0 && (
                          <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            today ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'
                          )}>
                            {dayCompleted}/{dayVisits.length}
                            {dayTasks.length > 0 && ` + ${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Visits + Tasks */}
                    {totalDayItems === 0 ? (
                      <div className="ml-12 py-3 text-xs text-muted-foreground/50 border-l-2 border-dashed border-border pl-4">
                        No visits or tasks
                      </div>
                    ) : (
                      <div className="ml-5 border-l-[3px] border-primary/30 pl-3 space-y-2.5">
                        {dayVisits.map(visit => (
                          <VisitCard key={visit.id} visit={visit} />
                        ))}
                        {dayTasks.map(task => (
                          <TaskCard key={task.id} task={task} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
