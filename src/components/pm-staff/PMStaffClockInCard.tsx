import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Clock, PlayCircle, StopCircle, CalendarClock } from 'lucide-react';
import { useActiveTimesheet, useClockIn, useClockOut } from '@/hooks/useTimesheets';
import { toast } from 'sonner';
import { format } from 'date-fns';

function useElapsed(startIso?: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startIso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startIso]);
  if (!startIso) return '00:00:00';
  const s = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

/** Compact Clock-In / Clock-Out card for the PM Staff home dashboard.
 *  Reuses the existing timesheet hooks — does not duplicate logic. */
export function PMStaffClockInCard() {
  const { data: active, isLoading } = useActiveTimesheet();
  const clockIn = useClockIn('pm_staff');
  const clockOut = useClockOut();
  const elapsed = useElapsed(active?.clock_in);

  const onClockIn = async () => {
    try { await clockIn.mutateAsync(); toast.success('Clocked in'); }
    catch (e: any) { toast.error(e?.message ?? 'Failed to clock in'); }
  };
  const onClockOut = async () => {
    if (!active) return;
    try { await clockOut.mutateAsync(active.id); toast.success('Clocked out'); }
    catch (e: any) { toast.error(e?.message ?? 'Failed to clock out'); }
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50/60">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-emerald-800 font-semibold">
            {active ? 'On the clock' : 'Time clock'}
          </p>
          <p className="text-xl font-mono font-bold text-emerald-800 leading-tight">{elapsed}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {active
              ? `Since ${format(new Date(active.clock_in), 'h:mm a')}`
              : 'You are not clocked in.'}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {!isLoading && (active ? (
            <Button size="sm" variant="destructive" onClick={onClockOut} disabled={clockOut.isPending}>
              <StopCircle className="h-4 w-4 mr-1" /> Clock Out
            </Button>
          ) : (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onClockIn} disabled={clockIn.isPending}>
              <PlayCircle className="h-4 w-4 mr-1" /> Clock In
            </Button>
          ))}
          <Button asChild size="sm" variant="ghost" className="h-7 text-emerald-800 hover:bg-emerald-100">
            <Link to="/pm-staff/timesheets"><CalendarClock className="h-3.5 w-3.5 mr-1" />Timesheet</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
