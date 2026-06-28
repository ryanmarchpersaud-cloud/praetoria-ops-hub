// Billing rule helpers for time-based catalog items.
//
// Commercial tractor mowing rule (default):
//   - 3-hour minimum
//   - Actual hours are billed as-is above the minimum.
//   - 1.5-hour increment rounding is OPT-IN ONLY — admin must confirm the
//     customer agreed to increment billing before applying it. A clean
//     10-hour day must stay 10 hours unless Ryan explicitly opts in.
//
// Use computeBillableHours() from invoice/quote line item editors when an
// admin enters "actual hours" for a tractor-mowing style item.

export interface IncrementBillingOptions {
  /** Minimum billable hours regardless of actual time. */
  minimumHours: number;
  /** Increment size applied AFTER the minimum (e.g. 1.5 = round up to next 1.5 hr block). */
  incrementHours: number;
  /**
   * When true, round overage up to the next `incrementHours` block.
   * When false (default), bill actual hours above the minimum without rounding.
   * Only enable when the customer has explicitly agreed to increment billing.
   */
  applyIncrementRounding?: boolean;
}

export const TRACTOR_MOWING_RULE: IncrementBillingOptions = {
  minimumHours: 3,
  incrementHours: 1.5,
  applyIncrementRounding: false,
};

/**
 * Compute billable hours from actual worked hours.
 *
 * Default behaviour (no rounding):
 *   1  -> 3   (minimum applies)
 *   3  -> 3
 *   10 -> 10  (actual hours kept clean)
 *
 * With applyIncrementRounding=true (only if customer agreed):
 *   3.2 -> 4.5
 *   10  -> 10.5
 *   12  -> 12
 */
export function computeBillableHours(
  actualHours: number,
  rule: IncrementBillingOptions = TRACTOR_MOWING_RULE,
): number {
  if (!Number.isFinite(actualHours) || actualHours <= 0) return rule.minimumHours;
  if (actualHours <= rule.minimumHours) return rule.minimumHours;
  if (!rule.applyIncrementRounding) {
    return Number(actualHours.toFixed(2));
  }
  const overage = actualHours - rule.minimumHours;
  const blocks = Math.ceil(overage / rule.incrementHours - 1e-9);
  return Number((rule.minimumHours + blocks * rule.incrementHours).toFixed(2));
}
