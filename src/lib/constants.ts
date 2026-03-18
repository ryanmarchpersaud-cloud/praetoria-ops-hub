export const SERVICE_CATEGORIES = [
  'Snow & Ice',
  'Landscaping & Grounds',
  'Junk Removal',
  'Property Care & Maintenance',
  'Cleaning Services',
  'Power Washing',
  'Property Inspection',
  'Bylaw / Compliance',
  'Property Management',
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
export const JOB_STATUSES = ['Draft', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'On Hold'] as const;
export const JOB_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'] as const;
export const VISIT_STATUSES = ['Planned', 'Scheduled', 'En Route', 'In Progress', 'Completed', 'Skipped', 'Rescheduled', 'Missed', 'Cancelled'] as const;
export const VISIT_TYPES = ['Routine', 'One-time', 'Emergency', 'Inspection', 'Follow-up'] as const;
export const SERVICE_FREQUENCIES = ['one-time', 'weekly', 'biweekly', 'monthly', 'on-snowfall', 'custom-seasonal'] as const;
export const INVOICE_STATUSES = ['Draft', 'Sent', 'Viewed', 'Paid', 'Partially Paid', 'Overdue', 'Failed', 'Voided'] as const;

export function getStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'new' || s === 'scheduled') return 'status-new';
  if (['reviewing', 'awaiting info', 'quote drafting', 'needs review', 'en route', 'on hold', 'pending', 'planned', 'rescheduled'].includes(s)) return 'status-reviewing';
  if (['won', 'approved', 'quote ready', 'completed', 'active', 'paid'].includes(s)) return 'status-approved';
  if (['lost', 'declined', 'cancelled', 'missed', 'skipped', 'inactive', 'voided', 'failed'].includes(s)) return 'status-declined';
  if (['quote sent', 'sent', 'in progress', 'viewed', 'partially paid'].includes(s)) return 'status-sent';
  if (['overdue'].includes(s)) return 'status-reviewing';
  if (['archived', 'seasonal'].includes(s)) return 'status-archived';
  return 'status-draft';
}
