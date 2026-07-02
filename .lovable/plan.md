# Tenant Portal — Direction & Phased Roadmap

Goal: align our Tenant Portal with proven patterns from Buildium, AppFolio, DoorLoop, TenantCloud, RentRedi, and Avail — without touching Admin, Worker, Subcontractor, Customer, Finance, HR, Stripe, saved cards, invoice logic, iOS/Android build config, or app store artifacts.

The current Home / Lease / Maintenance / Account pages (just polished) stay as the foundation. This plan adds only what's needed to make the next phases safe to build.

---

## Phase 2.5 — Structural Prep (this plan, safe to build now)

Only additive schema + a few disabled placeholders. No live payments, no messaging sends, no destructive changes.

### 1. Schema additions (all new columns/tables, nullable, safe)

**`pm_tenants`** — add optional fields to support business tenants and billing:
- `tenant_type` ('individual' | 'business', default 'individual')
- `business_name`, `billing_contact_name`, `billing_email`, `billing_phone`
- `mailing_address_line_1`, `mailing_city`, `mailing_province`, `mailing_postal_code`
- `po_reference`, `business_notes`

**`pm_leases`** — add optional fields already used by good tenant portals:
- `rent_frequency` ('monthly' | 'biweekly' | 'weekly' | 'end_of_month' | 'custom', default 'monthly')
- `deposit_amount`, `deposit_held_since`, `deposit_notes`

**New table `pm_tenant_ledger`** (read-only from tenant side, admin-managed):
- Columns: tenant_id, lease_id, entry_date, type ('charge' | 'payment' | 'credit' | 'refund' | 'late_fee' | 'deposit'), amount, description, reference, created_by
- RLS: tenants can SELECT own rows only; admins full access
- Used later to render "current balance", "next rent due", payment history, receipts

**New table `pm_tenant_notices`** (admin-published messages/notices):
- Columns: tenant_id (nullable = broadcast), property_id (nullable), title, body, category ('announcement' | 'notice' | 'document' | 'maintenance_update'), published_at, requires_ack, ack_at
- RLS: tenant sees rows where tenant_id = own OR (tenant_id IS NULL AND property_id = own property)

**New table `pm_tenant_documents`** (tenant-visible shared documents):
- Columns: tenant_id, property_id (nullable), title, storage_path, category, shared_at, shared_by
- Reuses existing `property-management-documents` bucket
- RLS: tenant SELECT own; admin full

All new public tables get GRANTs to `authenticated` + `service_role`, RLS enabled, tenant-scoped policies. Nothing exposed to `anon`.

### 2. UI scaffolding (visible but marked "Coming soon" where not wired)

- **Home dashboard**: add a "Balance & Next Rent" card that reads from `pm_tenant_ledger` when rows exist, otherwise shows a friendly "No balance on file" state. No payment buttons yet.
- **New `/tenant/payments` route**: placeholder screen listing planned payment methods (card, bank, Interac e-transfer, autopay) with a clear "Online payments coming soon — contact ops@praetoriagroup.ca to pay" banner. No Stripe wiring. Bottom nav stays 4 tabs; Payments accessible from Home card only.
- **New `/tenant/documents` route**: lists rows from `pm_tenant_documents` with signed-URL download; empty state if none. Linked from Lease page.
- **New `/tenant/notices` route**: lists `pm_tenant_notices` with unread indicator; linked from Home. No push/email sending yet — display only.
- **Maintenance**: no schema change needed; existing form already covers title, category, priority, description, files, access notes, status, tenant-facing update. Add a "Completion note" read-only block on detail page when status = completed.
- **Account page**: already has email, tenant name, linked property/unit, ops@ support link, privacy link, sign out, Request Account Deletion (goes through existing `account_deletion_requests` review flow — never auto-deletes lease/payment/legal data).

### 3. Support email

`ops@praetoriagroup.ca` continues as the single tenant-facing contact everywhere (Home, Account, Payments placeholder, empty states).

---

## Phase 3 — Maintenance ⇄ Work Orders (next after 2.5)

- Admin can convert a `pm_maintenance_request` into an internal Job/Visit assigned to a worker or subcontractor.
- Tenant sees only the tenant-facing status + update note (never worker names, pricing, or internal scope).
- No changes to worker/subcontractor portals beyond receiving the linked job.

## Phase 4 — Notices & Email Notifications

- Admin composes a notice → row in `pm_tenant_notices` → tenant sees it in-app.
- Optional email via existing `send-notification` edge function to tenant `billing_email` or auth email.
- No SMS.

## Phase 5 — Tenant Payments (requires explicit approval)

Ledger already exists from Phase 2.5, so admins can start recording manual payments (cash, cheque, Interac) any time without live processing. When approved:
- Wire Stripe card + ACH into a new `tenant-collect-rent` edge function, reusing existing Stripe secret and saved-card patterns already used by invoices (no changes to invoice logic).
- Autopay toggles per lease.
- Late-fee rule engine reads from `pm_leases` config.
- Receipts generated from ledger rows.

## Phase 6 — Business Tenant Enhancements

- Multiple billing contacts table.
- PO number on receipts.
- Consolidated statement PDF for multi-unit business tenants.

---

## Safety guarantees

- No changes to: Stripe keys, `finance_*` tables, `invoices`, saved cards, worker/subcontractor/customer/admin portals, HR, pay stubs, service jobs, iOS/Android/Capacitor config, app icons, package name `ca.praetoriagroup.opshub`, Play Store or App Store artifacts.
- All new tables are tenant-scoped via RLS; tenants can never query outside their own records.
- No live rent processing until explicitly approved in a Phase 5 kickoff.

---

## Technical notes

- Migrations run as a single additive batch; every new public table includes `GRANT` + RLS + tenant-scoped policy in the same migration.
- `useTenantPortal.ts` gains hooks: `useMyLedger`, `useMyNotices`, `useMyTenantDocuments` — all filter by `auth.uid()` via existing `pm_tenants.user_id` linkage.
- New routes registered inside existing `TenantRoute` guard in `App.tsx` — no changes to `WorkerRoute` / `SubcontractorRoute` / `PortalRoute` / `AdminRoute`.
- Payments placeholder page contains zero Stripe imports so it cannot accidentally charge anyone.

## Deliverable of Phase 2.5 (if you approve this plan)

1. One migration adding tenant/lease optional columns + 3 new tables with RLS.
2. Updated `useTenantPortal.ts` hooks.
3. New `/tenant/payments`, `/tenant/documents`, `/tenant/notices` routes (documents + notices functional read-only; payments placeholder).
4. Home dashboard gains Balance & Next Rent card + Notices preview.
5. Admin side gets a minimal "Post Notice" and "Share Document" action on the tenant detail page so you can test end-to-end.

Reply "approved" (or with edits) and I'll ship Phase 2.5.
