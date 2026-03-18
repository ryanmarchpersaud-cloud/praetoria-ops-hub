import {
  Snowflake, Trees, Trash2, Wrench, Sparkles, Droplets,
  ClipboardCheck, Scale, Clock, AlertTriangle, Building2,
} from 'lucide-react';

export const SERVICE_CATALOG = {
  'Snow & Ice': {
    icon: Snowflake,
    color: 'bg-sky-500',
    items: [
      'Snow clearing — driveway', 'Snow clearing — front walk', 'Snow clearing — public sidewalk',
      'Snow clearing — steps / stairs', 'Snow clearing — deck / patio', 'Snow clearing — side entrance',
      'Snow clearing — back alley / garbage access', 'Snow clearing — garage pad / apron',
      'Snow clearing — around basement window / window well', 'Snow clearing — around generator / utility access',
      'Snow pile relocation', 'Snow haul-away', 'De-icing application', 'Sanding / traction control',
      'Ice chop / hardpack removal', 'Roof snow removal request', 'Ice dam / roof-edge concern',
      'Emergency storm cleanup', 'Sidewalk compliance help',
    ],
  },
  'Landscaping & Grounds': {
    icon: Trees,
    color: 'bg-green-500',
    items: [
      'Lawn mowing', 'Spring cleanup', 'Fall cleanup', 'Aeration', 'Dethatching',
      'Hedge / shrub trimming', 'Weed cleanup', 'Garden bed cleanup', 'Mulch refresh',
      'Yard debris removal', 'Leaf cleanup', 'Seasonal property check',
    ],
  },
  'Junk Removal': {
    icon: Trash2,
    color: 'bg-amber-500',
    items: [
      'Household junk pickup', 'Furniture removal', 'Appliance removal', 'Mattress removal',
      'Garage cleanout', 'Basement cleanout', 'Yard waste removal', 'Construction debris removal',
      'Move-out cleanup', 'Curbside pickup request',
    ],
  },
  'Property Care & Maintenance': {
    icon: Wrench,
    color: 'bg-orange-500',
    items: [
      'General repair request', 'Fence / gate issue', 'Deck / stair concern', 'Door / lock issue',
      'Window issue', 'Caulking / sealing', 'Minor drywall / patch repair', 'Minor exterior repair',
      'Handyman visit', 'Safety / hazard correction',
      'Garage door bottom weather strip replacement', 'Garage door weather seal inspection',
      'Garage door side/top weather seal replacement', 'Door weatherproofing / draft sealing',
    ],
  },
  'Cleaning Services': {
    icon: Sparkles,
    color: 'bg-pink-500',
    items: [
      'One-time cleaning', 'Move-in / move-out cleaning', 'Post-construction cleaning',
      'Common-area cleaning', 'Deep cleaning', 'Turnover cleaning', 'Garbage area cleanup',
    ],
  },
  'Power Washing': {
    icon: Droplets,
    color: 'bg-blue-600',
    items: [
      'Driveway washing', 'Sidewalk washing', 'Deck washing', 'Fence washing',
      'Exterior wall washing', 'Garage floor washing', 'Dumpster pad / garbage area washing',
    ],
  },
  'Property Inspection': {
    icon: ClipboardCheck,
    color: 'bg-indigo-500',
    items: [
      'Property inspection request', 'Pre-season inspection', 'Post-storm inspection',
      'Insurance photo request', 'Site condition update', 'Access change notice',
      'Restricted-area update', 'Damage concern', 'Service review request',
    ],
  },
  'Bylaw / Compliance': {
    icon: Scale,
    color: 'bg-red-500',
    items: [
      'Sidewalk snow clearing compliance', 'Ice control / slippery sidewalk',
      'Snow ridge / blocked access concern', 'Overgrown grass / yard cleanup',
      'Untidy property cleanup', 'Seasonal inspection request',
    ],
  },
  'Property Management': {
    icon: ClipboardCheck,
    color: 'bg-teal-600',
    items: [
      'Property check / walkthrough', 'Vacant property check',
      'Tenant move-in coordination', 'Tenant move-out coordination',
      'Vendor coordination', 'Maintenance dispatch',
      'Emergency callout coordination', 'Owner report / update',
      'Custom property management request',
    ],
  },
} as const;

export type CatalogKey = keyof typeof SERVICE_CATALOG;

export const PRIORITY_OPTIONS = [
  { value: 'Routine', label: 'Routine', desc: 'Within normal schedule', icon: Clock, color: 'border-muted-foreground/30' },
  { value: 'Soon', label: 'Soon', desc: 'Within 1–3 days', icon: Clock, color: 'border-amber-500' },
  { value: 'Urgent', label: 'Urgent', desc: 'Same-day / emergency', icon: AlertTriangle, color: 'border-destructive' },
];

export const SPECIAL_ISSUE_TYPES = [
  'Possible property damage', 'Access hazard', 'Update site notes',
  'Restricted / no-access area', 'Fragile surface warning', 'Narrow passage / clearance issue',
  'Hot tub / fence / deck caution area', 'Request pre-season inspection',
  'Request insurance / condition photos',
];

export const CONTACT_METHODS = ['Email', 'Phone', 'Text / SMS'];

export const SERVICE_WINDOW_OPTIONS = [
  'Before 6 AM', 'Before 7 AM', 'Morning', 'Afternoon', 'Evening if available', 'No preference',
];

export const PAYMENT_PREF_OPTIONS = [
  'Pay by saved card', 'Pay by credit card', 'Pay by e-transfer', 'Ask me before charging', 'Auto-pay enabled',
];

export const RECURRING_UPSELL_OPTIONS = [
  'Recurring lawn care', 'Snow management', 'De-icing / ice management',
  'Recurring cleaning', 'Inspection / property care plan',
];
