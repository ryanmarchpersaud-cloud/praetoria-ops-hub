/**
 * Format raw status strings (e.g. "in_progress") into friendly display text
 * (e.g. "In Progress"). Safe for null/undefined.
 */
export function formatStatusLabel(status?: string | null): string {
  if (!status) return '';
  return status
    .toString()
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Renewal stage presentation metadata used by tenant + owner portals.
 * Read-only — does not affect admin workflow logic (Phase 6C/6D locked).
 *
 * `tenantLabel` uses plain-language wording for tenants.
 * `ownerLabel` uses concise landlord-facing wording.
 * `tone` maps to a Tailwind color family for badge coloring.
 */
export type RenewalStageTone = 'slate' | 'amber' | 'blue' | 'emerald' | 'rose' | 'violet';

export interface RenewalStageMeta {
  tenantLabel: string;
  ownerLabel: string;
  tone: RenewalStageTone;
  tenantHelper: string;
  ownerHelper: string;
}

const RENEWAL_STAGE_META: Record<string, RenewalStageMeta> = {
  not_started: {
    tenantLabel: 'Being Prepared',
    ownerLabel: 'Not Started',
    tone: 'slate',
    tenantHelper: 'Your property manager will be in touch soon about your renewal.',
    ownerHelper: 'The renewal has not been started yet.',
  },
  review_needed: {
    tenantLabel: 'Being Prepared',
    ownerLabel: 'Review Needed',
    tone: 'slate',
    tenantHelper: 'Your property manager is preparing your renewal details.',
    ownerHelper: 'Renewal is under internal review.',
  },
  renewal_prepared: {
    tenantLabel: 'Being Prepared',
    ownerLabel: 'Prepared — Not Yet Sent',
    tone: 'blue',
    tenantHelper: 'Your renewal is being finalized. You will hear from us shortly.',
    ownerHelper: 'Renewal terms are ready to be sent to the tenant.',
  },
  sent_to_tenant: {
    tenantLabel: 'Offer Sent — Please Respond',
    ownerLabel: 'Sent to Tenant',
    tone: 'amber',
    tenantHelper: 'Please review the details below and let us know how you would like to proceed.',
    ownerHelper: 'The tenant has been sent the renewal offer and is expected to respond.',
  },
  tenant_reviewing: {
    tenantLabel: 'You Are Reviewing',
    ownerLabel: 'Tenant Reviewing',
    tone: 'amber',
    tenantHelper: 'Thanks — we know you are looking things over. Contact us with any questions.',
    ownerHelper: 'The tenant is reviewing the offer.',
  },
  tenant_accepted: {
    tenantLabel: 'You Accepted',
    ownerLabel: 'Tenant Accepted',
    tone: 'emerald',
    tenantHelper: 'Thanks! Your acceptance is on file. We will follow up with next steps.',
    ownerHelper: 'The tenant has accepted the renewal offer.',
  },
  tenant_declined: {
    tenantLabel: 'You Declined',
    ownerLabel: 'Tenant Declined',
    tone: 'rose',
    tenantHelper: 'We received your response. Your property manager will follow up with you.',
    ownerHelper: 'The tenant has declined the renewal offer.',
  },
  month_to_month: {
    tenantLabel: 'Continuing Month-to-Month',
    ownerLabel: 'Month-to-Month',
    tone: 'violet',
    tenantHelper: 'Your lease is continuing on a month-to-month basis.',
    ownerHelper: 'Tenancy is continuing month-to-month.',
  },
  non_renewal: {
    tenantLabel: 'Not Renewing',
    ownerLabel: 'Non-Renewal',
    tone: 'rose',
    tenantHelper: 'This tenancy will not be renewed. Please contact us with any questions.',
    ownerHelper: 'This tenancy will not be renewed.',
  },
  completed: {
    tenantLabel: 'Complete',
    ownerLabel: 'Complete',
    tone: 'emerald',
    tenantHelper: 'Your renewal process is complete.',
    ownerHelper: 'Renewal process is complete.',
  },
  cancelled: {
    tenantLabel: 'Cancelled',
    ownerLabel: 'Cancelled',
    tone: 'slate',
    tenantHelper: 'This renewal was cancelled. Please contact us with any questions.',
    ownerHelper: 'This renewal was cancelled.',
  },
};

export function getRenewalStageMeta(status?: string | null): RenewalStageMeta {
  const key = (status || '').toLowerCase();
  return (
    RENEWAL_STAGE_META[key] || {
      tenantLabel: formatStatusLabel(status),
      ownerLabel: formatStatusLabel(status),
      tone: 'slate',
      tenantHelper: '',
      ownerHelper: '',
    }
  );
}
