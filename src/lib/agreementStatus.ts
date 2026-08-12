/**
 * Praetoria Agreement lifecycle statuses.
 * Legacy values ('signed', 'cancelled') are mapped for backwards compatibility.
 */

export type AgreementStatus =
  | 'draft'
  | 'ready_to_send'
  | 'sent'
  | 'delivered'
  | 'viewed'
  | 'signing_in_progress'
  | 'customer_signed'
  | 'awaiting_praetoria'
  | 'fully_executed'
  | 'declined'
  | 'voided'
  | 'expired'
  | 'superseded';

export interface AgreementStatusMeta {
  value: string;
  label: string;
  className: string;
  /** Terminal statuses stop reminders and block further signing. */
  terminal?: boolean;
}

export const AGREEMENT_STATUS_META: Record<string, AgreementStatusMeta> = {
  draft: { value: 'draft', label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ready_to_send: { value: 'ready_to_send', label: 'Ready to Send', className: 'bg-slate-100 text-slate-700' },
  sent: { value: 'sent', label: 'Sent', className: 'bg-blue-100 text-blue-700' },
  delivered: { value: 'delivered', label: 'Delivered', className: 'bg-sky-100 text-sky-700' },
  viewed: { value: 'viewed', label: 'Viewed', className: 'bg-amber-100 text-amber-700' },
  signing_in_progress: { value: 'signing_in_progress', label: 'Signing in Progress', className: 'bg-amber-100 text-amber-800' },
  customer_signed: { value: 'customer_signed', label: 'Customer Signed', className: 'bg-teal-100 text-teal-700' },
  awaiting_praetoria: { value: 'awaiting_praetoria', label: 'Awaiting Praetoria Signature', className: 'bg-indigo-100 text-indigo-700' },
  fully_executed: { value: 'fully_executed', label: 'Fully Executed', className: 'bg-emerald-100 text-emerald-700', terminal: true },
  // legacy
  signed: { value: 'signed', label: 'Signed', className: 'bg-emerald-100 text-emerald-700', terminal: true },
  declined: { value: 'declined', label: 'Declined', className: 'bg-destructive/10 text-destructive', terminal: true },
  voided: { value: 'voided', label: 'Voided', className: 'bg-muted text-muted-foreground', terminal: true },
  cancelled: { value: 'cancelled', label: 'Voided', className: 'bg-muted text-muted-foreground', terminal: true },
  expired: { value: 'expired', label: 'Expired', className: 'bg-orange-100 text-orange-700', terminal: true },
  superseded: { value: 'superseded', label: 'Superseded', className: 'bg-muted text-muted-foreground', terminal: true },
};

export function agreementStatusMeta(status?: string | null): AgreementStatusMeta {
  return AGREEMENT_STATUS_META[status || 'draft'] || { value: status || 'draft', label: status || 'Draft', className: 'bg-muted text-muted-foreground' };
}

/** Statuses where the customer can still open the signing experience. */
export const SIGNABLE_STATUSES = ['sent', 'delivered', 'viewed', 'signing_in_progress', 'ready_to_send'];

export function isSignable(status?: string | null) {
  return SIGNABLE_STATUSES.includes(status || '');
}

export function isTerminal(status?: string | null) {
  return Boolean(agreementStatusMeta(status).terminal);
}

/** Reminders are only allowed while the customer still has to act. */
export function canRemind(status?: string | null) {
  return ['sent', 'delivered', 'viewed', 'signing_in_progress'].includes(status || '');
}

export const ADMIN_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready_to_send', label: 'Needs Review' },
  { value: 'sent', label: 'Awaiting Customer' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'customer_signed', label: 'Customer Signed' },
  { value: 'awaiting_praetoria', label: 'Awaiting Praetoria' },
  { value: 'fully_executed', label: 'Completed' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'voided', label: 'Voided' },
  { value: 'superseded', label: 'Superseded' },
];
