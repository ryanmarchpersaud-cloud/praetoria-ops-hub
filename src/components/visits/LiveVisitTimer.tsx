import { useEffect, useState } from 'react';
import { Clock, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTzTime, formatDurationMinutes } from '@/lib/timezone';
import { sumPausedSeconds, findOpenPause, type VisitPause } from '@/hooks/useVisitPauses';

interface LiveVisitTimerProps {
  arrivalTime: string | null | undefined;
  completionTime?: string | null | undefined;
  /** Visual prominence — "hero" is the big card workers see on-site. */
  variant?: 'hero' | 'inline';
  className?: string;
  /** Optional pause log — when supplied, net worked time excludes pauses. */
  pauses?: VisitPause[];
}

/**
 * Prominent on-site timer for workers and admins. Ticks every second while
 * the visit is in progress, then locks to the final duration once completed.
 * Always displays Regina (Saskatchewan) local time.
 *
 * When `pauses` is provided the header switches to Paused when an open pause
 * exists and stops advancing the net worked-time display. The visit's
 * arrival_time / completion_time are never mutated — pauses are a display
 * overlay on top of the gross visit interval.
 */
export function LiveVisitTimer({
  arrivalTime,
  completionTime,
  variant = 'hero',
  className,
  pauses,
}: LiveVisitTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const isRunning = !!arrivalTime && !completionTime;
  const openPause = pauses ? findOpenPause(pauses) : null;
  const isPaused = !!openPause;

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  if (!arrivalTime) return null;

  const startMs = new Date(arrivalTime).getTime();
  const endMs = completionTime ? new Date(completionTime).getTime() : now;
  const grossSec = Math.max(0, Math.floor((endMs - startMs) / 1000));

  const pausedSec = pauses ? sumPausedSeconds(pauses, endMs) : 0;
  const netSec = Math.max(0, grossSec - pausedSec);

  const displaySec = pauses ? netSec : grossSec;
  const clock = fmtClock(displaySec);

  const currentPauseSec = openPause
    ? Math.max(0, Math.floor((now - new Date(openPause.started_at).getTime()) / 1000))
    : 0;

  const stateAccent = isPaused
    ? 'text-amber-600 dark:text-amber-400'
    : isRunning
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-muted-foreground';

  const border = isPaused
    ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
    : isRunning
    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
    : 'border-border bg-muted/40';

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium',
          stateAccent,
          className,
        )}
      >
        {isPaused ? (
          <PauseCircle className="h-3.5 w-3.5" />
        ) : (
          <Clock className={cn('h-3.5 w-3.5', isRunning && 'animate-pulse')} />
        )}
        <span className="tabular-nums">{clock}</span>
        {isPaused && <span className="text-amber-700 dark:text-amber-400">(paused)</span>}
        {!isRunning && !isPaused && <span className="text-muted-foreground">(final)</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 flex items-center justify-between gap-3',
        border,
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            'h-9 w-9 rounded-full flex items-center justify-center shrink-0',
            isPaused ? 'bg-amber-500/15' : isRunning ? 'bg-emerald-500/15' : 'bg-muted',
          )}
        >
          {isPaused ? (
            <PauseCircle className={cn('h-4 w-4', stateAccent)} />
          ) : (
            <Clock className={cn('h-4 w-4', stateAccent, isRunning && 'animate-pulse')} />
          )}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider',
              stateAccent,
            )}
          >
            {isPaused
              ? `Paused — ${openPause?.reason ?? ''}`
              : isRunning
              ? 'On Site — Timer Running'
              : 'Time On Property'}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            Arrived {formatTzTime(arrivalTime)}
            {completionTime && ` · Finished ${formatTzTime(completionTime)}`}
          </p>
          {isPaused && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 truncate">
              Pause {fmtClock(currentPauseSec)}
              {openPause?.note ? ` · ${openPause.note}` : ''}
            </p>
          )}
          {!isPaused && pauses && pausedSec > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Total paused {fmtClock(pausedSec)}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className={cn('text-xl font-bold tabular-nums leading-none', stateAccent)}>
          {clock}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatDurationMinutes(Math.floor(displaySec / 60))}
          {pauses && !completionTime ? ' net' : ''}
        </p>
      </div>
    </div>
  );
}

function fmtClock(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
