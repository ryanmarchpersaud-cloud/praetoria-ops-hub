# Phase 5A — Property Management Finance: Structure & Security Foundation

Planning-only report. No rent charges, rent payments, owner statements, payouts, or Stripe rent processing will be built in this phase. Only one small, additive foundation item (owner password hardening) is proposed as buildable in 5A — and only if you approve it separately.

---

## 1. Current finance system review

The existing customer-side finance stack (do **not** repurpose for PM rent):

- `invoices` + `invoice_line_items` — customer service invoices, with `invoice_number` regex `^[A-Z]+-[0-9]+$`, GST/PST, statuses, delivery tracking.
- `finance_payments` — customer invoice payments (cash, cheque, e-transfer, Stripe).
- `finance_expenses`, `finance_bills`, `finance_vendors`, `finance_accounts`, `finance_receipts`, `finance_reconciliation_statements`, `finance_refunds`, `finance_job_cost_snapshots` — job-costing / accounts / bookkeeping for **service jobs**.
- `payment_settings`, `payment_method_authorizations` — Stripe config, card-on-file for **customers**.
- Stripe surface: `create-checkout`, `collect-payment`, `setup-payment-method`, `sync-payment-method`, `stripe-webhook`, `process-refund` — all wired to customer invoices.

Safely reusable (read-only patterns, **not** shared tables):

- The PDF edge-function pattern (`subcontractor-pay-stub-pdf`) for owner statement PDFs later.
- The email/notification pipeline (`send-notification`) for statement delivery.
- The `useOwnerScope` + `has_role` + `is_ops_staff` RLS helpers for admin-preview and role gating.
- Signed-URL / private-bucket pattern (`owner-documents`) for statement/receipt files.

Must stay separate:

- Invoice tables, invoice numbering, `finance_payments`, Stripe customer flows, GST/PST logic, pay stubs, service-job costing.

Do not touch:

- `invoices`, `invoice_line_items`, `finance_payments`, `finance_expenses`, `payment_settings`, `payment_method_authorizations`, `stripe-webhook`, `collect-payment`, `setup-payment-method`, `sync-payment-method`, `process-refund`, customer portal billing pages.

Risk if mixed: a shared payments table would (a) let a tenant/owner appear in customer AR reports, (b) risk RLS bypass across portals, (c) break invoice-number regex and GST reports, (d) contaminate Stripe customer objects. Keep PM finance in its own `pm_*` namespace with its own numbering and its own (future) Stripe surface.

---

## 2. Tenant ledger review (Phase 2.5)

`pm_tenant_ledger` today has: `tenant_id`, `lease_id`, `entry_date`, `type`, `amount`, `description`, `reference`, `due_date`, `paid_date`, `tenant_visible`, `tenant_note`, `admin_note`, timestamps, `created_by`.

Assessment against the 11 required cases:

| Case | Supported today? | Notes |
|---|---|---|
| Rent charge | Yes | `type='rent_charge'`, `due_date` set. |
| Manual payment | Yes | `type='payment'`, `paid_date`. |
| Late fee | Yes | `type='late_fee'`. |
| Credit | Yes | `type='credit'` (negative amount). |
| Adjustment | Yes | `type='adjustment'`. |
| Security deposit | Partial | Can log as `type='deposit'`, but there is no held-vs-refunded state or interest tracking — a dedicated `pm_security_deposits` table is cleaner (5B). |
| NSF / returned payment | Partial | Needs a `type='nsf_reversal'` convention plus a `reverses_entry_id` link — add in 5B, no schema change needed beyond a nullable self-FK column. |
| Payment plan note | Partial | `admin_note` works for notes, but a `pm_payment_plans` table is better for scheduled installments (defer to a later sub-phase, optional). |
| Outstanding balance | Yes | Derivable via `SUM(amount)` grouped by lease/tenant; a `v_pm_tenant_balance` view is recommended in 5B. |
| Tenant-visible note | Yes | `tenant_note` + `tenant_visible`. |
| Admin-only note | Yes | `admin_note` (never returned to tenant queries). |

Conclusion: **the existing ledger is sufficient for 5B**, with two small additive columns proposed later (`reverses_entry_id uuid`, `source text` for provenance). No schema change is needed in 5A itself.

