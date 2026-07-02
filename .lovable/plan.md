
# Property Management Module — Phase 0 Review & Phase 1 Plan

## Phase 0 — Technical Review (findings from current app)

**Roles & permissions**
- `app_role` enum (see `useUserRole.ts`) already includes: owner, admin, accountant, hr_admin, ops_manager, manager, dispatcher, supervisor, lead_worker, staff, customer, subcontractor.
- Access gating uses `user_roles` table + `has_role()` / `is_admin_or_owner()` / `is_ops_staff()` security-definer functions, plus `role_permissions` for permission keys.
- Route guards: `AppLayout` + `AdminRoute` / `ModuleGuard` in `App.tsx`; sidebar filtering via `useSidebarAccess` / `useModuleAccess`.

**Customer portal** — `/portal/*` routes, `customers.user_id -> auth.users`, `get_customer_id_for_user()` scopes RLS. Clean pattern to reuse.

**Worker / subcontractor** — `/worker/*`, `/subcontractor/*`. RLS via `is_worker_assigned_to_visit/_job`, `is_sub_assigned_to_visit/_job`. Assignments in `visits.assigned_worker_id`, `visit_crew_members`, `subcontractor_assignments`.

**Finance / invoices / Stripe / pay stubs** — mature: `invoices`, `invoice_line_items`, `finance_payments`, `subcontractor_pay_stubs`, Stripe edge functions, saved cards. **Do not touch.**

**Service requests / work orders** — `service_requests` → `quotes` → `jobs` → `visits` → `invoices`. Property-management maintenance in Phase 3 will slot in as a new `service_requests.source` and reuse jobs/visits — no schema fork needed later.

**RLS patterns** — every public table has explicit GRANTs + policies using `has_role`/`is_ops_staff`/scoped helpers. New tables will follow the same 4-step structure.

**Docs/files/photos** — private Supabase buckets (`hr-documents`, `visit-photos`, `attachments`, etc.) with path-prefix RLS on `storage.objects`. Lease documents will use a new `property-management-documents` private bucket.

**Mobile routing** — Capacitor + PWA share `App.tsx` routes. Adding admin-only routes has zero mobile impact; new portals (Phase 2/4) will register their own guarded routes later.

### Safety principles for this build
- Additive only — no changes to existing tables, enums, RLS, edge functions, or portals.
- New `app_role` values `tenant` and `property_owner` added to the enum, but **no** portal routes exposed in Phase 1 (routes gated / hidden).
- New tables live under a clear `pm_*` prefix to avoid collisions with the existing `properties` table (which is customer-service-property, not managed rental property).
- All new admin UI is behind a new `pm.manage` permission granted only to `owner` + `admin` (finance & ops staff intentionally NOT granted in Phase 1).

---

## Phase 1 — Admin Property Management Foundation

### 1. Database (single migration)

Enum additions:
- `ALTER TYPE public.app_role ADD VALUE 'tenant';`
- `ALTER TYPE public.app_role ADD VALUE 'property_owner';`

New tables (all with GRANTs → RLS enable → policies, plus `updated_at` trigger):

```text
pm_property_owners
  id, owner_name, company_name, email, phone,
  mailing_address, notes, user_id (nullable, future portal link),
  is_active, created_at, updated_at

pm_managed_properties
  id, property_name, address_line_1, city, province, postal_code,
  property_type (enum: single_family, duplex, multi_unit, condo, commercial, other),
  owner_id -> pm_property_owners (nullable),
  notes, is_active, created_at, updated_at

pm_units
  id, property_id -> pm_managed_properties (cascade),
  unit_label, bedrooms, bathrooms, rent_amount,
  status (enum: vacant, occupied, pending, inactive),
  notes, created_at, updated_at

pm_tenants
  id, first_name, last_name, email, phone,
  status (enum: active, pending, former),
  user_id (nullable, future portal link),
  notes, created_at, updated_at

pm_leases
  id, tenant_id -> pm_tenants,
  property_id -> pm_managed_properties,
  unit_id -> pm_units (nullable for whole-property leases),
  start_date, end_date, monthly_rent, deposit_amount,
  rent_due_day (1-31), status (enum: draft, active, ended, terminated),
  lease_document_path (storage key), notes,
  created_at, updated_at

pm_owner_properties  (join, for future multi-owner support & RLS)
  owner_id, property_id, primary key (owner_id, property_id)
```

Helper functions (SECURITY DEFINER):
- `pm_can_manage(_uid uuid)` → `is_admin_or_owner(_uid)`
- `pm_get_tenant_id_for_user(_uid uuid)` — Phase 2 use, safe to add now
- `pm_get_owner_id_for_user(_uid uuid)` — Phase 4 use, safe to add now

