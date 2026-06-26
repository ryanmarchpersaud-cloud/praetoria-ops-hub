import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTzTime, formatDurationMinutes } from '@/lib/timezone';

interface LiveVisitTimerProps {
  arrivalTime: string | null | undefined;
  completionTime?: string | null | undefined;
  /** Visual prominence — "hero" is the big card workers see on-site. */
  variant?: 'hero' | 'inline';
  className?: string;
}

/**
 * Prominent on-site timer for workers and admins. Ticks every second while
 * the visit is in progress, then locks to the final duration once completed.
 * Always displays Regina (Saskatchewan) local time.
 */
export function LiveVisitTimer({ arrivalTime, completionTime, variant = 'hero', className }: LiveVisitTimerProps) {
  const [now, setNow] = useState(() => Date.now());
  const isRunning = !!arrivalTime && !completionTime;

  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isRunning]);

  if (!arrivalTime) return null;

  const startMs = new Date(arrivalTime).getTime();
  const endMs = completionTime ? new Date(completionTime).getTime() : now;
  const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const clock = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-xs font-medium', isRunning ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground', className)}>
        <Clock className={cn('h-3.5 w-3.5', isRunning && 'animate-pulse')} />
        <span className="tabular-nums">{clock}</span>
        {!isRunning && <span className="text-muted-foreground">(final)</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 flex items-center justify-between gap-3',
        isRunning
          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
          : 'border-border bg-muted/40',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', isRunning ? 'bg-emerald-500/15' : 'bg-muted')}>
          <Clock className={cn('h-4 w-4', isRunning ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground', isRunning && 'animate-pulse')} />
        </div>
        <div className="min-w-0">
          <p className={cn('text-[10px] font-semibold uppercase tracking-wider', isRunning ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground')}>
            {isRunning ? 'On Site — Timer Running' : 'Time On Property'}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            Arrived {formatTzTime(arrivalTime)}
            {completionTime && ` · Finished ${formatTzTime(completionTime)}`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn('text-xl font-bold tabular-nums leading-none', isRunning && 'text-emerald-600 dark:text-emerald-400')}>{clock}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{formatDurationMinutes(Math.floor(totalSec / 60))}</p>
      </div>
    </div>
  );
}
