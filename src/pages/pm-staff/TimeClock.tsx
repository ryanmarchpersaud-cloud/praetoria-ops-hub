import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useActiveTimesheet, useClockIn, useClockOut } from '@/hooks/useTimesheets';
import { Clock, PlayCircle, StopCircle } from 'lucide-react';
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

export default function PMStaffTimeClockPage() {
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
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">Time Clock</h2>
      </div>

      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Current session</p>
          <p className="text-5xl font-mono font-bold text-emerald-700">{elapsed}</p>
          {active ? (
            <p className="text-xs text-muted-foreground">Started {format(new Date(active.clock_in), 'PPp')}</p>
          ) : (
            <p className="text-xs text-muted-foreground">You are not clocked in.</p>
          )}
          {!isLoading && (
            active ? (
              <Button size="lg" variant="destructive" className="w-full" onClick={onClockOut} disabled={clockOut.isPending}>
                <StopCircle className="h-5 w-5 mr-2" /> Clock Out
              </Button>
            ) : (
              <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={onClockIn} disabled={clockIn.isPending}>
                <PlayCircle className="h-5 w-5 mr-2" /> Clock In
              </Button>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">About your time</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>Your time entries are private — only you and authorized HR/admins can see them.</p>
          <p>View your full history under <span className="font-medium">My Timesheets</span>.</p>
        </CardContent>
      </Card>
    </div>
  );
}
