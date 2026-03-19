import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveTimesheet, useClockIn, useClockOut } from '@/hooks/useTimesheets';
import { useWorkerCertifications } from '@/hooks/useWorkerProfile';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { WorkerFAB } from '@/components/worker/WorkerFAB';
import { WorkerLocationCard } from '@/components/worker/WorkerLocationCard';
import { WeatherCard } from '@/components/WeatherCard';
import { DirectionsButton } from '@/components/DirectionsButton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Bell, LogIn, LogOut as LogOutIcon, MapPin, Clock, CheckCircle,
  ChevronRight, Calendar, Zap, AlertCircle, Navigation,
  CalendarDays, Camera, CloudSun, FileText, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

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
  const { data: certs = [] } = useWorkerCertifications();

  const expiringCerts = certs.filter(c => {
    if (!c.expiry_date || c.status === 'expired') return false;
    const days = differenceInDays(new Date(c.expiry_date), new Date());
    return days >= 0 && days <= 60;
  });

  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const calcElapsed = () => Math.floor((Date.now() - new Date(active.clock_in).getTime()) / 1000);
    setElapsed(calcElapsed());
    const interval = setInterval(() => setElapsed(calcElapsed()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const todayStr = new Date().toISOString().split('T')[0];

  const { data: todayVisits = [] } = useQuery({
    queryKey: ['worker_today_visits', todayStr, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('visits')
        .select('id, visit_number, visit_status, visit_type, service_date, arrival_time, completion_time, service_summary, properties(property_name, address_line_1, city, province, postal_code), customers(first_name, last_name, phone), jobs(assigned_to)')
        .eq('service_date', todayStr)
        .order('arrival_time', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      // Filter to visits assigned to this worker (via job.assigned_to) or unassigned
      return (data || []).filter((v: any) => {
        const assignedTo = v.jobs?.assigned_to;
        return !assignedTo || assignedTo === user?.id;
      });
    },
    enabled: !!user,
  });

  const completedVisits = todayVisits.filter(v => v.visit_status === 'Completed');
  const inProgressVisit = todayVisits.find(v => v.visit_status === 'In Progress' || v.visit_status === 'En Route');
  const nextVisit = todayVisits.find(v => v.visit_status === 'Scheduled' || v.visit_status === 'Planned');
  const highlightVisit = inProgressVisit || nextVisit;
  const lastCompleted = completedVisits[completedVisits.length - 1];

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

  // Next visit location for the map card
  const mapVisit = highlightVisit || nextVisit;
  const nextVisitLocation = mapVisit
    ? {
        propertyName: (mapVisit.properties as any)?.property_name,
        address: (mapVisit.properties as any)?.address_line_1,
        city: (mapVisit.properties as any)?.city,
        customerName: (mapVisit.customers as any) ? `${(mapVisit.customers as any).first_name} ${(mapVisit.customers as any).last_name}` : undefined,
        serviceType: mapVisit.visit_type,
        visitStatus: mapVisit.visit_status,
        customerPhone: (mapVisit.customers as any)?.phone,
      }
    : null;

  const progressPct = todayVisits.length > 0 ? Math.round((completedVisits.length / todayVisits.length) * 100) : 0;

  return (
    <div className="space-y-3 px-4 pt-3 pb-4">
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
                  <Link key={n.id} to={`/worker/visit/${n.id}`}>
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

      {/* Expiring Certifications Alert */}
      {expiringCerts.length > 0 && (
        <Link to="/worker/training">
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 active:shadow-sm transition-shadow">
            <CardContent className="p-3 flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {expiringCerts.length} certification{expiringCerts.length > 1 ? 's' : ''} expiring soon
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 mt-0.5">
                  {expiringCerts.map(c => {
                    const days = differenceInDays(new Date(c.expiry_date!), new Date());
                    return `${c.cert_name} (${days}d)`;
                  }).join(' · ')}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-1" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Clock In/Out */}
      <button
        onClick={handleClock}
        className={cn(
          'w-full rounded-2xl py-4 px-5 flex items-center justify-between transition-all active:scale-[0.98] shadow-sm',
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
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {formatElapsed(elapsed)}
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
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40">
          <CardContent className="p-2.5 text-center">
            <Zap className="h-4 w-4 text-blue-600 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-foreground">{todayVisits.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Scheduled</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40">
          <CardContent className="p-2.5 text-center">
            <CheckCircle className="h-4 w-4 text-emerald-600 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-foreground">{completedVisits.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40">
          <CardContent className="p-2.5 text-center">
            <Clock className="h-4 w-4 text-amber-600 mx-auto mb-0.5" />
            <p className="text-xl font-bold text-foreground">{progressPct}%</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      {todayVisits.length > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        <Link to="/worker/schedule" className="action-tile action-tile-blue">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <span className="text-[10px] font-medium text-foreground">Schedule</span>
        </Link>
        <Link to="/worker/timesheet" className="action-tile action-tile-emerald">
          <Clock className="h-5 w-5 text-emerald-600" />
          <span className="text-[10px] font-medium text-foreground">Timesheet</span>
        </Link>
        <Link to="/worker/weather" className="action-tile action-tile-cyan">
          <CloudSun className="h-5 w-5 text-cyan-600" />
          <span className="text-[10px] font-medium text-foreground">Weather</span>
        </Link>
        <Link to="/worker/more" className="action-tile action-tile-violet">
          <FileText className="h-5 w-5 text-violet-600" />
          <span className="text-[10px] font-medium text-foreground">More</span>
        </Link>
      </div>
      {highlightVisit && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">
              {inProgressVisit ? 'Current Visit' : 'Next Visit'}
            </h2>
            <Link to="/worker/schedule" className="text-[11px] text-primary font-medium flex items-center gap-0.5">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <Link to={`/worker/visit/${highlightVisit.id}`}>
            <Card className={cn(
              'transition-shadow active:shadow-md overflow-hidden',
              inProgressVisit && 'ring-2 ring-primary/30'
            )}>
              {inProgressVisit && (
                <div className="bg-primary/10 px-4 py-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] font-semibold text-primary">In Progress</span>
                </div>
              )}
              <CardContent className="pt-3 pb-3 px-4 space-y-2">
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
                    <div className="flex-1 min-w-0">
                      <p>{(highlightVisit.properties as any).property_name}</p>
                      {(highlightVisit.properties as any).address_line_1 && (
                        <p className="text-[10px]">
                          {(highlightVisit.properties as any).address_line_1}
                          {(highlightVisit.properties as any).city && `, ${(highlightVisit.properties as any).city}`}
                        </p>
                      )}
                    </div>
                    <DirectionsButton
                      address={(highlightVisit.properties as any).address_line_1}
                      city={(highlightVisit.properties as any).city}
                      variant="icon"
                    />
                  </div>
                )}
                {/* Quick action row */}
                <div className="flex gap-2 pt-1">
                  {highlightVisit.properties && (
                    <a
                      href={`https://maps.google.com/maps?daddr=${encodeURIComponent([(highlightVisit.properties as any).address_line_1, (highlightVisit.properties as any).city].filter(Boolean).join(', '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-[11px] font-medium text-primary active:scale-95 transition-transform"
                    >
                      <Navigation className="h-3 w-3" /> Navigate
                    </a>
                  )}
                  {(highlightVisit.customers as any)?.phone && (
                    <a
                      href={`tel:${(highlightVisit.customers as any).phone}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted text-[11px] font-medium text-foreground active:scale-95 transition-transform"
                    >
                      Call
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Last Completed */}
      {lastCompleted && !inProgressVisit && nextVisit && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Last Completed</h2>
          <Link to={`/worker/visit/${lastCompleted.id}`}>
            <Card className="active:shadow-sm transition-shadow bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-mono text-[11px]">{lastCompleted.visit_number}</span>
                  </div>
                  {lastCompleted.properties && (
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {(lastCompleted.properties as any).property_name}
                    </p>
                  )}
                </div>
                <StatusBadge status="Completed" showIcon={false} />
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* No visits state */}
      {!highlightVisit && !lastCompleted && (
        <Card>
          <CardContent className="py-10 text-center space-y-1">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No visits today</p>
            <p className="text-xs text-muted-foreground">Check the schedule for upcoming work.</p>
          </CardContent>
        </Card>
      )}

      {/* Remaining visits list */}
      {todayVisits.length > 1 && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-foreground">All Today</h2>
          {todayVisits
            .filter(v => v.id !== highlightVisit?.id && v.id !== lastCompleted?.id)
            .map((visit: any) => (
              <Link key={visit.id} to={`/worker/visit/${visit.id}`}>
                <Card className="active:shadow-sm transition-shadow">
                  <CardContent className="py-2.5 px-4 flex items-center justify-between gap-3">
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

      {/* Weather */}
      <WeatherCard city="regina" compact />

      {/* Location & Route card */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Location & Route</h2>
        <WorkerLocationCard nextVisit={nextVisitLocation} />
      </div>

      <WorkerFAB />
    </div>
  );
}
