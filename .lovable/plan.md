# Phase 6B — Move-Out Workflow + Staff Assignment Foundation

## Scope
Additive only. Extends PM Staff / Leasing Agent portal with move-out workflow, staff assignment support, unit-scoped assignments, cross-staff task assignment, and an in-app notification foundation. No changes to Admin/Finance/HR/Stripe/Owner/Tenant/Worker/Sub/Customer portals or mobile packaging.

## Database Changes (single migration)

**New tables**
- `pm_move_outs` — property_id, unit_id, tenant_id, lease_id, assigned_staff_id, move_out_date, notice_received_date, inspection_date, status (enum-like text with allowed set), tenant_instructions_sent_at, keys_returned, garage_opener_returned, parking_pass_returned, final_meter_reading, tenant_visible_notes, admin_notes, created_by, timestamps.
- `pm_move_out_checklist_items` — move_out_id, label, category, is_complete, completed_at, completed_by, notes, sort_order.
- `pm_move_out_inspections` — move_out_id, general_condition_notes, damage_notes, cleaning_notes, keys_remotes_returned, tenant_visible, admin_only_notes, inspected_by, inspected_at, timestamps.
- `pm_move_out_inspection_photos` — inspection_id, storage_path, caption, uploaded_by, created_at.

**Extend existing tables (nullable columns)**
- `pm_prospects.assigned_staff_id`, `pm_showings.assigned_staff_id`, `pm_applications.assigned_staff_id`, `pm_move_in_checklists.assigned_staff_id` — all nullable UUIDs.
- `pm_staff_tasks.assigned_staff_id`, `pm_staff_tasks.unit_id`, `pm_staff_tasks.move_out_id`, `pm_staff_tasks.move_in_id`, `pm_staff_tasks.prospect_id`, `pm_staff_tasks.application_id` — nullable link columns (only add ones missing).

**Helpers / policies**
- Reuse `is_ops_staff()`, `is_pm_staff()`, `is_leasing_agent()`, `has_role('property_manager')`.
- New helper `is_property_manager(uuid)`.
- RLS pattern for all new/updated tables:
  - Ops staff and property_manager: full SELECT/INSERT/UPDATE within PM scope, DELETE ops-only.
  - Leasing agent: SELECT/UPDATE only rows where `assigned_staff_id = auth.uid()` (or checklist/inspection rows whose parent move-out is assigned to them).
- GRANTs to `authenticated` + `service_role` on every new table.

**Notifications**
- Reuse existing `notifications` table (event/audience/recipient_id). Add DB triggers:
  - Move-out inserted → notify assigned staff (if set).
  - `pm_staff_tasks` inserted/assigned → notify assigned staff.
  - `pm_showings.assigned_staff_id` set → notify staff.
- No SMS/email — in-app only.

**Storage**
- Reuse existing `pm-inspections` bucket if present, else create private `pm-move-out-photos` bucket with RLS: ops/pm_staff read+write, leasing agent limited to move-outs assigned to them.

## Frontend Changes

**New files**
- `src/pages/pm-staff/MoveOuts.tsx` — list view (filters: mine / all / status).
- `src/pages/pm-staff/MoveOutDetail.tsx` — details, checklist, inspection, photo upload.
- `src/pages/property-management/PMMoveOutsList.tsx` — admin list.
- `src/pages/property-management/PMMoveOutDetail.tsx` — admin edit + assign staff.
- `src/components/pm/MoveOutChecklist.tsx` — shared checklist component.
- `src/components/pm/MoveOutInspectionForm.tsx` — inspection form.
- `src/hooks/usePMMoveOuts.ts`, `usePMMoveOutChecklist.ts`, `usePMMoveOutInspection.ts`.

**Updated files**
- `src/App.tsx` — routes: `/pm-staff/move-outs`, `/pm-staff/move-outs/:id`, `/property-management/move-outs`, `/property-management/move-outs/:id`.
- `src/pages/pm-staff/More.tsx` — add Move-Outs card + "Lease Renewals (Coming soon)" placeholder card.
- `src/pages/pm-staff/PMStaffHome.tsx` — add Move-Outs KPI + upcoming list.
- `src/pages/pm-staff/Tasks.tsx` — filter by `assigned_staff_id = me`.
- `src/pages/pm-staff/Showings.tsx`, `Prospects.tsx`, `Applications.tsx`, `MoveIns.tsx` — respect `assigned_staff_id` for leasing_agent views (mine only), all for property_manager/ops.
- `src/components/pm-staff/PMStaffFAB.tsx` — add "New Move-Out" quick action.
- `src/components/AppSidebar.tsx` — add "Move-Outs" under Property Management group.
- Admin task form / assignment dialogs — add staff picker (leasing_agent + property_manager users).

**Guards**
- All `/pm-staff/*` routes remain behind `PMStaffRoute`. Admin routes behind existing ops guard.

## Deferred (explicit)
Full lease renewal workflow, e-signature, deposit deduction automation, legal notices, Stripe/online payments, owner payouts, board portal, approval workflow, credit/background checks, SMS/email automation.

## QA Steps
1. Admin creates a move-out at `/property-management/move-outs`, assigns to TEST Leasing Agent.
2. Log in as `junk@praetoriagroup.ca` → `/pm-staff/move-outs` shows only assigned move-out.
3. Leasing agent updates checklist items and uploads a photo.
4. Leasing agent cannot see unassigned move-outs, tasks, or applications.
5. Worker/sub/tenant/owner/customer accounts hit `/pm-staff/move-outs` → redirected.
6. Confirm Finance/Stripe/owner statements/tenant ledger/pay stubs untouched.
7. Property manager account sees broader PM work but no Admin/Finance/HR.

## Non-Goals / Untouched
Android, iOS, Google Play, App Store, package name, app icons, signing, Stripe, saved cards, invoice payment logic, tenant portal, owner portal, customer portal, worker portal, subcontractor portal, Finance, HR, pay stubs, service jobs, existing visits/jobs, owner statements, tenant ledger, property expenses.