---

## 3. Owner visibility plan (extends Phase 4)

Owners will eventually see, per assigned property only:

- Monthly rent roll totals (charged, collected, outstanding) — aggregates, no tenant names required beyond unit label.
- Owner-visible expenses (via a future `pm_property_expenses.owner_visible` flag).
- Finalized owner statements (draft statements are ops-only).
- Owner payout history (amount + date + reference).

Owners must never see:

- Tenant banking details, tenant saved cards, Stripe customer IDs, tenant email/phone beyond what Phase 4 already exposes.
- Admin notes (`admin_note`), internal finance notes, unrelated properties.
- Draft or unfinalized statements, reconciliation working data.

Enforcement pattern: every owner-facing read goes through a `SECURITY DEFINER` function (e.g. `get_owner_property_finance_summary(_owner_id, _property_id)`) that hard-filters columns and joins through `pm_owner_properties`. Same pattern already used for `get_customer_billing_details`. Admin-preview keeps client-side filtering via `useOwnerScope` (Phase 4 fix).

---

## 4. Recommended table structure (for future sub-phases — do not create in 5A)

```text
Phase 5B (rent):
  pm_rent_schedules       one row per lease: amount, cadence, day_of_month, start/end
  pm_rent_charges         generated charges (links to pm_tenant_ledger entry)
  pm_rent_payments        manual/offline payments (links to pm_tenant_ledger entry)
  pm_security_deposits    held/refunded/applied state
  (extend pm_tenant_ledger with reverses_entry_id, source)

Phase 5C (expenses):
  pm_property_expenses    property_id, category, vendor, amount, tax, receipt_file,
                          owner_visible, tenant_visible, admin_note

Phase 5D (statements & fees):
  pm_management_fee_rules per property/owner: % or flat, applied_on
  pm_owner_statements     property_id, owner_id, period_start/end, status(draft|final)
  pm_owner_statement_lines line items rolled up from charges/payments/expenses/fees
  pm_owner_payouts        recorded payouts (no live processing in 5D)

Phase 5E (Stripe rent — planning only, separate approval):
  pm_tenant_payment_methods, pm_stripe_customers  (mirrors, isolated from customer Stripe)
```

Numbering: PM statements use `PMS-####`; payouts `PMP-####`. Kept out of the customer `[A-Z]+-[0-9]+` invoice regex space.

---

## 5. Recommended sub-phase order

1. **5A** (this phase) — report only, plus optional owner password hardening.
2. **5B** — rent schedules, charges, manual payments, deposits (uses existing ledger).
3. **5C** — property expenses (owner/tenant visibility flags).
4. **5D** — owner statements + management fees + PDF + recorded payouts.
5. **5E** — Stripe rent (separate planning report before any code).

Each sub-phase ships behind ops-only entry points first; owner/tenant surfaces enabled once RLS is verified.

---

## 6. RLS & security plan (for future PM finance tables)

Common rules for every new `pm_*` finance table:

