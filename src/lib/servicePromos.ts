import {
  Snowflake, TreePine, Trash2, Wrench, Building2, Droplets, SprayCan, Briefcase,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ServicePromo {
  id: string;
  title: string;
  subtitle: string;
  audience: string;
  highlights: string[];
  cta?: string;
  icon: LucideIcon;
  accentClass: string; // tailwind bg class for icon badge
  iconColorClass: string;
}

export const SERVICE_PROMOS: ServicePromo[] = [
  {
    id: 'snow-ice',
    title: 'Snow & Ice Management',
    subtitle: 'Strength in Every Storm',
    audience: 'Residential · Commercial · Municipal · Strata',
    highlights: [
      'Reliable winter service with 24/7 response',
      'Plowing, salting, sanding & sidewalk clearing',
      'Property-management-friendly scheduling',
      'Environment Canada weather intelligence',
    ],
    icon: Snowflake,
    accentClass: 'bg-sky-100 dark:bg-sky-950/40',
    iconColorClass: 'text-sky-600',
  },
  {
    id: 'landscaping',
    title: 'Landscaping & Grounds',
    subtitle: 'Professional Lawn Care Services',
    audience: 'Residential · Commercial · Municipal · Right-of-Way',
    highlights: [
      'Mowing, trimming, cleanups & weed control',
      'Fertilization, aeration & seeding',
      'Right-of-way / roadside maintenance',
      'Multi-unit & property management friendly',
    ],
    icon: TreePine,
    accentClass: 'bg-emerald-100 dark:bg-emerald-950/40',
    iconColorClass: 'text-emerald-600',
  },
  {
    id: 'junk-removal',
    title: 'Junk Removal & Haul-Away',
    subtitle: 'Fast & Reliable Pickup',
    audience: 'Residential · Commercial · Property Management',
    highlights: [
      'Tenant move-outs & unit cleanouts',
      'Bin area overflow & bulky-item pickup',
      'Renovation debris & contractor cleanup',
      'Eco-friendly disposal · Upfront pricing',
    ],
    icon: Trash2,
    accentClass: 'bg-orange-100 dark:bg-orange-950/40',
    iconColorClass: 'text-orange-600',
  },
  {
    id: 'maintenance',
    title: 'Renovation & Maintenance Repair',
    subtitle: 'Landlord & Property Manager Focused',
    audience: 'Residential · Commercial · Rental Properties',
    highlights: [
      'General handyman, plumbing & basic electrical',
      'Painting, decorating & interior finishing',
      'Carpentry, installations & smart-home setup',
      'Preventative maintenance for homes & rentals',
    ],
    icon: Wrench,
    accentClass: 'bg-amber-100 dark:bg-amber-950/40',
    iconColorClass: 'text-amber-600',
  },
  {
    id: 'property-management',
    title: 'Property Management',
    subtitle: 'Full-Service Building Operations',
    audience: 'Multi-Unit · Strata · Commercial · Rental',
    highlights: [
      'Coordinated service across all properties',
      'Vendor management & work order tracking',
      'Seasonal planning & preventative programs',
      'Tenant communication & documentation',
    ],
    icon: Building2,
    accentClass: 'bg-violet-100 dark:bg-violet-950/40',
    iconColorClass: 'text-violet-600',
  },
  {
    id: 'power-washing',
    title: 'Power Washing',
    subtitle: 'Restore Curb Appeal',
    audience: 'Residential · Commercial · Municipal · Government · Strata',
    highlights: [
      'Driveways, walkways, stairways & parking areas',
      'Building exteriors, siding, decks & fences',
      'Garbage bin & dumpster area cleaning',
      'Interior garage & warehouse floor washing',
      'Pre-paint surface preparation',
    ],
    icon: Droplets,
    accentClass: 'bg-cyan-100 dark:bg-cyan-950/40',
    iconColorClass: 'text-cyan-600',
  },
  {
    id: 'cleaning',
    title: 'Cleaning Services',
    subtitle: 'Spotless Spaces, Every Time',
    audience: 'Residential · Commercial · Municipal · Government · Hospitality',
    highlights: [
      'Move-in & move-out deep cleaning',
      'Airbnb, hotel & short-term rental turnover',
      'Office, school & shopping center cleaning',
      'Heavy-duty & post-renovation cleanup',
      'House cleaning & recurring maid service',
    ],
    icon: SprayCan,
    accentClass: 'bg-rose-100 dark:bg-rose-950/40',
    iconColorClass: 'text-rose-600',
  },
  {
    id: 'other',
    title: 'Custom & Specialty Services',
    subtitle: 'Tailored to Your Needs',
    audience: 'All Property Types',
    highlights: [
      'Flexible service packages',
      'One-time or recurring scheduling',
      'Custom scoping & competitive pricing',
      'Single trusted team for all services',
    ],
    icon: Briefcase,
    accentClass: 'bg-slate-100 dark:bg-slate-950/40',
    iconColorClass: 'text-slate-600',
  },
];
