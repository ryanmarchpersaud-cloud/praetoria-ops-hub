import { ExternalLink, Snowflake, TreePine, Trash2, Wrench, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

const serviceLinks = [
  {
    name: 'Snow & Ice',
    url: 'https://praetoriasnowandice.ca',
    label: 'Snow removal • De-icing • Winter services',
    icon: Snowflake,
    color: 'text-sky-500',
  },
  {
    name: 'Landscaping & Grounds',
    url: 'https://landscaping.praetoriagroup.ca',
    label: 'Weekly lawn care • Clean-ups • Spring/Summer',
    icon: TreePine,
    color: 'text-emerald-500',
  },
  {
    name: 'Junk Removal',
    url: 'https://junk.praetoriagroup.ca',
    label: 'Full-service junk removal • Haul-away',
    icon: Trash2,
    color: 'text-amber-500',
  },
  {
    name: 'Property Maintenance',
    url: 'https://maintenance.praetoriagroup.ca',
    label: 'Repairs • Handyman • Property care',
    icon: Wrench,
    color: 'text-orange-500',
  },
  {
    name: 'Property Management',
    url: 'https://management.praetoriagroup.ca',
    label: 'Full-service property management',
    icon: Building,
    color: 'text-violet-500',
  },
];

interface ServiceLinksSectionProps {
  variant?: 'login' | 'sidebar' | 'portal' | 'compact';
}

export function ServiceLinksSection({ variant = 'login' }: ServiceLinksSectionProps) {
  if (variant === 'compact') {
    return (
      <div className="border-t border-border pt-3 mt-4 px-4 pb-2">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Explore Our Services</p>
        <div className="flex flex-wrap gap-1.5">
          {serviceLinks.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted transition-colors group"
            >
              <s.icon className={cn('h-3 w-3 shrink-0', s.color)} />
              <span className="text-[10px] font-medium text-foreground">{s.name}</span>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </div>
    );
  }
  if (variant === 'sidebar') {
    return (
      <div className="space-y-0.5">
        {serviceLinks.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors group"
          >
            <s.icon className={cn('h-3.5 w-3.5 shrink-0', s.color)} />
            <span className="truncate">{s.name}</span>
            <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
          </a>
        ))}
      </div>
    );
  }

  if (variant === 'portal') {
    return (
      <div className="border-t border-border pt-4 mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Our Services</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {serviceLinks.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-center group"
            >
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-[10px] font-medium text-foreground leading-tight">{s.name}</span>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  // Login variant
  return (
    <div className="mt-6">
      <p className="text-xs font-medium text-muted-foreground mb-3 text-center tracking-wide uppercase">
        Explore Our Services
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {serviceLinks.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors group"
          >
            <s.icon className={cn('h-4 w-4 shrink-0', s.color)} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground leading-tight truncate">{s.name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">{s.label}</p>
            </div>
            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