- `ENABLE ROW LEVEL SECURITY`.
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`; `GRANT ALL ... TO service_role`. **No** `anon` grant on any PM finance table.
- Ops full access via `is_ops_staff(auth.uid())`.
- Tenants: read only rows where `lease_id` belongs to them **and** `tenant_visible = true` (ledger) or via a `SECURITY DEFINER` summary function (statements/expenses).
- Owners: read only via `SECURITY DEFINER` functions joined through `pm_owner_properties`, filtered to `owner_visible = true` and `status = 'final'` where applicable. No direct `SELECT` policy on raw expense/statement rows for the `property_owner` role.
- Workers, subcontractors, customers, owner-preview-only sessions: no access to PM finance tables at all.
- `admin_note` / internal finance notes: never returned by any owner- or tenant-facing RPC.
- Payment method / bank / card data: stored in a dedicated `pm_tenant_payment_methods` (5E) with `SELECT` restricted to `service_role` + the owning tenant's `auth.uid()` for **non-sensitive** columns (last4, brand); PANs never stored (Stripe token only).
- Every SECURITY DEFINER function pinned with `SET search_path = public`.

---

## 7. Reuse vs stay-separate summary

Reuse (patterns, not tables): PDF edge-function pattern, `send-notification`, `useOwnerScope`, `has_role`/`is_ops_staff`, private-bucket + signed URL pattern, audit_log writes.

Stay separate: invoices, invoice numbering, `finance_payments`, `finance_expenses`, `payment_settings`, `payment_method_authorizations`, customer Stripe surface, GST/PST invoice logic, pay stubs, job costing, service jobs, visits.

---

## 8. Stripe / payment risk notes

- Do not attach tenants to the existing customer Stripe `payment_settings`; they must have their own future config to avoid mixing payouts and customer descriptors.
- Do not extend `stripe-webhook` to also route rent events until 5E is planned — instead, add a **separate** `pm-stripe-webhook` function later so a rent-processing bug can never break customer invoice payments.
- Card-on-file for tenants must use a distinct Stripe Customer object namespace; never reuse a customer_id from `customers`.
- No live processing before 5E is separately approved.

---

## 9. PDF & reporting plan

- Owner statements → PDF via a new `pm-owner-statement-pdf` edge function modeled on `subcontractor-pay-stub-pdf`; stored in a private `owner-statements` bucket with 1-hour signed URLs.
- Owner-facing reports read from `SECURITY DEFINER` summary RPCs only.
- Ops reports can query tables directly under ops RLS.

---

## 10. QA plan (applies to each future sub-phase)

- RLS matrix test per role: admin, ops, finance, HR, worker, subcontractor, customer, tenant, property_owner, adminPreview-as-owner. Expected read/write per table documented before merge.
- Isolation tests: tenant A cannot read tenant B ledger; owner A cannot read owner B statements; owner cannot read `admin_note`; customer cannot see any `pm_*` finance row.
- Regression smoke: existing customer invoice create/send/pay, Stripe checkout, refund, GST report, pay stub PDF, service-job flow, tenant portal (existing), owner portal (Phase 4).
- Mobile: no changes to Capacitor/TWA config; verify PM screens render on iOS/Android web view.

---

## 11. Owner password hardening (only buildable item proposed for 5A — optional)

Additive, does not change any existing login flow:

- New table `pm_owner_security(user_id uuid pk, must_change_password bool default true, password_changed_at timestamptz, invited_at timestamptz)`.
- Row inserted by the existing `send-owner-invite` edge function at invite time; `must_change_password` flips to `false` the first time the owner successfully changes their password from the Owner Account page (existing UI, no route changes).
- Owner layout reads the flag via a small hook and, if `true`, shows a non-blocking banner and a one-tap "Change password now" link; no forced redirect on first load to avoid breaking existing logged-in owners.
- Existing owners (already invited pre-5A) get `must_change_password = false` on backfill so nothing changes for them.
- No impact on Admin/Tenant/Worker/Subcontractor/Customer login, Stripe, invoices, pay stubs, or mobile signing.

If you'd rather keep 5A **pure report-only**, we can defer this to 5B — just say the word.

---

## 12. Risks / blockers

- **Risk:** future rent Stripe work accidentally sharing the existing customer webhook. **Mitigation:** dedicated `pm-stripe-webhook` in 5E.
- **Risk:** owner sees another owner's data via a missing join filter. **Mitigation:** all owner reads go through `SECURITY DEFINER` RPCs that require `pm_owner_properties` membership.
- **Risk:** `admin_note` leaking into a tenant/owner query. **Mitigation:** no `SELECT *` in tenant/owner RPCs; explicit column lists reviewed in each sub-phase.
- **Risk:** GST/PST rules diverging between customer invoices and rent charges. **Mitigation:** residential rent is exempt in SK — no tax fields on `pm_rent_charges`; commercial rent handled with a dedicated `tax_treatment` enum in 5B.
- **Blocker candidate:** if you want tenants to eventually self-pay rent by card, we need a 5E Stripe planning report before any table shape is finalized so we don't box in the schema.

---

## What happens next

Reply with either:

- **"Approve 5A report, defer owner password hardening"** — I close 5A with no code changes and wait for 5B approval, or
- **"Approve 5A report and build the owner password hardening only"** — I ship only the `pm_owner_security` table + invite hook + owner banner as described in section 11, nothing else.

Nothing else will be built until you explicitly approve the next sub-phase.
