
# Phase 11 — Property Management Inspection Reports Foundation

Additive only. No changes to mobile packaging, Stripe, invoices, Finance, HR, payroll, service jobs, tenant ledger, owner statements, property expenses, worker/sub/customer portals, or unrelated systems.

## 1. Database (single migration)

### Enums
- `pm_inspection_type`: `move_in | move_out | routine | maintenance | safety | exterior | interior | seasonal | complaint_followup | other`
- `pm_inspection_status`: `draft | scheduled | in_progress | completed | reviewed | archived | cancelled`
- `pm_inspection_condition`: `excellent | good | fair | poor | damaged | needs_cleaning | not_applicable`

### `public.pm_inspections`
Fields: `title`, `inspection_type`, `status` (default `draft`), `inspected_at`, `scheduled_for`, `completed_at`, `reviewed_at`, links: `property_id`, `unit_id`, `tenant_id`, `owner_id`, `lease_id`, `move_in_id`, `move_out_id`, `maintenance_request_id`, `work_order_id`, `document_id`, `created_by`, `assigned_to` (auth.users), `summary`, `admin_notes`, `tenant_visible_notes`, `owner_visible_notes`, `tenant_visible` bool, `owner_visible` bool.

### `public.pm_inspection_items`
`inspection_id`, `area`, `item_label`, `condition` (enum), `notes`, `issue_found` bool, `repair_needed` bool, `cleaning_needed` bool, `tenant_visible` bool, `owner_visible` bool, `sort_order`, `photo_count` (int).

### `public.pm_inspection_photos`
`inspection_id`, `item_id` (nullable), `uploaded_by`, `file_path`, `file_name`, `file_size`, `mime_type`, `caption`, `tenant_visible` bool, `owner_visible` bool.

### `public.pm_inspection_activity`
`inspection_id`, `actor_id`, `action` (text), `detail` (jsonb), `visibility` (`internal_only|tenant_visible|owner_visible|tenant_and_owner_visible`).

Standard `created_at`/`updated_at` + trigger, GRANTs to `authenticated`/`service_role`, indexes on FKs and status.

### RLS
- **Ops staff / property_manager**: full manage on all four tables (via `is_ops_staff`).
- **Leasing agent** (via `has_role(auth.uid(),'leasing_agent')`): SELECT / limited UPDATE on inspections + items + photos + activity only when `assigned_to = auth.uid()`; may INSERT items/photos/activity for their own inspection.
- **Tenant**: SELECT on inspection when `tenant_visible = true AND status IN ('completed','reviewed') AND tenant matches (tenant_id via pm_tenants.user_id or lease chain)`. Items + photos: SELECT only when parent inspection is tenant-visible AND item/photo `tenant_visible = true`. Activity: SELECT only when `visibility IN ('tenant_visible','tenant_and_owner_visible')` and parent inspection tenant-visible.
- **Owner**: mirror rules using owner match (owner_id via pm_property_owners.user_id, pm_owner_properties, primary_owner_id).
- **Workers / subcontractors / customers / anon**: no policy → no access.

## 2. Storage

Create private bucket `pm-inspection-photos`. RLS on `storage.objects`:
- Ops staff: full manage.
- Leasing agent: SELECT/INSERT/UPDATE when photo row's inspection is assigned to them.
- Tenant: SELECT via EXISTS on `pm_inspection_photos` where photo `tenant_visible` AND parent inspection tenant-visible AND tenant-match.
- Owner: mirror.
- All downloads via signed URLs (no `getPublicUrl`).

## 3. Hooks

`src/hooks/pm/usePmInspections.ts`:
- `usePmInspections(filters)` — list + filter (property/unit/tenant/type/status/assigned/date)
- `usePmInspection(id)` — full record + items + photos + activity
- `useCreatePmInspection`, `useUpdatePmInspection`, `useAssignInspection`, `useCompleteInspection`, `useReviewInspection`, `useArchiveInspection`
- Items: `useUpsertInspectionItem`, `useDeleteInspectionItem`
- Photos: `useUploadInspectionPhoto` (writes to `pm-inspection-photos`), `useDeleteInspectionPhoto`, `signInspectionPhoto`
- Activity: `useLogInspectionActivity` + hook to fetch

