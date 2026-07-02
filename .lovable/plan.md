# Phase 5 — Property Management Finance (Planning Only)

No code will be written until you approve a specific sub-phase. Nothing in this plan touches Android/iOS/Play/App Store, app icons, signing, package name, Stripe, saved cards, existing invoice/payment logic, or the customer/tenant/worker/subcontractor/HR/service portals.

## Recommended sub-phase order

1. **5A** — Structure & security planning + password hardening for owners (foundation, low risk)
2. **5B** — Rent charges & tenant ledger (extends existing `pm_tenant_ledger`, no online payments)
3. **5C** — Property expenses (isolated PM tables, owner-visibility toggle)
4. **5D** — Owner statements (read-only aggregation + PDF)
5. **5E** — Payments / Stripe review (planning report only, no live processing)

Each sub-phase ends with a QA/security lock before the next begins.

## What we reuse vs keep separate

**Reuse (read-only or additive):**
- Existing `pm_tenant_ledger` from Phase 2.5 as the rent/charge/payment source of truth (extended, not replaced).
- Existing `pm_properties`, `pm_units`, `pm_leases`, `pm_tenants`, `pm_work_orders` for linkage.
- Existing notification system (`send-notification`), storage pattern (private buckets + signed URLs), and owner scope helpers (`useOwnerScope`, `is_property_owner_of`, `get_owner_property_ids`).
- Existing PDF edge function pattern (same approach as proof-of-service / pay stubs).

**Kept fully separate from customer Finance:**
- No writes to `invoices`, `invoice_line_items`, `finance_payments`, `finance_expenses`, `finance_bills`, `products_services`, `quotes`, or `jobs`.
- Rent is NOT a customer invoice. Rent charges live in PM-only tables with their own numbering (e.g. `RC-#####`, `RS-#####` for statements).
- Property expenses are PM-only and do NOT post to `finance_expenses` unless a future explicit bridge is approved.
- GST/PST logic on customer invoices is untouched. Rent is generally tax-exempt; PM expenses store tax fields as raw values only.

## Phase 5A — Structure & security planning

Deliverables (planning + tiny hardening migration only):

- Owner password hardening: add `must_change_password boolean default true` to `profiles` (or a `pm_owner_security` table if we want to avoid touching `profiles`) and gate `/owner/*` behind a "Set a new password" screen on first login. Same pattern applied to invited tenants for consistency. No effect on existing users (backfilled `false`).
- Confirm RLS helpers: `is_property_owner_of(property_id)`, `get_owner_property_ids()`, `pm_property_owner_can_view_tenant()` are already in place and will be reused.
- Confirm `SECURITY DEFINER` pattern for any cross-table aggregation (statements) to avoid RLS recursion.

## Phase 5B — Rent charges & tenant ledger

Proposed tables (new, PM-scoped):

- `pm_rent_schedules` — lease_id, frequency (`monthly|biweekly|weekly|end_of_month|custom`), amount, start_date, end_date, day_of_month/day_of_week, notes, active.
- `pm_rent_charges` — lease_id, tenant_id, property_id, unit_id, charge_type (`rent|late_fee|adjustment|credit|deposit`), amount, due_date, status (`unpaid|partial|paid|waived`), notes, created_by.
- `pm_rent_payments` — charge_id (nullable, for on-account), tenant_id, lease_id, amount, method (`cash|cheque|e_transfer|manual_card|other`), received_at, reference, notes, recorded_by. No Stripe wiring in 5B.
- `pm_security_deposits` — lease_id, amount_held, received_at, refunded_at, refund_amount, notes.

Ledger view: a SQL view or hook joining charges + payments + credits per lease. Existing `pm_tenant_ledger` becomes the display surface; new tables are the accounting source.

RLS:
- Tenant: read own lease's charges/payments/deposits only; no write.
- Owner: read charges/payments summarised for their properties (no tenant PII beyond what Phase 4 already allows).
- Admin/ops: full via `is_ops_staff()`.
- Grants: `authenticated` (SELECT/INSERT/UPDATE/DELETE gated by policy) + `service_role` ALL.

Tenant portal: balance card, upcoming charges, payment history. **No online payment.** "How to pay" instructions only.

## Phase 5C — Property expenses

New table `pm_property_expenses`: property_id, unit_id (nullable), work_order_id (nullable), category, vendor, amount, tax_amount, expense_date, receipt_path (private bucket), owner_visible bool default false, tenant_visible bool default false (rare), admin_notes, owner_notes, tenant_notes, created_by.

