
# Phase 7A — PM Finance Foundation

Backbone-only phase. No tenant payment UI, no Stripe wiring, no owner statements PDFs, no reminders. Those are Phases 7B–7F. This phase gives every later phase a single, auditable source of truth for PM money movement.

## Scope (in)

1. **Charge model** — formal `pm_charges` records (rent, late fee, deposit, utility, adjustment charge, other) with due date, period, status, source ref, tenant + lease + unit + property linkage.
2. **Payment model** — formal `pm_payments` records (method: cash, cheque, e‑transfer, card, ACH, manual, stripe placeholder), status (pending, cleared, failed, refunded, reversed), external ref, receipt number.
3. **Payment allocations** — `pm_payment_allocations` mapping one payment to one or many charges (partial payments, overpayments → credit).
4. **Credits & adjustments** — `pm_credits` (source: overpayment, goodwill, deposit refund, correction) with apply/consume tracking.
5. **Receipts** — `pm_receipts` records auto-created on cleared payment; unique receipt number (RCPT-#####); PDF generation deferred to 7C.
6. **Ledger unification** — refactor `pm_tenant_ledger` to be a *derived/append* view sourced from `pm_charges` + `pm_payments` + `pm_credits` + `pm_expenses` (owner-side). Keep `pm_get_tenant_balance` / `pm_my_balance` working; update to read from the normalized tables.
7. **Owner statement source data** — `pm_owner_statement_sources` view/materialization joining rent collected, expenses, management fees per property per period (statement rendering stays in 5D scope; this only feeds it cleanly).
8. **Finance RLS** — strict isolation:
   - Tenant sees own charges/payments/receipts/credits only.
   - Owner sees aggregate + own-property expense/rent totals, never other tenants' payment methods.
   - PM staff scoped by assignment (reuse existing helpers).
   - Ops/admin full.
9. **Transaction statuses & state machine** — enum + guard triggers preventing invalid transitions (e.g., cleared → pending).
10. **Audit / activity logging** — every insert/update on charges, payments, allocations, credits, receipts writes to `audit_log` via a shared trigger; also writes a plain-language row to `pm_finance_activity` for the future activity feed.
11. **Numbering sequences** — `CHG-#####`, `PAY-#####`, `RCPT-#####`, `CRD-#####` via triggers matching existing PM patterns.
12. **Backfill script** — one-shot migration to translate existing `pm_tenant_ledger` rows into `pm_charges` / `pm_payments` so nothing is lost and balances match to the cent.

## Scope (explicitly out — deferred)

- Tenant-facing pay button, card entry, Stripe checkout, e‑transfer instructions UI → **7B**
- Any PDF (receipts, invoices, statements) → **7C**
- Owner-facing finance dashboards / downloads → **7D**
- Payout setup, disbursements, reconciliation → **7E**
- Reminders, overdue notices, statement-ready emails → **7F**
- No changes to core company invoicing (`invoices`, `finance_payments`, Stripe) — PM finance stays in its own namespace.

## Technical outline

```text
pm_charges ───┐
              ├──> pm_payment_allocations <── pm_payments
pm_credits ───┘                                   │
                                                  ▼
                                            pm_receipts

pm_finance_activity  ◄── triggers on all four tables
audit_log            ◄── shared write_audit_log()
```

- One migration per concern (tables → grants → RLS → policies → triggers → backfill), each following the mandatory GRANT + RLS pattern.
- Security-definer RPCs for balance/aging so the tenant/owner portals never touch base tables directly.
- No frontend changes in 7A beyond removing now-dead direct writes to `pm_tenant_ledger` in admin tools (replaced with charge/payment RPC calls). Existing PM admin UIs keep working.

## Deliverables

- Migrations creating the 5 new tables + view, grants, RLS, triggers, sequences.
- Refactored `pm_get_tenant_balance` / `pm_my_balance` reading from normalized tables.
- Backfill migration with row-count + balance-parity check.
- Updated `usePMLedger` / related hooks to read the unified view (no visible UI change).
- QA note: tenant balance before vs after backfill must match exactly.

## Approval gate

Nothing in 7B–7F begins until 7A migrations are applied, backfill parity is verified, and you lock the phase.

Reply **approve 7A** to proceed, or send edits to this scope.
