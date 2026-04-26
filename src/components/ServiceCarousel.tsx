import { useState } from 'react';
import { SERVICE_PROMOS, type ServicePromo } from '@/lib/servicePromos';
import { cn } from '@/lib/utils';
import { ChevronRight, FileText, Briefcase, ClipboardList, Eye, Plus } from 'lucide-react';
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
  const navigate = useNavigate();

  const actions = selected ? buildActions(selected.id) : [];

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Services <span className="text-muted-foreground font-medium">· All {SERVICE_PROMOS.length}</span>
          </h2>
          <span className="text-[10px] text-muted-foreground hidden md:inline">Scroll →</span>
        </div>
        <div className="flex gap-2.5 pb-2 overflow-x-auto scrollbar-hide -mx-3 px-3">
          {SERVICE_PROMOS.map((promo) => (
            <ServiceChip key={promo.id} promo={promo} onClick={() => setSelected(promo)} />
          ))}
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
