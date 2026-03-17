import { cn } from '@/lib/utils';
import type { ServicePromo } from '@/lib/servicePromos';

interface ServicePromoCardProps {
  promo: ServicePromo;
  variant?: 'compact' | 'full';
  className?: string;
}

export function ServicePromoCard({ promo, variant = 'full', className }: ServicePromoCardProps) {
  const Icon = promo.icon;

  if (variant === 'compact') {
    return (
      <div className={cn('rounded-lg border border-border/60 p-4 hover:shadow-sm transition-shadow', promo.accentClass, className)}>
        <div className="flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', promo.accentClass)}>
            <Icon className={cn('w-4.5 h-4.5', promo.iconColorClass)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{promo.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{promo.audience}</p>
          </div>
        </div>
        <ul className="mt-3 space-y-1">
          {promo.highlights.slice(0, 3).map((h) => (
            <li key={h} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className={cn('mt-1 w-1 h-1 rounded-full shrink-0', promo.iconColorClass.replace('text-', 'bg-'))} />
              {h}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 p-5 hover:shadow-md transition-shadow', promo.accentClass, className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', promo.accentClass)}>
          <Icon className={cn('w-5 h-5', promo.iconColorClass)} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground leading-tight">{promo.title}</h3>
          <p className="text-xs text-muted-foreground">{promo.subtitle}</p>
        </div>
      </div>
      <p className="text-[11px] font-medium text-primary/80 mb-2.5">{promo.audience}</p>
      <ul className="space-y-1.5">
        {promo.highlights.map((h) => (
          <li key={h} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', promo.iconColorClass.replace('text-', 'bg-'))} />
            {h}
          </li>
        ))}
      </ul>
    </div>
  );
}
