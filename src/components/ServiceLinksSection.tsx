import { useState } from 'react';
import { ExternalLink, Snowflake, TreePine, Trash2, Wrench, Building, Droplets, SprayCan, HardHat, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CleaningPartnerDialog } from '@/components/CleaningPartnerDialog';
import { ConstructionPartnerDialog } from '@/components/ConstructionPartnerDialog';

const activeServices = [
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
];

const partnerServices = [
  {
    name: 'Cleaning Services',
    label: 'Available Through Trusted Partner',
    icon: SprayCan,
    color: 'text-rose-500',
    partnerId: 'cleaning' as const,
  },
  {
    name: 'Construction & Renovations',
    label: 'Available Through Trusted Partner',
    icon: HardHat,
    color: 'text-amber-500',
    partnerId: 'construction' as const,
  },
];

const comingSoonServices = [
  {
    name: 'Power Washing',
    url: 'https://powerwashing.praetoriagroup.ca',
    label: 'Driveways • Decks • Building exteriors',
    icon: Droplets,
    color: 'text-cyan-500',
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
  const [cleaningOpen, setCleaningOpen] = useState(false);
  const [constructionOpen, setConstructionOpen] = useState(false);

  const openPartner = (partnerId: typeof partnerServices[0]['partnerId']) => {
    if (partnerId === 'cleaning') setCleaningOpen(true);
    else if (partnerId === 'construction') setConstructionOpen(true);
  };

  const partnerChip = (s: typeof partnerServices[0], className: string, inner: React.ReactNode) => (
    <button
      key={s.name}
      onClick={() => openPartner(s.partnerId)}
      className={className}
    >
      {inner}
    </button>
  );

  if (variant === 'compact') {
    return (
      <div className="border-t border-border pt-3 mt-4 px-4 pb-2">
        <CleaningPartnerDialog open={cleaningOpen} onOpenChange={setCleaningOpen} />
        <ConstructionPartnerDialog open={constructionOpen} onOpenChange={setConstructionOpen} />
        <div className="flex flex-wrap gap-1.5">
          {activeServices.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card transition-colors group hover:bg-muted"
            >
              <s.icon className={cn('h-3 w-3 shrink-0', s.color)} />
              <span className="text-[10px] font-medium text-foreground">{s.name}</span>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
          {partnerServices.map((s) => partnerChip(
            s,
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card transition-colors group hover:bg-muted cursor-pointer',
            <>
              <s.icon className={cn('h-3 w-3 shrink-0', s.color)} />
              <span className="text-[10px] font-medium text-foreground">{s.name}</span>
              <Handshake className="h-5 w-5 text-emerald-500 shrink-0" />
            </>
          ))}
        </div>
        <p className="text-[10px] font-medium text-muted-foreground mt-3 mb-1.5 uppercase tracking-wider">Site Coming Soon</p>
        <div className="flex flex-wrap gap-1.5">
          {comingSoonServices.map((s) => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card opacity-75 cursor-default"
            >
              <s.icon className={cn('h-3 w-3 shrink-0', s.color)} />
              <span className="text-[10px] font-medium text-foreground">{s.name}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="space-y-1">
        <CleaningPartnerDialog open={cleaningOpen} onOpenChange={setCleaningOpen} />
        <ConstructionPartnerDialog open={constructionOpen} onOpenChange={setConstructionOpen} />
        <div className="space-y-0.5">
          {activeServices.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/70 transition-colors group hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <s.icon className={cn('h-3.5 w-3.5 shrink-0', s.color)} />
              <span className="truncate">{s.name}</span>
              <ExternalLink className="h-2.5 w-2.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
            </a>
          ))}
          {partnerServices.map((s) => (
            <button
              key={s.name}
              onClick={() => openPartner(s.partnerId)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/70 transition-colors group hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full text-left"
            >
              <s.icon className={cn('h-3.5 w-3.5 shrink-0', s.color)} />
              <span className="truncate">{s.name}</span>
              <Handshake className="h-5 w-5 ml-auto text-emerald-500 shrink-0" />
            </button>
          ))}
        </div>
        <p className="text-[10px] font-medium text-sidebar-foreground/40 px-2 pt-2 uppercase tracking-wider">Site Coming Soon</p>
        <div className="space-y-0.5">
          {comingSoonServices.map((s) => (
            <span
              key={s.name}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/50 opacity-75 cursor-default"
            >
              <s.icon className={cn('h-3.5 w-3.5 shrink-0', s.color)} />
              <span className="truncate">{s.name}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'portal') {
    return (
      <div className="border-t border-border pt-4 mt-4">
        <CleaningPartnerDialog open={cleaningOpen} onOpenChange={setCleaningOpen} />
        <ConstructionPartnerDialog open={constructionOpen} onOpenChange={setConstructionOpen} />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {activeServices.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border bg-card transition-colors text-center group relative hover:bg-muted"
            >
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-[10px] font-medium text-foreground leading-tight">{s.name}</span>
              <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
          {partnerServices.map((s) => (
            <button
              key={s.name}
              onClick={() => openPartner(s.partnerId)}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border bg-card transition-colors text-center group relative hover:bg-muted"
            >
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-[10px] font-medium text-foreground leading-tight">{s.name}</span>
              <span className="text-[8px] text-muted-foreground">Trusted Partner</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] font-medium text-muted-foreground mt-3 mb-1.5 px-1 uppercase tracking-wider">Site Coming Soon</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {comingSoonServices.map((s) => (
            <span
              key={s.name}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-dashed border-border bg-card/50 text-center opacity-80 cursor-default"
            >
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-[10px] font-medium text-foreground leading-tight">{s.name}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Login variant
  return (
    <div className="mt-6">
      <CleaningPartnerDialog open={cleaningOpen} onOpenChange={setCleaningOpen} />
      <ConstructionPartnerDialog open={constructionOpen} onOpenChange={setConstructionOpen} />
      <p className="text-xs font-medium text-muted-foreground mb-3 text-center tracking-wide uppercase">
        Explore Our Services
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {activeServices.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card transition-colors group hover:bg-muted"
          >
            <s.icon className={cn('h-4 w-4 shrink-0', s.color)} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground leading-tight truncate">{s.name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">{s.label}</p>
            </div>
            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        ))}
        {partnerServices.map((s) => (
          <button
            key={s.name}
            onClick={() => openPartner(s.partnerId)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card transition-colors group hover:bg-muted text-left"
          >
            <s.icon className={cn('h-4 w-4 shrink-0', s.color)} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground leading-tight truncate">{s.name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">{s.label}</p>
            </div>
            <Handshake className="h-6 w-6 ml-auto text-emerald-500 shrink-0" />
          </button>
        ))}
      </div>
      <p className="text-[10px] font-medium text-muted-foreground mt-4 mb-2 text-center tracking-wide uppercase">
        Site Coming Soon
      </p>
      <div className="grid grid-cols-2 gap-2">
        {comingSoonServices.map((s) => (
          <span
            key={s.name}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border bg-card/50 opacity-80 cursor-default"
          >
            <s.icon className={cn('h-4 w-4 shrink-0', s.color)} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground leading-tight truncate">{s.name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight truncate">{s.label}</p>
            </div>
          </span>
        ))}
      </div>
    </div>
  );
}