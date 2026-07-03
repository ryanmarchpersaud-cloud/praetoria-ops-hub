/**
 * Billing profile helpers.
 *
 * A row in customer_billing_profiles can be in one of three states:
 *  - none:         no payment_method_present flag
 *  - display-only: payment_method_present=true, but no real Stripe token
 *                  (admin typed card details manually for reference)
 *  - chargeable:   payment_method_present=true AND processor_customer_id
 *                  AND default_payment_method_id (real Stripe-backed card)
 *
 * Only chargeable cards may be used with the collect-payment flow.
 */
export function isChargeable(bp?: any | null): boolean {
  return !!(
    bp?.payment_method_present &&
    bp?.processor_customer_id &&
    bp?.default_payment_method_id
  );
}

export function isDisplayOnly(bp?: any | null): boolean {
  return !!(bp?.payment_method_present) && !isChargeable(bp);
}
