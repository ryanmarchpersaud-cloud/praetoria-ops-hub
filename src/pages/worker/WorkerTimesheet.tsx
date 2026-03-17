import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { WorkerFAB } from '@/components/worker/WorkerFAB';
import { useTimesheets, useActiveTimesheet, useClockIn, useClockOut } from '@/hooks/useTimesheets';
import {
  Clock, ChevronLeft, ChevronRight, LogIn, LogOut, Calendar,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, addDays, differenceInSeconds, differenceInMinutes } from 'date-fns';

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

export default function WorkerTimesheet() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [now, setNow] = useState(new Date());

  // Live timer tick
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const weekStart = useMemo(() => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset), [weekOffset]);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const { data: active } = useActiveTimesheet();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const { data: entries = [], isLoading } = useTimesheets({
    from: format(weekStart, "yyyy-MM-dd'T'00:00:00"),
    to: format(weekEnd, "yyyy-MM-dd'T'23:59:59"),
  });

  // Group by day
  const byDay = useMemo(() => {
    const map = new Map<string, typeof entries>();
    days.forEach(d => map.set(format(d, 'yyyy-MM-dd'), []));
    entries.forEach((e: any) => {
      const key = format(new Date(e.clock_in), 'yyyy-MM-dd');
      const arr = map.get(key);
      if (arr) arr.push(e);
    });
    return map;
  }, [entries, days]);

  // Weekly total
  const weeklySeconds = useMemo(() => {
    return entries.reduce((sum: number, e: any) => {
      const end = e.clock_out ? new Date(e.clock_out) : now;
      return sum + differenceInSeconds(end, new Date(e.clock_in));
    }, 0);
  }, [entries, now]);

  const handleClock = () => {
    if (active) {
      clockOut.mutate(active.id);
    } else {
      clockIn.mutate();
    }
  };

  const activeSeconds = active ? differenceInSeconds(now, new Date(active.clock_in)) : 0;

  return (
    <div className="px-4 pt-3 pb-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Timesheet
        </h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(o => o - 1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={cn(
              'text-xs font-medium px-3 py-1.5 rounded-full transition-colors',
              weekOffset === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            {weekOffset === 0 ? 'This Week' : format(weekStart, 'MMM d')}
          </button>
          <button onClick={() => setWeekOffset(o => o + 1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted active:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Clock In/Out */}
      <button
        onClick={handleClock}
        disabled={clockIn.isPending || clockOut.isPending}
        className={cn(
          'w-full rounded-xl py-4 px-5 flex items-center justify-between transition-all active:scale-[0.98] shadow-sm disabled:opacity-70',
          active
            ? 'bg-emerald-50 border-2 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
            : 'bg-primary text-primary-foreground'
        )}
      >
        <div className="flex items-center gap-3">
          {active ? <LogOut className="h-6 w-6 text-emerald-600 dark:text-emerald-400" /> : <LogIn className="h-6 w-6" />}
          <div className="text-left">
            <p className={cn('text-sm font-bold', active ? 'text-emerald-700 dark:text-emerald-300' : '')}>
              {active ? 'Clock Out' : 'Clock In'}
            </p>
            {active && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                Since {formatTime(active.clock_in)} · {formatDuration(activeSeconds)}
              </p>
            )}
            {!active && <p className="text-[11px] opacity-80">Start your shift</p>}
          </div>
        </div>
        <Timer className={cn('h-5 w-5', active ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-70')} />
      </button>

      {/* Weekly summary */}
      <Card className="bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/40">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Weekly Total</p>
            <p className="text-2xl font-bold text-foreground">{formatDuration(weeklySeconds)}</p>
            <p className="text-[10px] text-muted-foreground">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
            </p>
          </div>
          <Calendar className="h-8 w-8 text-blue-200 dark:text-blue-800" />
        </CardContent>
      </Card>

      {/* Day-by-day breakdown */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const dayEntries = byDay.get(key) || [];
            const isToday = format(new Date(), 'yyyy-MM-dd') === key;
            const daySeconds = dayEntries.reduce((sum: number, e: any) => {
              const end = e.clock_out ? new Date(e.clock_out) : now;
              return sum + differenceInSeconds(end, new Date(e.clock_in));
            }, 0);

            return (
              <Card key={key} className={cn(isToday && 'ring-1 ring-primary/20')}>
                <CardContent className="p-3 space-y-2">
                  {/* Day header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex flex-col items-center justify-center shrink-0',
                        isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        <span className="text-[8px] font-semibold uppercase leading-none">{format(day, 'EEE')}</span>
                        <span className={cn('text-xs font-bold leading-none', !isToday && 'text-foreground')}>{format(day, 'd')}</span>
                      </div>
                      <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-foreground')}>
                        {isToday ? 'Today' : format(day, 'EEEE')}
                      </span>
                    </div>
                    <span className={cn(
                      'text-sm font-bold font-mono',
                      daySeconds > 0 ? 'text-foreground' : 'text-muted-foreground/40'
                    )}>
                      {daySeconds > 0 ? formatDuration(daySeconds) : '—'}
                    </span>
                  </div>

                  {/* Entries */}
                  {dayEntries.length > 0 && (
                    <div className="space-y-1 ml-10">
                      {dayEntries.map((entry: any) => {
                        const dur = differenceInMinutes(
                          entry.clock_out ? new Date(entry.clock_out) : now,
                          new Date(entry.clock_in)
                        );
                        return (
                          <div key={entry.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <div className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                entry.clock_out ? 'bg-emerald-500' : 'bg-primary animate-pulse'
                              )} />
                              <span>{formatTime(entry.clock_in)}</span>
                              <span>–</span>
                              <span>{entry.clock_out ? formatTime(entry.clock_out) : 'now'}</span>
                            </div>
                            <span className="font-mono text-[10px]">
                              {Math.floor(dur / 60)}h {(dur % 60).toString().padStart(2, '0')}m
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
