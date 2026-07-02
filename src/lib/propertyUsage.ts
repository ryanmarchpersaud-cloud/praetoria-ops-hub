import { Home, Building, Store, MapPin, type LucideIcon } from 'lucide-react';

export type PropertyUsage = 'private_residence' | 'rental' | 'commercial' | 'other';

export interface PropertyUsageMeta {
  value: PropertyUsage;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Tailwind classes for a small badge/pill */
  badgeClass: string;
  /** Tailwind classes for the icon alone */
  iconClass: string;
}

export const PROPERTY_USAGE_OPTIONS: PropertyUsageMeta[] = [
  {
    value: 'private_residence',
    label: 'Private residence',
    short: 'Private',
    icon: Home,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconClass: 'text-blue-600',
  },
  {
    value: 'rental',
    label: 'Rental property',
    short: 'Rental',
    icon: Building,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconClass: 'text-amber-600',
  },
  {
    value: 'commercial',
    label: 'Commercial',
    short: 'Commercial',
    icon: Store,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    iconClass: 'text-purple-600',
  },
  {
    value: 'other',
    label: 'Other',
    short: 'Other',
    icon: MapPin,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    iconClass: 'text-slate-600',
  },
];

export function getPropertyUsage(usage?: string | null): PropertyUsageMeta | null {
  if (!usage) return null;
  return PROPERTY_USAGE_OPTIONS.find(o => o.value === usage) ?? null;
}
