// Maintenance issue catalog for Tenant Portal.
// Each issue maps to a category value that's stored on pm_maintenance_requests.category.
// `urgent` flags trigger a safety warning; `priority` seeds the priority selector.

export type IssuePriority = 'low' | 'normal' | 'urgent';

export interface MaintenanceIssue {
  label: string;
  priority?: IssuePriority; // default normal
  urgent?: boolean;         // shows emergency warning
  popular?: boolean;        // surfaced in "Common issues"
}

// Build a stable key for a catalog issue: `${category.key}:${slug(issue.label)}`.
// Used to persist the exact catalog selection on pm_maintenance_requests.issue_key.
export function issueKey(categoryKey: string, issueLabel: string): string {
  const slug = issueLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${categoryKey}:${slug}`;
}

export interface MaintenanceCategory {
  key: string;          // stored on request.category
  label: string;
  icon: string;         // emoji fallback keeps things dependency-free
  issues: MaintenanceIssue[];
}

export const MAINTENANCE_CATALOG: MaintenanceCategory[] = [
  {
    key: 'plumbing', label: 'Plumbing', icon: '🚰',
    issues: [
      { label: 'Toilet clogged', popular: true },
      { label: 'Toilet running' },
      { label: 'Toilet leaking' },
      { label: 'Toilet not flushing', popular: true },
      { label: 'Toilet loose or rocking' },
      { label: 'Bathroom sink clogged' },
      { label: 'Bathroom sink leaking' },
      { label: 'Bathroom faucet leaking' },
      { label: 'Bathroom faucet — no water' },
      { label: 'Bathtub clogged' },
      { label: 'Bathtub leaking' },
      { label: 'Shower drain clogged' },
      { label: 'Shower leaking' },
      { label: 'Shower head leaking' },
      { label: 'Low water pressure' },
      { label: 'No hot water', priority: 'urgent', popular: true },
      { label: 'No cold water' },
      { label: 'Water leak (active)', urgent: true, priority: 'urgent', popular: true },
      { label: 'Pipe leak', urgent: true, priority: 'urgent' },
      { label: 'Water dripping from ceiling', urgent: true, priority: 'urgent' },
      { label: 'Water stain / possible leak' },
      { label: 'Kitchen sink clogged', popular: true },
      { label: 'Kitchen sink leaking' },
      { label: 'Kitchen faucet leaking' },
      { label: 'Garbage disposal issue' },
      { label: 'Dishwasher leak' },
      { label: 'Washing machine water leak' },
      { label: 'Outdoor tap leaking' },
      { label: 'Sump pump issue' },
      { label: 'Sewer smell' },
      { label: 'Main drain / sewer backup', urgent: true, priority: 'urgent' },
    ],
  },
  {
    key: 'heating_cooling', label: 'Heating / Cooling / Ventilation', icon: '🌡️',
    issues: [
      { label: 'No heat', urgent: true, priority: 'urgent', popular: true },
      { label: 'No air conditioning' },
      { label: 'Furnace not working', priority: 'urgent' },
      { label: 'Furnace making noise' },
      { label: 'Furnace filter issue' },
      { label: 'Thermostat not working' },
      { label: 'Thermostat battery issue', priority: 'low' },
      { label: 'Heat too low' },
      { label: 'Heat too high' },
      { label: 'AC not cooling' },
      { label: 'AC leaking water' },
      { label: 'Vent not blowing air' },
      { label: 'Vent cover damaged', priority: 'low' },
      { label: 'Exhaust fan not working' },
      { label: 'Bathroom fan not working' },
      { label: 'Dryer vent issue' },
      { label: 'Strange smell from furnace / vents', urgent: true, priority: 'urgent' },
    ],
  },
  {
    key: 'electrical', label: 'Electrical', icon: '⚡',
    issues: [
      { label: 'Power outlet not working', popular: true },
      { label: 'Light switch not working' },
      { label: 'Light fixture not working' },
      { label: 'Flickering lights' },
      { label: 'Breaker keeps tripping', priority: 'urgent' },
      { label: 'No power in room' },
      { label: 'Stove outlet issue' },
      { label: 'GFCI outlet not working' },
      { label: 'Outdoor outlet not working' },
      { label: 'Doorbell not working', priority: 'low' },
      { label: 'Ceiling fan not working' },
      { label: 'Bathroom fan electrical issue' },
      { label: 'Electrical burning smell', urgent: true, priority: 'urgent' },
      { label: 'Exposed wire', urgent: true, priority: 'urgent' },
      { label: 'Loose outlet' },
      { label: 'Loose switch' },
      { label: 'Smoke detector chirping', urgent: true, priority: 'urgent' },
      { label: 'Smoke detector not working', urgent: true, priority: 'urgent' },
      { label: 'Carbon monoxide detector issue', urgent: true, priority: 'urgent' },
    ],
  },
  {
    key: 'appliance', label: 'Appliances', icon: '🔌',
    issues: [
      { label: 'Fridge not cooling', priority: 'urgent', popular: true },
      { label: 'Freezer not freezing' },
      { label: 'Fridge leaking water' },
      { label: 'Fridge making noise' },
      { label: 'Stove burner not working' },
      { label: 'Oven not heating' },
      { label: 'Oven door issue' },
      { label: 'Range hood fan not working' },
      { label: 'Range hood light not working', priority: 'low' },
      { label: 'Dishwasher not draining' },
      { label: 'Dishwasher not cleaning' },
      { label: 'Dishwasher leaking' },
      { label: 'Washer not working' },
      { label: 'Washer leaking' },
      { label: 'Washer not draining' },
      { label: 'Dryer not heating' },
      { label: 'Dryer not spinning' },
      { label: 'Dryer making noise' },
      { label: 'Microwave not working' },
      { label: 'Appliance making noise' },
      { label: 'Appliance damaged' },
    ],
  },
  {
    key: 'lock_door', label: 'Doors / Locks / Keys', icon: '🔑',
    issues: [
      { label: 'Front door not closing', priority: 'urgent' },
      { label: 'Back door not closing', priority: 'urgent' },
      { label: 'Bedroom door issue' },
      { label: 'Bathroom door issue' },
      { label: 'Closet door issue', priority: 'low' },
      { label: 'Door handle loose' },
      { label: 'Door knob broken' },
      { label: 'Door lock not working' },
      { label: 'Deadbolt not working' },
      { label: 'Key not working' },
      { label: 'Key broken' },
      { label: 'Need key / lock help' },
      { label: 'Door frame damaged' },
      { label: 'Door hinge loose' },
      { label: 'Door sticking' },
      { label: 'Weather stripping damaged', priority: 'low' },
      { label: 'Garage door issue' },
      { label: 'Garage door opener issue' },
      { label: 'Garage remote not working' },
      { label: 'Patio door not sliding' },
      { label: 'Patio door lock issue' },
      { label: 'Screen door issue', priority: 'low' },
      { label: 'Storm door issue', priority: 'low' },
      { label: 'Broken exterior lock', urgent: true, priority: 'urgent' },
    ],
  },
  {
    key: 'windows', label: 'Windows / Screens', icon: '🪟',
    issues: [
      { label: 'Window not opening' },
      { label: 'Window not closing' },
      { label: 'Window lock broken' },
      { label: 'Window cracked' },
      { label: 'Window leaking' },
      { label: 'Window draft / cold air' },
      { label: 'Window screen damaged', priority: 'low' },
      { label: 'Window screen missing', priority: 'low' },
      { label: 'Window handle broken' },
      { label: 'Condensation between glass' },
      { label: 'Broken glass', urgent: true, priority: 'urgent' },
      { label: 'Patio door glass issue' },
      { label: 'Patio door screen issue', priority: 'low' },
      { label: 'Blind / curtain issue', priority: 'low' },
    ],
  },
  {
    key: 'bathroom', label: 'Bathroom', icon: '🛁',
    issues: [
      { label: 'Toilet issue' },
      { label: 'Sink issue' },
      { label: 'Bathtub issue' },
      { label: 'Shower issue' },
      { label: 'Bathroom fan issue' },
      { label: 'Bathroom light issue' },
      { label: 'Bathroom mirror issue', priority: 'low' },
      { label: 'Towel bar loose', priority: 'low' },
      { label: 'Toilet paper holder loose', priority: 'low' },
      { label: 'Caulking damaged', priority: 'low' },
      { label: 'Mold / mildew concern' },
      { label: 'Water on floor', priority: 'urgent' },
      { label: 'Grout / tile issue' },
      { label: 'Shower door issue' },
      { label: 'Shower curtain rod issue', priority: 'low' },
    ],
  },
  {
    key: 'kitchen', label: 'Kitchen', icon: '🍳',
    issues: [
      { label: 'Kitchen sink issue' },
      { label: 'Kitchen faucet issue' },
      { label: 'Cabinet door broken' },
      { label: 'Cabinet handle loose', priority: 'low' },
      { label: 'Drawer broken' },
      { label: 'Countertop damage' },
      { label: 'Backsplash / tile issue' },
      { label: 'Range hood issue' },
      { label: 'Fridge issue' },
      { label: 'Stove / oven issue' },
      { label: 'Dishwasher issue' },
      { label: 'Water leak under sink', priority: 'urgent' },
      { label: 'Pantry / closet door issue', priority: 'low' },
      { label: 'Kitchen light issue' },
    ],
  },
  {
    key: 'walls_floors', label: 'Walls / Ceilings / Floors', icon: '🧱',
    issues: [
      { label: 'Hole in wall' },
      { label: 'Wall damage' },
      { label: 'Ceiling damage' },
      { label: 'Ceiling leak / stain', priority: 'urgent' },
      { label: 'Paint peeling', priority: 'low' },
      { label: 'Baseboard damaged', priority: 'low' },
      { label: 'Trim damaged', priority: 'low' },
      { label: 'Flooring damaged' },
      { label: 'Loose flooring' },
      { label: 'Carpet damage' },
      { label: 'Carpet stain', priority: 'low' },
      { label: 'Tile cracked' },
      { label: 'Laminate lifting' },
      { label: 'Stair issue', priority: 'urgent' },
      { label: 'Handrail loose', priority: 'urgent' },
      { label: 'Closet shelf broken', priority: 'low' },
    ],
  },
  {
    key: 'exterior', label: 'Exterior / Yard / Grounds', icon: '🏡',
    issues: [
      { label: 'Fence damaged' },
      { label: 'Gate not working' },
      { label: 'Deck issue' },
      { label: 'Step / stair issue', priority: 'urgent' },
      { label: 'Railing loose', priority: 'urgent' },
      { label: 'Sidewalk issue' },
      { label: 'Driveway issue' },
      { label: 'Yard drainage issue' },
      { label: 'Exterior light not working' },
      { label: 'Outdoor tap issue' },
      { label: 'Gutter / downspout issue' },
      { label: 'Roof leak concern', priority: 'urgent' },
      { label: 'Siding damage' },
      { label: 'Garbage / bin issue', priority: 'low' },
      { label: 'Snow / ice concern' },
      { label: 'Lawn / yard concern', priority: 'low' },
      { label: 'Tree / branch concern' },
      { label: 'Pest outside', priority: 'low' },
    ],
  },
  {
    key: 'safety', label: 'Safety / Security', icon: '🛡️',
    issues: [
      { label: 'Smoke detector issue', urgent: true, priority: 'urgent' },
      { label: 'Carbon monoxide detector issue', urgent: true, priority: 'urgent' },
      { label: 'Fire alarm issue', urgent: true, priority: 'urgent' },
      { label: 'Fire extinguisher concern' },
      { label: 'Door lock issue' },
      { label: 'Window lock issue' },
      { label: 'Broken glass', urgent: true, priority: 'urgent' },
      { label: 'Security light issue' },
      { label: 'Trip hazard', priority: 'urgent' },
      { label: 'Water leak hazard', urgent: true, priority: 'urgent' },
      { label: 'Electrical hazard', urgent: true, priority: 'urgent' },
      { label: 'Gas smell', urgent: true, priority: 'urgent' },
      { label: 'Break-in / damage concern', urgent: true, priority: 'urgent' },
      { label: 'Unsafe stairs / railing', urgent: true, priority: 'urgent' },
      { label: 'Emergency access issue', priority: 'urgent' },
    ],
  },
  {
    key: 'pests', label: 'Pests', icon: '🐜',
    issues: [
      { label: 'Ants' },
      { label: 'Mice' },
      { label: 'Cockroaches', priority: 'urgent' },
      { label: 'Wasps / bees' },
      { label: 'Bed bugs', priority: 'urgent' },
      { label: 'Spiders' },
      { label: 'Flies' },
      { label: 'Unknown pest' },
      { label: 'Animal in attic / wall' },
      { label: 'Pest droppings' },
      { label: 'Pest damage' },
    ],
  },
  {
    key: 'parking', label: 'Parking / Garage / Storage', icon: '🚗',
    issues: [
      { label: 'Parking stall issue' },
      { label: 'Garage door issue' },
      { label: 'Garage opener issue' },
      { label: 'Garage remote issue' },
      { label: 'Garage light issue' },
      { label: 'Storage locker issue' },
      { label: 'Driveway blocked' },
      { label: 'Vehicle access issue' },
      { label: 'Gate access issue' },
    ],
  },
  {
    key: 'common_area', label: 'Common Area / Building', icon: '🏢',
    issues: [
      { label: 'Hallway light issue' },
      { label: 'Stairwell issue' },
      { label: 'Common door issue' },
      { label: 'Mailbox issue' },
      { label: 'Intercom issue' },
      { label: 'Laundry room issue' },
      { label: 'Shared garbage area issue' },
      { label: 'Common area cleaning concern' },
      { label: 'Common area damage' },
      { label: 'Exterior door not locking', priority: 'urgent' },
      { label: 'Building noise concern' },
      { label: 'Parking lot issue' },
    ],
  },
  {
    key: 'other', label: 'Other', icon: '📝',
    issues: [
      { label: 'Other repair request' },
      { label: 'General question', priority: 'low' },
      { label: 'I am not sure what the issue is' },
    ],
  },
];

export function findIssue(label: string): { category: MaintenanceCategory; issue: MaintenanceIssue } | null {
  for (const cat of MAINTENANCE_CATALOG) {
    const issue = cat.issues.find(i => i.label === label);
    if (issue) return { category: cat, issue };
  }
  return null;
}

export function searchIssues(query: string): Array<{ category: MaintenanceCategory; issue: MaintenanceIssue }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: Array<{ category: MaintenanceCategory; issue: MaintenanceIssue }> = [];
  for (const cat of MAINTENANCE_CATALOG) {
    for (const issue of cat.issues) {
      if (issue.label.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)) {
        results.push({ category: cat, issue });
      }
    }
  }
  return results.slice(0, 40);
}

export function popularIssues(): Array<{ category: MaintenanceCategory; issue: MaintenanceIssue }> {
  const out: Array<{ category: MaintenanceCategory; issue: MaintenanceIssue }> = [];
  for (const cat of MAINTENANCE_CATALOG) {
    for (const issue of cat.issues) if (issue.popular) out.push({ category: cat, issue });
  }
  return out;
}