New private storage bucket `pm-expense-receipts` (signed URLs, 1h). RLS mirrors Phase 4 owner visibility: owners only see rows where `owner_visible = true` for their properties; tenants only see rows where `tenant_visible = true` for their lease's unit (rare use).

Does NOT write to `finance_expenses`. A future explicit bridge can be planned separately.

## Phase 5D — Owner statements

New tables:
- `pm_owner_statements` — owner_id, property_id, period_start, period_end, status (`draft|finalized`), totals (rent_charged, rent_collected, expenses, maintenance_owner_visible, mgmt_fee, net_payout), pdf_path, finalized_at.
- `pm_owner_statement_lines` — statement_id, line_type, source_table, source_id, description, amount, date. Snapshotted at finalize time so history is immutable.
- Optional `pm_management_fee_rules` — property_id, type (`percent|flat`), value, active.

Generation: admin-triggered edge function aggregates rent charges/payments, `owner_visible` expenses, `owner_visible` maintenance costs, mgmt fee. Draft is editable; finalize freezes lines + generates PDF via existing PDF pattern (private bucket `pm-owner-statements`, signed URL).

Owner portal: sees only `status = finalized` statements for their properties. Tenants: no access.

## Phase 5E — Payments / Stripe (planning report only)

Deliverable is a written risk/options report, not code. Will cover:
- Isolating rent Stripe flow from existing customer Stripe (separate product/price namespace, separate metadata, separate webhook routing keyed on `source: 'pm_rent'`).
- Card vs ACH/EFT (Canadian PADs) trade-offs and fee handling.
- Manual e-transfer recording (already covered by 5B `pm_rent_payments.method = 'e_transfer'`).
- Autopay: mandate storage, retry policy, failure notifications.
- Explicit approval gate before any live processing switch.

No changes to existing Stripe integration in 5E.

## Owner visibility plan

- Rent charges/payments: aggregate totals visible; no tenant PII beyond unit label.
- Expenses: only rows with `owner_visible = true`.
- Maintenance costs: only rows with `owner_visible = true` (from Phase 4 flags).
- Statements: only `finalized` status.
- Admin Preview continues via `/owner?adminPreview=<ownerId>` scope from Phase 4.

## Tenant visibility plan

- Own lease's charges, payments, credits, deposit balance, upcoming due dates.
- Cannot see other tenants, other units, property expenses (except rare `tenant_visible = true` rows), owner statements, mgmt fees, or owner payouts.

## PDF / reporting plan

- Reuse the edge-function PDF pattern (same stack as proof-of-service and pay stubs).
- Private buckets, 1h signed URLs, filename includes statement number + period.
- Print-friendly HTML view mirrors PDF for browser fallback.

## Stripe / payment risk notes

- 5B–5D introduce **zero** Stripe changes. All payments in 5B are manual records.
- 5E is planning-only. Live rent processing requires explicit written approval, separate secrets namespace, and a dedicated webhook route so existing invoice/subscription flows cannot be affected.
- Saved cards on existing customers remain untouched — PM tenants are a distinct entity set.

## QA plan (per sub-phase)

- RLS matrix test: admin / ops / owner (own vs other) / tenant (own vs other) / worker / subcontractor / anon — expected read/write outcomes documented and verified.
- Preview mode: admin previewing owner A cannot see owner B's data.
- Notification and email surfaces unchanged for non-PM flows.
- Regression smoke: create/send existing customer invoice, record a customer payment, run a service job → visit → invoice, generate a pay stub — all still work.
- Storage: signed URLs expire; buckets remain private; no public listing.

## Risks before building

1. Any migration that alters `profiles` risks the whole app — 5A will prefer a sidecar table or a nullable column with `default false` + explicit backfill.
2. Statement finalization must snapshot rows; live-joining sources would let later edits silently mutate history.
3. Owner-visibility toggles default to `false` everywhere to prevent accidental disclosure.
4. Rent tables must never be confused with customer `invoices` — separate numbering, separate hooks, separate pages, no shared components without explicit prop guards.
5. Late-fee automation is out of scope for 5B (manual only) to avoid surprise charges.

## Not changing

Android, Google Play, iOS, App Store, app icons, signing, package name, Stripe, saved cards, existing invoice payment logic, customer portal, tenant portal (beyond additive ledger surface), worker portal, subcontractor portal, HR, Finance, pay stubs, service jobs, existing visits/jobs.

---

Approve this plan (or edit sub-phases) and tell me which sub-phase to start with — I'd recommend **5A** first.
