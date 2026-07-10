// Master list of all 25 Praetoria Group service divisions.
// This is the single source of truth — used in dropdowns across Quotes, Jobs,
// Invoices, Requests, Leads, Visits, Tasks, and any other category selector.
// Keep in sync with the service grid at the bottom of QuotePrint.tsx.
export const SERVICE_CATEGORIES = [
  'Snow & Ice',
  'Maintenance & Repairs',
  'Property Care & Landscaping',
  'Property Management',
  'Electrical',
  'Plumbing',
  'Carpentry & Renovations',
  'Roofing & Exteriors',
  'Painting & Finishing',
  'Cleaning Services',
  'Heating, Ventilation & Air Conditioning',
  'Concrete & Masonry',
  'Security & Smart Home',
  'Fencing & Decking',
  'Junk Removal',
  'Power Washing',
  'Tiling & Flooring',
  'Gutter Cleaning & Repair',
  'Window Cleaning',
  'Pest Control',
  'Moving & Hauling',
  'Insulation & Drywall',
  'Appliance Install & Repair',
  'Garage Doors',
  'Locksmith Services',
  'Drywall Mudding & Taping',
  'Drywall Installation & Metal Stud Completion',
  'Farm Building Demolition & Metal Recovery',
  'Other',
] as const;

export const LEAD_STATUSES = [
  'New',
  'Reviewing',
  'Awaiting info',
  'Quote drafting',
  'Quote ready',
  'Quote sent',
  'Won',
  'Lost',
  'Archived',
] as const;

export const QUOTE_APPROVAL_STATUSES = [
  'Draft',
  'Needs review',
  'Approved',
  'Sent',
  'Declined',
] as const;

export const URGENCY_LEVELS = ['Low', 'Normal', 'High', 'Urgent'] as const;

export const LEAD_SOURCES = [
  'Website', 'Referral', 'Phone call', 'Email', 'Walk-in', 'Social media', 'n8n webhook', 'Other',
] as const;

export const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
] as const;

export const PROPERTY_STATUSES = ['Active', 'Inactive', 'Seasonal', 'Pending'] as const;
export const PROPERTY_TYPES = ['Residential', 'Commercial', 'Industrial', 'Municipal', 'Strata', 'Other'] as const;
export const JOB_STATUSES = ['Draft', 'Scheduled', 'In Progress', 'Completed', 'Closed', 'Cancelled', 'On Hold'] as const;
export const JOB_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
export const VISIT_STATUSES = ['Planned', 'Scheduled', 'Assigned', 'En Route', 'In Progress', 'Completed', 'Skipped', 'Rescheduled', 'Missed', 'Cancelled', 'Needs Follow-up'] as const;
export const VISIT_TYPES = ['Routine', 'Initial Visit', 'Follow-up', 'Emergency', 'Inspection', 'Service Call', 'Delivery', 'Other'] as const;
export const VISIT_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
export const RECURRENCE_FREQUENCIES = ['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Custom'] as const;
export const SERVICE_FREQUENCIES = ['one-time', 'weekly', 'biweekly', 'monthly', 'on-snowfall', 'custom-seasonal'] as const;
export const INVOICE_STATUSES = ['Draft', 'Sent', 'Viewed', 'Paid', 'Partially Paid', 'Overdue', 'Failed', 'Voided', 'Refunded', 'Disputed'] as const;

export const CUSTOMER_TYPES = ['Residential', 'Commercial', 'Contractor', 'Property Manager', 'Other'] as const;
export const ACCOUNT_TYPES = ['Individual', 'Company'] as const;
export const CUSTOMER_STATUSES = ['Active', 'Lost', 'Paused'] as const;
export type CustomerStatus = typeof CUSTOMER_STATUSES[number];
export const BILLING_METHODS = ['Email', 'Mail', 'Portal', 'Other'] as const;
export const COMMUNICATION_METHODS = ['Email', 'Phone', 'Text / SMS', 'Portal'] as const;

export function getStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'new' || s === 'scheduled' || s === 'open') return 'status-new';
  if (['reviewing', 'awaiting info', 'quote drafting', 'needs review', 'en route', 'on hold', 'pending', 'planned', 'rescheduled'].includes(s)) return 'status-reviewing';
  if (['won', 'approved', 'quote ready', 'completed', 'active', 'paid', 'resolved', 'closed'].includes(s)) return 'status-approved';
  if (['lost', 'declined', 'cancelled', 'missed', 'skipped', 'inactive', 'voided', 'failed', 'refunded'].includes(s)) return 'status-declined';
  if (['quote sent', 'sent', 'in progress', 'viewed'].includes(s)) return 'status-sent';
  if (['partially paid'].includes(s)) return 'status-partial';
  if (['overdue', 'past due', 'disputed'].includes(s)) return 'status-overdue';
  if (['archived', 'seasonal'].includes(s)) return 'status-archived';
  return 'status-draft';
}
