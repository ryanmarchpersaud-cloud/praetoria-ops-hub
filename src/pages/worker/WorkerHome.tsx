import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTimesheet, useClockIn, useClockOut } from '@/hooks/useTimesheets';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { WorkerFAB } from '@/components/worker/WorkerFAB';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Bell, LogIn, LogOut as LogOutIcon, MapPin, Clock, CheckCircle,
  ChevronRight, Calendar, Zap, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday() {
  return new Date().toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function WorkerHome() {
  const { user } = useAuth();
  const { data: active } = useActiveTimesheet();
  const clockInMut = useClockIn();
  const clockOutMut = useClockOut();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const calcElapsed = () => Math.floor((Date.now() - new Date(active.clock_in).getTime()) / 1000);
    setElapsed(calcElapsed());
    const interval = setInterval(() => setElapsed(calcElapsed()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const todayStr = new Date().toISOString().split('T')[0];

  const { data: todayVisits = [] } = useQuery({
    queryKey: ['worker_today_visits', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, visit_number, visit_status, visit_type, service_date, arrival_time, completion_time, service_summary, properties(property_name, address_line_1, city), customers(first_name, last_name)')
        .eq('service_date', todayStr)
        .order('arrival_time', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const completedVisits = todayVisits.filter(v => v.visit_status === 'Completed');
  const inProgressVisit = todayVisits.find(v => v.visit_status === 'In Progress' || v.visit_status === 'En Route');
  const nextVisit = todayVisits.find(v => v.visit_status === 'Scheduled' || v.visit_status === 'Planned');
  const highlightVisit = inProgressVisit || nextVisit || completedVisits[completedVisits.length - 1];

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const handleClock = () => {
    if (active) {
      clockOutMut.mutate(active.id);
    } else {
      clockInMut.mutate();
    }
  };

  const clockedIn = !!active;

  // Build notifications from today's visits
  const notifications = todayVisits.map(v => ({
    id: v.id,
    title: `${v.visit_number} — ${v.visit_status}`,
    description: `${(v.properties as any)?.property_name || 'Unknown property'}${(v.customers as any) ? ` • ${(v.customers as any).first_name} ${(v.customers as any).last_name}` : ''}`,
    status: v.visit_status,
  }));

  return (
    <div className="space-y-4 px-4 pt-3 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-lg font-bold text-foreground">{getGreeting()}, {firstName}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {formatToday()}
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className="relative w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active:bg-muted transition-colors">
              <Bell className="h-5 w-5 text-foreground" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                notifications.map(n => (
                  <Link key={n.id} to={`/visits/${n.id}`}>
                    <Card className="active:shadow-sm transition-shadow">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-xs font-medium truncate">{n.title}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground pl-5">{n.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Clock In/Out */}
      <button
        onClick={handleClock}
        className={cn(
          'w-full rounded-xl py-4 px-5 flex items-center justify-between transition-all active:scale-[0.98] shadow-sm',
          clockedIn
            ? 'bg-emerald-50 border-2 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
            : 'bg-primary text-primary-foreground'
        )}
      >
        <div className="flex items-center gap-3">
          {clockedIn ? (
            <LogOutIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <LogIn className="h-6 w-6" />
          )}
          <div className="text-left">
            <p className={cn('text-sm font-bold', clockedIn ? 'text-emerald-700 dark:text-emerald-300' : '')}>
              {clockedIn ? 'Clock Out' : 'Clock In'}
            </p>
            {clockedIn && active && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Since {new Date(active.clock_in).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {!clockedIn && (
              <p className="text-[11px] opacity-80">Start your shift</p>
            )}
          </div>
        </div>
        <Clock className={cn('h-5 w-5', clockedIn ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-70')} />
      </button>

      {/* Today's Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Today</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{todayVisits.length}</p>
            <p className="text-[10px] text-muted-foreground">visits scheduled</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Done</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{completedVisits.length}</p>
            <p className="text-[10px] text-muted-foreground">
              of {todayVisits.length} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {todayVisits.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Day progress</span>
            <span>{todayVisits.length > 0 ? Math.round((completedVisits.length / todayVisits.length) * 100) : 0}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${todayVisits.length > 0 ? (completedVisits.length / todayVisits.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Highlight Visit Card */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">
            {inProgressVisit ? 'Current Visit' : nextVisit ? 'Next Visit' : completedVisits.length > 0 ? 'Last Completed' : "Today's Visits"}
          </h2>
          {todayVisits.length > 0 && (
            <Link to="/worker/schedule" className="text-[11px] text-primary font-medium flex items-center gap-0.5">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {highlightVisit ? (
          <Link to={`/visits/${highlightVisit.id}`}>
            <Card className={cn(
              'transition-shadow active:shadow-md',
              inProgressVisit && 'ring-2 ring-primary/30 bg-primary/5'
            )}>
              <CardContent className="pt-4 pb-4 px-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-medium">{highlightVisit.visit_number}</span>
                  <StatusBadge status={highlightVisit.visit_status} showIcon={false} />
                </div>
                {highlightVisit.customers && (
                  <p className="text-sm font-medium text-foreground">
                    {(highlightVisit.customers as any).first_name} {(highlightVisit.customers as any).last_name}
                  </p>
                )}
                {highlightVisit.properties && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <p>{(highlightVisit.properties as any).property_name}</p>
                      {(highlightVisit.properties as any).address_line_1 && (
                        <p className="text-[10px]">
                          {(highlightVisit.properties as any).address_line_1}
                          {(highlightVisit.properties as any).city && `, ${(highlightVisit.properties as any).city}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {highlightVisit.service_summary && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{highlightVisit.service_summary}</p>
                )}
                {inProgressVisit && (
                  <div className="pt-1">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      In Progress
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardContent className="py-10 text-center space-y-1">
              <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No visits today</p>
              <p className="text-xs text-muted-foreground">Check the schedule for upcoming work.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming visits list */}
      {todayVisits.length > 1 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">All Today</h2>
          {todayVisits
            .filter(v => v.id !== highlightVisit?.id)
            .map((visit: any) => (
              <Link key={visit.id} to={`/visits/${visit.id}`}>
                <Card className="active:shadow-sm transition-shadow">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[11px]">{visit.visit_number}</span>
                        <StatusBadge status={visit.visit_status} showIcon={false} />
                      </div>
                      {visit.properties && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {visit.properties.property_name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>
      )}

      {/* Location context */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-6 text-center space-y-1">
          <MapPin className="h-6 w-6 mx-auto text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Location services</p>
          <p className="text-[10px] text-muted-foreground">Map and routing coming soon</p>
        </CardContent>
      </Card>

      <WorkerFAB />
    </div>
  );
}
