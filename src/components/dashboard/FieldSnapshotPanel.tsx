import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio, PauseCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useFieldSnapshot } from '@/hooks/useDashboardInsights';
import { Link } from 'react-router-dom';

export function FieldSnapshotPanel() {
  const { data, isLoading } = useFieldSnapshot();

  const stats = [
    { label: 'Clocked in', value: data?.clockedIn.length ?? 0, className: 'text-emerald-600' },
    { label: 'In progress', value: data?.inProgress ?? 0, className: 'text-blue-600' },
    { label: 'Planned', value: data?.planned ?? 0, className: 'text-slate-600' },
    { label: 'Completed', value: data?.completed ?? 0, className: 'text-emerald-700' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2 px-3 md:px-6 pt-3 md:pt-6">
        <CardTitle className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 flex items-center justify-center">
            <Radio className="h-4 w-4 text-cyan-600" />
          </span>
          Today in the Field
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 md:px-6 pb-3 md:pb-6 space-y-3">
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2">
              {stats.map(s => (
                <div key={s.label} className="rounded-lg border border-border p-2 text-center">
                  <p className={`text-xl font-extrabold tabular-nums leading-none ${s.className}`}>{s.value}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {(data?.clockedIn.length ?? 0) > 0 && (
              <div className="space-y-1">
                {data!.clockedIn.slice(0, 5).map(w => (
                  <div key={w.user_id} className="flex items-center justify-between text-[11px]">
                    <span className="font-medium truncate">{w.full_name}</span>
                    <span className="text-muted-foreground shrink-0">
                      since {formatDistanceToNow(new Date(w.clock_in), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(data?.longPauses.length ?? 0) > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/40 p-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  <PauseCircle className="h-3.5 w-3.5" />
                  Long-running pauses
                </div>
                {data!.longPauses.slice(0, 4).map(p => (
                  <Link
                    key={p.id}
                    to={`/visits/${p.visit_id}`}
                    className="flex items-center justify-between text-[11px] hover:underline"
                  >
                    <span className="truncate">{p.reason || 'Paused'}</span>
                    <span className="font-semibold tabular-nums shrink-0">{p.minutes} min</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
