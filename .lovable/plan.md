# Phase 6 — Property Management Staff / Leasing Agent Portal Foundation

Additive-only. No changes to Admin, Tenant, Owner, Worker, Subcontractor, Customer, Finance, HR, Stripe, invoices, payments, mobile builds, or auth. Uses the existing PM emerald theme with a subtle indigo accent to distinguish the staff portal.

## Roles

Add two values to the existing `app_role` enum:
- `property_manager`
- `leasing_agent`

Add helper functions (SECURITY DEFINER, mirroring `has_role`/`is_ops_staff` pattern):
- `is_pm_staff(uid)` → true for `property_manager` or `leasing_agent` (or admin/owner)
- `is_leasing_agent(uid)`
- `is_property_manager(uid)`

Admin assigns these via existing user_roles UI (Personnel → role toggle). No new invite flow this phase.

## Database (new tables, all under `public`, RLS on, GRANTs included)

1. `pm_prospects` — name, email, phone, preferred_contact, property_id, unit_id, desired_move_in, budget_min, budget_max, occupants, pets, parking, source, status, notes, assigned_to, created_by, timestamps.
2. `pm_showings` — prospect_id, property_id, unit_id, scheduled_at, showing_type, assigned_to, status, notes, follow_up_required.
3. `pm_applications` — prospect_id, property_id, unit_id, status, submitted_at, desired_move_in, notes, admin_review_status, timestamps. (No SIN/credit fields.)
4. `pm_application_documents` — application_id, file_url, label, uploaded_by (simple metadata table; uses existing `attachments` bucket).
5. `pm_move_in_checklists` — lease_id (nullable), prospect_id (nullable), property_id, unit_id, assigned_to, status, timestamps.
6. `pm_move_in_checklist_items` — checklist_id, label, category, completed, completed_by, completed_at, notes, sort_order. Seeded with the standard items from the request.
7. `pm_move_out_checklists` + `pm_move_out_checklist_items` — same shape, tagged as Phase 6B placeholder (tables created but only a stub UI page).
8. `pm_staff_tasks` — title, description, assigned_to, property_id, unit_id, prospect_id, application_id, due_date, priority, status, notes.

### RLS

- **Admin / owner / property_manager**: full SELECT/INSERT/UPDATE/DELETE on all 8 tables.
- **Leasing agent**: SELECT/INSERT/UPDATE on prospects, showings, applications, application_documents, move_in_checklists, move_in_checklist_items, staff_tasks. No DELETE. No access to move_out tables. No access to `pm_tenant_ledger`, `pm_expenses`, `pm_owner_statements`, `pm_leases` write, finance, HR, Stripe.
- **Everyone else** (worker, subcontractor, tenant, property_owner, customer, anon): denied.

Existing tables (`pm_managed_properties`, `pm_units`, `pm_tenants`, `pm_leases`, `pm_maintenance_requests`) get additive policies so `property_manager` reads/writes as ops staff, and `leasing_agent` gets read-only on properties/units and read on tenants (name/email/phone only via UI-level filtering — no ledger/banking).

## Routes & Files

New portal mounted at `/pm-staff/*`, guarded by `ModuleGuard` requiring `is_pm_staff`.

```
src/pages/pm-staff/
  PMStaffLayout.tsx        — emerald header, indigo accent, bottom nav (Home, Vacancies, Prospects, Showings, Tasks, More)
  PMStaffHome.tsx          — dashboard: vacant units, upcoming showings, pending apps, upcoming move-ins/outs, open maint summary, my tasks, quick actions
  Vacancies.tsx            — list vacant units with quick actions
  Prospects.tsx + ProspectDetail.tsx
  Showings.tsx + ShowingDetail.tsx
  Applications.tsx + ApplicationDetail.tsx
  MoveIns.tsx + MoveInChecklistDetail.tsx
  MoveOuts.tsx             — Phase 6B stub
  Tasks.tsx
  Account.tsx              — profile + sign out (reuses existing account patterns)
src/hooks/pm-staff/
  useProspects.ts, useShowings.ts, useApplications.ts, useMoveInChecklists.ts, useStaffTasks.ts, useVacantUnits.ts
src/components/pm-staff/
  ProspectDialog.tsx, ShowingDialog.tsx, ApplicationDialog.tsx, StaffTaskDialog.tsx, MoveInChecklistCard.tsx
```

Route registration in `src/App.tsx` (append-only inside existing routes block).

Admin gets one deep-link in existing PM section: "Staff / Leasing" → `/pm-staff` (no restructure of admin nav).

## UI

- Emerald primary (matches PM), with an indigo `--pm-staff-accent` for the top bar and active nav item so the portal is visually distinct.
- Mobile-first, bottom nav with 5 items + More sheet.
- Status labels via existing `statusLabel.ts`.
- All lists paginated, empty states with primary CTA.

## Out of scope (explicit)

Credit/background checks, application fees, online rent, Stripe, owner payouts, board portal, calendar sync, lease generation, e-signing, HR/finance access, mobile/build config, any change to existing portals.

## QA plan (delivered in completion report)

1. Admin assigns `leasing_agent` role to a test user via Personnel.
2. Test user signs in → redirected to `/pm-staff`.
3. Verify visible: Home, Vacancies, Prospects, Showings, Applications, Tasks, Move-In, Account.
4. Verify blocked (redirects/404): `/admin`, `/finance`, `/hr`, `/worker`, `/subcontractor`, `/tenant`, `/owner`, `/customer-portal`.
5. Confirm leasing agent cannot read `pm_tenant_ledger`, `pm_expenses`, `pm_owner_statements` via network tab.
6. Assign `property_manager` to another test user; verify broader PM access, still blocked from finance/HR/Stripe.
7. Confirm worker/subcontractor/tenant/owner/customer roles cannot reach `/pm-staff`.
8. Regression smoke: open Admin dashboard, Owner Portal (`latchminpersaud13@gmail.com`), a tenant login, an invoice, a job — nothing changed.

## Migration order

1. Enum add + helper functions.
2. New tables + GRANTs + RLS.
3. Additive policies on existing PM tables for the two new roles.
4. Frontend routes/pages/hooks.
5. Seed default move-in checklist items on insert via trigger.

Ready to build on approval.
