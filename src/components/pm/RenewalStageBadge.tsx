import { Badge } from '@/components/ui/badge';
import { getRenewalStageMeta, type RenewalStageTone } from '@/lib/statusLabel';
import { cn } from '@/lib/utils';

/**
 * Read-only stage badge for lease renewals.
 * Shared by Tenant and Owner portals. Does not affect admin workflow.
 */

const TONE_CLASSES: Record<RenewalStageTone, string> = {
  slate: 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100',
  amber: 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100',
  blue: 'bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-100',
  emerald: 'bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-100',
  rose: 'bg-rose-100 text-rose-900 border-rose-200 hover:bg-rose-100',
  violet: 'bg-violet-100 text-violet-900 border-violet-200 hover:bg-violet-100',
};

interface Props {
  status?: string | null;
  audience?: 'tenant' | 'owner';
  className?: string;
}

export function RenewalStageBadge({ status, audience = 'tenant', className }: Props) {
  const meta = getRenewalStageMeta(status);
  const label = audience === 'owner' ? meta.ownerLabel : meta.tenantLabel;
  return (
    <Badge
      variant="outline"
      className={cn('font-medium border', TONE_CLASSES[meta.tone], className)}
    >
      {label}
    </Badge>
  );
}
