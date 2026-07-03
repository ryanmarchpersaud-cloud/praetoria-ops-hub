import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, CheckCircle2, ChevronRight, LogOut, Loader2, Activity, AlertTriangle, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdminLiveWorkforce, usePMLiveWorkforce, useAdminForceClockOut } from '@/hooks/useTimesheets';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

type LiveWorkforcePanelProps = {
  /** 'all' = every clocked-in worker (main admin dashboard, default).
   *  'pm'  = filtered to Property Management staff only. */
  scope?: 'all' | 'pm';
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  /** Show the "Clock out" button on active sessions. Default true for scope='all'. */
  canForceClockOut?: boolean;
  /** Hide the labor cost block (e.g., for viewers without finance access). */
  showLaborCost?: boolean;
};

export function LiveWorkforcePanel({
  scope = 'all',
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'View all',
  canForceClockOut,
  showLaborCost = true,
}: LiveWorkforcePanelProps = {}) {
  const isPM = scope === 'pm';
  const adminQuery = useAdminLiveWorkforce();
  const pmQuery = usePMLiveWorkforce(isPM);
  const { data, isLoading } = isPM ? pmQuery : adminQuery;

  const forceOut = useAdminForceClockOut();
  const { toast } = useToast();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  const resolvedCanForceClockOut = canForceClockOut ?? true;
  const resolvedTitle = title ?? (isPM ? 'PM Live Workforce' : 'Live Workforce');
  const resolvedSubtitle = subtitle ?? (isPM ? "PM staff clocked in right now" : "Who's clocked in right now");
  const resolvedHref = viewAllHref ?? (isPM ? '/pm-staff/time-clock' : '/employees');

  const handleConfirm = async () => {
    if (!target) return;
    try {
      await forceOut.mutateAsync({ id: target.id, workerName: target.name });
      toast({ title: 'Worker clocked out', description: `${target.name} has been clocked out.` });
      setTarget(null);
    } catch (e: any) {
      toast({ title: 'Could not clock out', description: e?.message ?? 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/40">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
          </span>
          <div>
            <CardTitle className="text-base md:text-lg font-extrabold tracking-tight">{resolvedTitle}</CardTitle>
            <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5 font-medium">{resolvedSubtitle}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={resolvedHref}>
            {viewAllLabel} <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 p-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">On Clock</span>
            </div>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {isLoading ? '—' : data?.active_count ?? 0}
            </div>
          </div>
          <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/40 p-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Done Today</span>
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {isLoading ? '—' : data?.completed_today ?? 0}
            </div>
          </div>
          <div className="rounded-lg border bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/40 p-3">
            <div className="flex items-center gap-2 text-violet-700 dark:text-violet-400 mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Hours Today</span>
            </div>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">
              {isLoading ? '—' : (data?.total_today_hours ?? 0).toFixed(1)}
            </div>
          </div>
        </div>

        {/* Hours Today breakdown */}
        {!isLoading && data?.breakdown && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Hours Today — Breakdown
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                Total {(data.total_today_hours ?? 0).toFixed(1)}h
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 min-w-0">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">Completed today</span>
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wide border-blue-300 dark:border-blue-700 bg-blue-100/60 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200"
                  >
                    Done
                  </Badge>
                </div>
                <span className="font-mono font-semibold text-blue-900 dark:text-blue-100 shrink-0">
                  {data.breakdown.completed_today_hours.toFixed(1)}h
                  <span className="text-[10px] text-blue-700/70 dark:text-blue-300/70 ml-1">
                    ({data.breakdown.completed_today_count})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 px-2.5 py-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 min-w-0">
                  <Activity className="h-3 w-3 shrink-0" />
                  <span className="truncate">Active today</span>
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wide border-emerald-300 dark:border-emerald-700 bg-emerald-100/60 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200"
                  >
                    <span className="relative mr-1 flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </Badge>
                </div>
                <span className="font-mono font-semibold text-emerald-900 dark:text-emerald-100 shrink-0">
                  {data.breakdown.active_today_hours.toFixed(1)}h
                  <span className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70 ml-1">
                    ({data.breakdown.active_today_count})
                  </span>
                </span>
              </div>
            </div>
            {data.breakdown.carryover_count > 0 && (
              <div className="flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-2.5 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 min-w-0">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="truncate">Carryover from yesterday</span>
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 text-[9px] font-semibold uppercase tracking-wide border-amber-300 dark:border-amber-700 bg-amber-100/60 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                  >
                    Not in total
                  </Badge>
                </div>
                <span className="font-mono font-semibold text-amber-900 dark:text-amber-100 shrink-0">
                  {data.breakdown.carryover_hours.toFixed(1)}h
                  <span className="text-[10px] text-amber-700/70 dark:text-amber-300/70 ml-1">
                    ({data.breakdown.carryover_count})
                  </span>
                </span>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground leading-snug">
              Hours Today = Completed today + Active today. Carryover shifts started before midnight
              are tracked separately so totals stay accurate per day.
            </p>
          </div>
        )}

        {/* Labor cost today (Hours × hourly rate) */}
        {showLaborCost && !isLoading && data?.labor_cost && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Labor Cost Today
              </span>
              <span className="text-sm font-bold font-mono text-foreground">
                ${data.labor_cost.total_today.toFixed(2)}
              </span>
            </div>
            {data.labor_cost.per_worker.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No worked hours today.</p>
            ) : (
              <div className="space-y-1">
                {data.labor_cost.per_worker.map((w: any) => (
                  <div
                    key={w.user_id}
                    className="flex items-center justify-between text-xs rounded-md border bg-card px-2.5 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{w.full_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {w.hours.toFixed(2)}h × ${w.hourly_rate.toFixed(2)}/h
                        {w.hourly_rate <= 0 && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">
                            (no rate set)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-mono font-semibold shrink-0">
                      ${w.cost.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {data.labor_cost.workers_without_rate > 0 && (
              <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                {data.labor_cost.workers_without_rate} worker(s) have no hourly rate set — their cost shows as $0. Set it under HR → Compensation.
              </p>
            )}
            <p className="text-[10px] text-muted-foreground leading-snug">
              Cost = (Completed today + Active today) × worker's hourly rate. Carryover hours excluded.
            </p>
          </div>
        )}

        {/* Active sessions list */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Active Sessions
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
          ) : !data?.active_sessions.length ? (
            <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              No workers currently clocked in
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {data.active_sessions.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md border bg-card p-2.5 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{s.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Clocked in {formatDistanceToNow(new Date(s.clock_in), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {s.elapsed_hours.toFixed(1)}h
                    </Badge>
                    {resolvedCanForceClockOut && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setTarget({ id: s.id, name: s.full_name })}
                        title="Force clock out this worker"
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Clock out
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clock out {target?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close their open shift using the current time. A note will be added to the
              timesheet showing it was clocked out by an admin. They can adjust hours later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={forceOut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={forceOut.isPending}>
              {forceOut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Clocking out…
                </>
              ) : (
                'Yes, clock them out'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