## 4. Admin route `/property-management/inspections`

`PMInspectionsList.tsx` — filters (property, unit, tenant, type, status, assigned staff, date range) + create button.

`PMInspectionDetail.tsx` (`/property-management/inspections/:id`) — header (type/status/dates/assignee), links pickers (property/unit/tenant/lease/move-in/move-out/maintenance/work-order/document), summary, tenant_visible_notes, owner_visible_notes, admin_notes, items editor (add row per area with condition + issue/repair/cleaning flags + tenant/owner visibility), photo grid with upload + per-photo tenant/owner visibility toggles, activity timeline, actions: Assign / Start / Submit / Complete / Review / Archive.

Sidebar link under Property Management: "Inspections" (ClipboardCheck icon).

## 5. PM staff route `/pm-staff/inspections`

`pages/pm-staff/Inspections.tsx` — mobile-friendly list of inspections `assigned_to = auth.uid()` (filter status). Detail page `pages/pm-staff/InspectionDetail.tsx` (`/pm-staff/inspections/:id`) — read-only header, checklist edit, photo upload, notes, buttons: Start / Submit for review. No admin notes visible.

Add "Inspections" tile in PMStaffHome (safe — additive) linking to `/pm-staff/inspections`.

## 6. Tenant portal

Add hook `useTenantInspections` (relies on RLS). Add `pages/tenant/TenantInspections.tsx` route `/tenant/inspections` — lists tenant-visible completed inspections with type/date/summary + tenant-visible checklist items + tenant-visible photos (signed URLs). Add link card on TenantHome (safe placeholder if list empty). Bottom-nav untouched (spec says don't overcrowd).

## 7. Owner portal

Add hook `useOwnerInspections`. Add `pages/owner/OwnerInspections.tsx` route `/owner/inspections` — same shape for owner-visible. Owner bottom-nav untouched.

## 8. Integration entry points

Add "Inspections" section (list + "Create inspection" button) to:
- PMPropertyDetail (filter by property)
- PMTenantDetail (filter by tenant)
- PMLeaseDetail (filter by lease)
- PMMaintenanceRequestDetail (filter by maintenance_request_id)
- PMWorkOrderDetail (filter by work_order_id)

Deferred (no detail pages exist): unit / move-in / move-out.

## 9. Deferred (per spec)

E-signature, damage charges, auto deposit deductions, auto tenant ledger changes, auto expenses, auto work orders from findings, SMS/email automation, public links, AI detection, OCR, full PDF report generation, per-thread doc hub push (link column exists; UI in future phase).

## 10. QA

1. Admin creates a move-in inspection for a test unit/tenant.
2. Admin assigns to `junk@praetoriagroup.ca` (leasing agent).
3. Leasing agent signs in → `/pm-staff/inspections` shows only that record; other inspections don't appear.
4. Leasing agent opens, starts, updates checklist, uploads photo, submits.
5. Admin reviews and completes; toggles selected notes/photos tenant-visible; toggles others owner-visible; marks inspection tenant-visible / owner-visible.
6. Test tenant → sees only that inspection's tenant-visible summary, notes, items, photos.
7. Test owner → sees only owner-visible pieces for their property.
8. Other tenant/owner sees nothing. Worker/sub/customer/anon see nothing at DB and storage levels.
9. Photo URLs are signed (`createSignedUrl`); grep confirms no `getPublicUrl` for the bucket.
10. Confirm no other systems changed.

## Technical notes

- Migration order: enums → tables → GRANTs → ENABLE RLS → POLICIES → triggers. Storage bucket via `supabase--storage_create_bucket`; storage.objects policies via migration.
- Use existing `is_ops_staff` and `has_role(uuid, app_role)` helpers.
- `assigned_to` references `auth.users` (uuid, no FK per platform rules).
- Reuse `update_updated_at_column` trigger fn.
