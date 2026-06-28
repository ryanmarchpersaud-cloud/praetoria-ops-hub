// Billing rule helpers for time-based catalog items.
//
// Commercial tractor mowing rule:
//   - 3-hour minimum
//   - After the minimum, time is billed in 1.5-hour increments (round up)
//
// Use computeBillableHours() from invoice/quote line item editors when an
// admin enters "actual hours" for a tractor-mowing style item so the
// quantity column stays consistent with how Praetoria quotes the work.

export interface IncrementBillingOptions {
  /** Minimum billable hours regardless of actual time. */
  minimumHours: number;
  /** Increment size applied AFTER the minimum (e.g. 1.5 = round up to next 1.5 hr block). */
  incrementHours: number;
}

export const TRACTOR_MOWING_RULE: IncrementBillingOptions = {
  minimumHours: 3,
  incrementHours: 1.5,
};

/**
 * Round actual worked hours up to billable hours per a minimum + increment rule.
 *
 * Example (3 hr min, 1.5 hr increments):
 *   1   -> 3
 *   3   -> 3
 *   3.2 -> 4.5
 *   7   -> 7.5   (3 min + 4.5 rounded up from 4)
 *   10  -> 10.5  (3 min + 7.5 rounded up from 7)
 *   12  -> 12    (3 min + 9 exact)
 */
export function computeBillableHours(
  actualHours: number,
  rule: IncrementBillingOptions = TRACTOR_MOWING_RULE,
): number {
  if (!Number.isFinite(actualHours) || actualHours <= 0) return rule.minimumHours;
  if (actualHours <= rule.minimumHours) return rule.minimumHours;
  const overage = actualHours - rule.minimumHours;
  const blocks = Math.ceil(overage / rule.incrementHours - 1e-9);
  return Number((rule.minimumHours + blocks * rule.incrementHours).toFixed(2));
}
