export const SERVICE_CATEGORIES = [
  'Snow & Ice',
  'Landscaping & Grounds',
  'Junk Removal',
  'Property Care & Maintenance',
  'Power Washing',
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
  'Website',
  'Referral',
  'Phone call',
  'Email',
  'Walk-in',
  'Social media',
  'n8n webhook',
  'Other',
] as const;

export const PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
] as const;

export function getStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'new') return 'status-new';
  if (['reviewing', 'awaiting info', 'quote drafting', 'needs review'].includes(s)) return 'status-reviewing';
  if (['won', 'approved', 'quote ready'].includes(s)) return 'status-approved';
  if (['lost', 'declined'].includes(s)) return 'status-declined';
  if (['quote sent', 'sent'].includes(s)) return 'status-sent';
  if (['archived'].includes(s)) return 'status-archived';
  return 'status-draft';
}
