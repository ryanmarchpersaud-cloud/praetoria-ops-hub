/**
 * Combined Quotation & Service Agreement — lifecycle, activation gating and
 * pricing helpers shared by admin screens, the signing flow and the portal.
 */

export type CombinedDocStatus =
  | 'draft_internal_review'
  | 'provisional_estimate'
  | 'final_quotation'
  | 'accepted_activation_pending'
  | 'active_service_agreement'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export interface CombinedDocStatusMeta {
  value: CombinedDocStatus;
  label: string;
  short: string;
  className: string;
  /** The customer may sign / acknowledge in this state. */
  signable?: boolean;
  /** Service may be dispatched in this state. */
  serviceActive?: boolean;
}

export const COMBINED_DOC_STATUSES: CombinedDocStatusMeta[] = [
  {
    value: 'draft_internal_review',
    label: 'Draft — Internal Review',
    short: 'Draft',
    className: 'bg-muted text-muted-foreground',
  },
  {
    value: 'provisional_estimate',
    label: 'Provisional Estimate — Customer Acknowledgement Only',
    short: 'Provisional Estimate',
    className: 'bg-amber-100 text-amber-800',
    signable: true,
  },
  {
    value: 'final_quotation',
    label: 'Final Quotation — Awaiting Customer Acceptance',
    short: 'Final Quotation',
    className: 'bg-blue-100 text-blue-700',
    signable: true,
  },
  {
    value: 'accepted_activation_pending',
    label: 'Accepted — Activation Requirements Pending',
    short: 'Accepted',
    className: 'bg-indigo-100 text-indigo-700',
  },
  {
    value: 'active_service_agreement',
    label: 'Active Service Agreement',
    short: 'Active',
    className: 'bg-emerald-100 text-emerald-700',
    serviceActive: true,
  },
  { value: 'suspended', label: 'Suspended', short: 'Suspended', className: 'bg-orange-100 text-orange-700' },
  { value: 'cancelled', label: 'Cancelled', short: 'Cancelled', className: 'bg-destructive/10 text-destructive' },
  { value: 'expired', label: 'Expired', short: 'Expired', className: 'bg-slate-100 text-slate-600' },
];

export function combinedStatusMeta(status?: string | null): CombinedDocStatusMeta {
  return (
    COMBINED_DOC_STATUSES.find((s) => s.value === status) || COMBINED_DOC_STATUSES[0]
  );
}

export const PROVISIONAL_BANNER =
  'PROVISIONAL ESTIMATE ONLY — NOT A CONFIRMED PRICE OR SERVICE COMMITMENT';

export const ACTIVATION_PENDING_BANNER =
  'ACTIVATION PENDING — SERVICE NOT YET SCHEDULED';

/** Every requirement that must be satisfied before service becomes Active. */
export const ACTIVATION_REQUIREMENTS: { key: string; label: string; autoKey?: 'signed' | 'pricing' }[] = [
  { key: 'final_document_signed', label: 'Final combined quotation and agreement signed', autoKey: 'signed' },
  { key: 'pricing_approved', label: 'Final pricing approved by Ryan', autoKey: 'pricing' },
  { key: 'initial_payment', label: 'Required initial payment completed' },
  { key: 'property_inspection', label: 'Property inspection completed' },
  { key: 'condition_photos', label: 'Existing-condition photographs completed' },
  { key: 'snow_storage_recorded', label: 'Snow-storage location recorded' },
  { key: 'trigger_selected', label: 'Snowfall trigger selected' },
  { key: 'service_areas_approved', label: 'Service map / service areas approved' },
  { key: 'route_assigned', label: 'Customer added to an established and approved route' },
];

export type ActivationChecklist = Record<string, boolean>;

export function activationState(
  checklist: ActivationChecklist | null | undefined,
  opts: { signed?: boolean; pricingApproved?: boolean } = {},
) {
  const items = ACTIVATION_REQUIREMENTS.map((r) => ({
    ...r,
    done:
      r.autoKey === 'signed'
        ? Boolean(opts.signed)
        : r.autoKey === 'pricing'
          ? Boolean(opts.pricingApproved)
          : Boolean(checklist?.[r.key]),
  }));
  const completed = items.filter((i) => i.done).length;
  return { items, completed, total: items.length, allComplete: completed === items.length };
}

export const TBD = 'TBD';

/** Any value Ryan has not approved is rendered as TBD and blocks final publication. */
export function isTbd(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === '' || s.toUpperCase() === 'TBD' || s === '—';
}

/** Money / value keys that must be resolved before a FINAL document can be published. */
export const FINAL_REQUIRED_PRICING_KEYS = [
  'monthly_price',
  'billing_periods',
  'seasonal_subtotal',
  'gst_amount',
  'pst_treatment',
  'total_price',
  'additional_visit_rate',
  'worker_hour_rate',
  'travel_mobilization',
  'heavy_snow_charge',
  'deicer_application_charge',
  'deicer_material_charge',
  'emergency_callout_charge',
  'hauling_charge',
  'response_target',
];

export function unresolvedPricingKeys(merge: Record<string, unknown> | null | undefined) {
  return FINAL_REQUIRED_PRICING_KEYS.filter((k) => isTbd(merge?.[k]));
}
