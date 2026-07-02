import { getPropertyUsage } from '@/lib/propertyUsage';
import { cn } from '@/lib/utils';

interface Props {
  usage?: string | null;
  /** icon-only mini pill (list rows) */
  compact?: boolean;
  className?: string;
}

export function PropertyUsageBadge({ usage, compact, className }: Props) {
  const meta = getPropertyUsage(usage);
  if (!meta) return null;
  const Icon = meta.icon;
  if (compact) {
    return (
      <span
        title={meta.label}
        className={cn(
          'inline-flex items-center justify-center h-5 w-5 rounded-full border shrink-0',
          meta.badgeClass,
          className,
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        meta.badgeClass,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {meta.short}
    </span>
  );
}
