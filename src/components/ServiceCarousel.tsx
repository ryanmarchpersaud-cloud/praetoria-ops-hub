import { useState, useRef, useEffect, useCallback } from 'react';
import { SERVICE_PROMOS, type ServicePromo } from '@/lib/servicePromos';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, FileText, Briefcase, ClipboardList, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

/** Map promo id → database service_category enum value (matches SERVICE_CATEGORIES in src/lib/constants.ts) */
const PROMO_TO_CATEGORY: Record<string, string> = {
  'snow-ice': 'Snow & Ice',
  'maintenance-repairs': 'Maintenance & Repairs',
  'landscaping': 'Property Care & Landscaping',
  'property-management': 'Property Management',
  'electrical': 'Electrical',
  'plumbing': 'Plumbing',
  'carpentry-renovations': 'Carpentry & Renovations',
  'roofing-exteriors': 'Roofing & Exteriors',
  'painting-finishing': 'Painting & Finishing',
  'cleaning': 'Cleaning Services',
  'hvac': 'Heating, Ventilation & Air Conditioning',
  'concrete-masonry': 'Concrete & Masonry',
  'security-smart-home': 'Security & Smart Home',
  'fencing-decking': 'Fencing & Decking',
  'junk-removal': 'Junk Removal',
  'power-washing': 'Power Washing',
  'tiling-flooring': 'Tiling & Flooring',
  'gutter-cleaning': 'Gutter Cleaning & Repair',
  'window-cleaning': 'Window Cleaning',
  'pest-control': 'Pest Control',
  'moving-hauling': 'Moving & Hauling',
  'insulation-drywall': 'Insulation & Drywall',
  'appliance-repair': 'Appliance Install & Repair',
  'garage-doors': 'Garage Doors',
  'locksmith': 'Locksmith Services',
  'other': 'Other',
};

function buildActions(promoId: string) {
  const cat = PROMO_TO_CATEGORY[promoId] || 'Other';
  const catParam = encodeURIComponent(cat);
  return [
    { label: 'New Lead', icon: Plus, path: `/leads?new=1&service_type=${catParam}`, description: 'Capture a new lead for this service' },
    { label: 'Create Quote', icon: FileText, path: `/quotes?new=1&service_category=${catParam}`, description: 'Draft a quote for this service' },
    { label: 'Create Job', icon: Briefcase, path: `/jobs?new=1&service_category=${catParam}`, description: 'Set up a new job' },
    { label: 'View Leads', icon: Eye, path: `/leads?filter=${catParam}`, description: 'Browse existing leads' },
    { label: 'View Jobs', icon: ClipboardList, path: `/jobs?filter=${catParam}`, description: 'Browse active jobs' },
  ];
}

function ServiceChip({ promo, onClick }: { promo: ServicePromo; onClick: () => void }) {
  const Icon = promo.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 w-[140px] rounded-xl border border-border/50 p-3 text-left transition-all',
        'hover:shadow-md active:scale-[0.97]',
        promo.accentClass
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', promo.accentClass)}>
        <Icon className={cn('w-4 h-4', promo.iconColorClass)} />
      </div>
      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{promo.title}</p>
      <div className="flex items-center gap-0.5 mt-1.5">
        <span className="text-[10px] text-muted-foreground">Actions</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </div>
    </button>
  );
}

export function ServiceCarousel() {
  const [selected, setSelected] = useState<ServicePromo | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const actions = selected ? buildActions(selected.id) : [];

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 300);
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // Mouse wheel: convert vertical scroll into horizontal scroll while hovering the row
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Services <span className="text-muted-foreground font-medium">· All {SERVICE_PROMOS.length}</span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Scroll services left"
              onClick={() => scrollBy('left')}
              disabled={!canLeft}
              className={cn(
                'h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center transition-all',
                'hover:bg-muted active:scale-95',
                !canLeft && 'opacity-40 cursor-not-allowed',
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll services right"
              onClick={() => scrollBy('right')}
              disabled={!canRight}
              className={cn(
                'h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center transition-all',
                'hover:bg-muted active:scale-95',
                !canRight && 'opacity-40 cursor-not-allowed',
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          {/* Left fade */}
          <div
            className={cn(
              'pointer-events-none absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-background to-transparent z-10 transition-opacity',
              canLeft ? 'opacity-100' : 'opacity-0',
            )}
          />
          {/* Right fade */}
          <div
            className={cn(
              'pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent z-10 transition-opacity',
              canRight ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            ref={scrollRef}
            onWheel={onWheel}
            className="flex gap-2.5 pb-2 overflow-x-auto scrollbar-hide scroll-smooth"
          >
            {SERVICE_PROMOS.map((promo) => (
              <ServiceChip key={promo.id} promo={promo} onClick={() => setSelected(promo)} />
            ))}
          </div>
        </div>
      </div>

      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent>
          {selected && (
            <>
              <DrawerHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', selected.accentClass)}>
                    <selected.icon className={cn('w-5 h-5', selected.iconColorClass)} />
                  </div>
                  <div>
                    <DrawerTitle className="text-base">{selected.title}</DrawerTitle>
                    <DrawerDescription className="text-xs">{selected.subtitle}</DrawerDescription>
                  </div>
                </div>
              </DrawerHeader>

              <div className="px-4 pb-2">
                <p className="text-[11px] font-medium text-muted-foreground mb-2">{selected.audience}</p>
                <ul className="space-y-1 mb-4">
                  {selected.highlights.slice(0, 4).map((h) => (
                    <li key={h} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className={cn('mt-1 w-1.5 h-1.5 rounded-full shrink-0', selected.iconColorClass.replace('text-', 'bg-'))} />
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="grid grid-cols-2 gap-2">
                  {actions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 h-auto py-2.5 px-3 text-left"
                      onClick={() => {
                        setSelected(null);
                        navigate(action.path);
                      }}
                    >
                      <action.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="px-4 pb-4 pt-2">
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                    Close
                  </Button>
                </DrawerClose>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