### 2. RLS policies (Phase 1 scope)

For every `pm_*` table:
- `SELECT/INSERT/UPDATE/DELETE` for `authenticated` where `pm_can_manage(auth.uid())` — admin/owner only.
- Forward-compatible read policies (added but scoped to nothing until Phase 2/4):
  - `pm_leases`, `pm_units`, `pm_managed_properties` (tenant's own only via `pm_get_tenant_id_for_user`).
  - `pm_managed_properties`, `pm_units`, `pm_leases` (owner's own only via `pm_owner_properties`).
- Finance / ops / HR / workers / subcontractors / customers: **no policy = no access** in Phase 1. Explicitly documented.

Storage: new **private** bucket `property-management-documents`, admin-only RLS on `storage.objects` (path `pm/{property_id}/...`).

### 3. Admin UI (all new files — nothing existing touched)

Sidebar: add one new collapsible group **"Property Management"** in `AppSidebar.tsx` (visible only when `pm.manage` permission present) with children:
- Dashboard, Properties, Units, Owners, Tenants, Leases.

New routes in `App.tsx` (wrapped in `AdminRoute` + permission check):
```
/property-management                → PMDashboard
/property-management/properties     → PMPropertiesList
/property-management/properties/:id → PMPropertyDetail
/property-management/units          → PMUnitsList
/property-management/owners         → PMOwnersList
/property-management/owners/:id     → PMOwnerDetail
/property-management/tenants        → PMTenantsList
/property-management/tenants/:id    → PMTenantDetail
/property-management/leases         → PMLeasesList
/property-management/leases/:id     → PMLeaseDetail
```

New files:
- `src/pages/property-management/PMDashboard.tsx` (KPIs: total properties, total units, occupied, vacant, active tenants, active leases; owner + tenant tables)
- `src/pages/property-management/PMPropertiesList.tsx` + `PMPropertyDetail.tsx`
- `src/pages/property-management/PMUnitsList.tsx`
- `src/pages/property-management/PMOwnersList.tsx` + `PMOwnerDetail.tsx`
- `src/pages/property-management/PMTenantsList.tsx` + `PMTenantDetail.tsx`
- `src/pages/property-management/PMLeasesList.tsx` + `PMLeaseDetail.tsx`
- `src/hooks/usePropertyManagement.ts` (queries + mutations)
- `src/components/property-management/PMPropertyForm.tsx`, `PMUnitForm.tsx`, `PMOwnerForm.tsx`, `PMTenantForm.tsx`, `PMLeaseForm.tsx`
- Sidebar section update (additive edit to `AppSidebar.tsx` only — new group).

Naming: reuses existing shadcn UI components + design tokens. No color/typography changes.

### 4. Permissions

Insert into `role_permissions`:
- `pm.manage` → owner, admin.
- (No grant to accountant / hr_admin / ops_manager / manager in Phase 1.)

`useModuleAccess` gets a new key `propertyManagement` returning `hasPermission('pm.manage')`.

### 5. Intentionally NOT built in Phase 1

- Tenant portal / property owner portal UI and routes.
- Rent charges, rent payments, Stripe rent processing.
- Owner statements, expense allocation, monthly summaries.
- Maintenance request → work order conversion.
- Move-in/move-out inspections, notices, mass documents.
- Any changes to existing `properties`, `jobs`, `visits`, `invoices`, `service_requests`, `finance_*`, `subcontractor_*`, pay stubs, Stripe, iOS/Android, or portals.

### 6. QA checklist (after Phase 1 ships)
1. Admin sees new "Property Management" sidebar group; non-admin roles do NOT.
2. Create property → unit → owner → tenant → lease end-to-end; all persist.
3. Dashboard counts update after each CRUD.
4. Lease document uploads to `property-management-documents` bucket; non-admin cannot download.
5. Login as customer / worker / subcontractor / accountant / HR: no PM routes accessible, no sidebar entry, direct URL returns Access Denied.
6. Existing flows unaffected: create a normal quote, job, visit, invoice, pay stub, service request, portal login, subcontractor login, worker mobile login — all still work.
7. Supabase linter clean on new tables (RLS enabled, no permissive gaps).

---

Reply **"Approved, build Phase 1"** and I'll ship the migration, RLS, sidebar entry, routes, and admin CRUD pages in one focused pass. If you want any table/field adjusted (e.g. drop `bedrooms/bathrooms`, add insurance fields, split residential vs commercial), tell me now and I'll fold it in before writing the migration.
