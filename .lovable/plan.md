# Phase 3 — PM Maintenance Request → Work Order Pipeline

Additive only. No changes to existing Admin/Worker/Sub/Customer/Finance/HR/Jobs/Visits/Invoices/Pay stubs/Stripe/mobile/auth workflows.

## 1. Schema (single migration)

**New table `public.pm_work_orders`** — dedicated PM work orders (kept separate from `jobs` so we don't disturb the existing job lifecycle, invoicing, or RLS surface). Fields:

- `id`, `work_order_number` (auto `WO-00001` via trigger + sequence)
- `maintenance_request_id` → `pm_maintenance_requests(id)` (unique, one WO per request in Phase 3)
- `property_id`, `unit_id`, `lease_id`, `tenant_id` (snapshot FKs)
- `title`, `description`, `category`, `issue_label`, `issue_key`, `priority`, `is_urgent_safety`
- `status` enum-like text: `created | assigned | in_progress | completed | cancelled`
- `assignee_type` (`worker | subcontractor | unassigned`)
- `assigned_worker_id` (uuid → auth user), `assigned_subcontractor_id` → `subcontractors(id)`
- `share_tenant_contact` bool (Admin toggle — otherwise workers don't see tenant phone/email)
- `access_notes`, `preferred_contact_time`, `permission_to_enter`
- `completion_notes` (internal), `tenant_visible_completion_note`, `completed_at`, `completed_by`
- `created_by`, `created_at`, `updated_at`

Trigger: on WO status change → mirror to parent `pm_maintenance_requests.status` using the extended set (`work_order_created | assigned | in_progress | completed | cancelled`). Existing tenant-facing statuses continue to work.

**Extend `pm_maintenance_requests`**: add `work_order_id uuid` (nullable, → pm_work_orders), widen `status` allowed values to include `work_order_created | assigned`. No enum change (column is text).

**New table `public.pm_work_order_attachments`** — before/after/completion photos uploaded by worker/sub. Fields: `id, work_order_id, storage_path, file_name, kind ('before'|'after'|'other'), tenant_visible bool default false, uploaded_by, created_at`. Uses existing `pm-maintenance-attachments` bucket under path `wo/<work_order_id>/…`.

**New table `public.pm_maintenance_activity`** — append-only audit trail: `id, request_id, work_order_id, actor_user_id, event ('submitted'|'reviewed'|'wo_created'|'assigned'|'status_changed'|'note_added'|'completed'|'tenant_notified'), detail jsonb, created_at`.

**GRANTS + RLS** for every new table (following project rules):
- `pm_work_orders`:
  - Admin/ops: full via `is_ops_staff(auth.uid())`.
  - Worker: SELECT/UPDATE own rows where `assigned_worker_id = auth.uid()` (limited columns via view for portal — actually enforced by only exposing safe columns in worker hook).
  - Subcontractor: SELECT/UPDATE where linked via `subcontractors.user_id = auth.uid()`.
  - Tenant: SELECT only rows tied to their tenant_id, and only a safe subset of columns (via a `pm_work_order_tenant_view` view — RLS on view + underlying).
- `pm_work_order_attachments`: admin full; worker/sub full for their WOs; tenant SELECT only where `tenant_visible = true`.
- `pm_maintenance_activity`: admin full; tenant SELECT own request rows filtered to safe events; worker/sub SELECT their WO events.

Storage bucket `pm-maintenance-attachments` (already exists, private) — reuse. Policies extended: allow worker/sub to insert under `wo/<work_order_id>/*` when assigned; tenant read for `tenant_visible` rows via signed URL from server (hook signs).

## 2. Hooks (new file `src/hooks/usePMWorkOrders.ts`)

- `useCreateWorkOrder(requestId, opts)` — inserts pm_work_orders, links `work_order_id` on request, sets request.status='work_order_created', logs activity, sends admin+worker notification via existing `send-notification`.
- `useAssignWorkOrder(workOrderId, {assignee_type, assigned_worker_id?, assigned_subcontractor_id?, share_tenant_contact})` — sets status='assigned', logs activity, notifies assignee.
- `useUpdateWorkOrderStatus`, `useCompleteWorkOrder(tenant_visible_note?)` — updates + syncs request completion.
- `useMyWorkOrders()` (worker/sub portal), `useWorkOrder(id)`, `useAdminWorkOrder(id)`.
- `useUploadWorkOrderAttachment(kind, tenant_visible)` + `useTenantWorkOrderView(requestId)` returning safe fields only.

## 3. UI

**Admin — `PMMaintenanceRequestDetail.tsx`**:
- Big "Create Work Order" button (hidden and replaced with amber "Admin-review only — non-repair" hint when catalog entry has `nonRepair: true`; admin can still override via secondary menu "Create Work Order anyway").
- After creation: "Work Order" card showing WO number, status, assignee, "Assign / Reassign" dialog (Worker picker from `team_members` where portal_worker; Subcontractor picker from `subcontractors`; "Keep unassigned"; toggle "Share tenant contact with assignee").
- Activity/history timeline (from `pm_maintenance_activity`).
- Existing internal notes + tenant-facing update fields stay.
- "Mark tenant-visible" checkbox on each attachment (updates a new `tenant_visible` bool on `pm_maintenance_request_attachments` — small additive column).

**Admin — new `PMWorkOrderDetail.tsx`** (route `/property-management/work-orders/:id`): full WO view with attachments, status controls, completion.

**Worker/Subcontractor portals** — new list & detail:
- `src/pages/worker/WorkerPMWorkOrders.tsx` list of assigned WOs.
- `src/pages/worker/WorkerPMWorkOrderDetail.tsx`: shows property address, unit, category/issue, priority, safety badge, description, access notes, permission to enter, tenant contact (only if `share_tenant_contact`), photos (signed URLs), status control (In Progress / Completed), completion notes + before/after photo upload.
- Mirror pages under `src/pages/subcontractor/`.
- Add sidebar entry ("PM Work Orders") gated by portal.
- Explicit exclusions: no pricing, no lease dates, no rent balance, no owner info, no internal admin notes.

**Tenant portal — `TenantMaintenanceDetail.tsx`** (existing): add a "Progress" section showing safe events from activity feed + admin-visible completion note + tenant-visible attachments. Never show internal notes, worker notes, or cost data.

## 4. Non-repair guardrail

`src/lib/maintenanceCatalog.ts` already flags `nonRepair`. In the admin detail page, look up the issue by `issue_key` and if `nonRepair === true`:
- Hide the primary "Create Work Order" CTA.
- Show a clear "Admin review only — non-repair concern" banner.
- Provide a secondary "Create Work Order anyway" action (rare escalations like a fire-alarm test call).
No auto-conversion anywhere.

## 5. Notifications

Reuse `send-notification`. Add whitelisted events: `pm_work_order_created`, `pm_work_order_assigned`, `pm_work_order_completed`. Recipients: `ops@praetoriagroup.ca` + assigned user (in-app). No tenant SMS/email in this phase (per launch constraints) — tenant sees updates in-portal.

## 6. QA Checklist (delivered in reply after build)

Admin / Tenant / Worker / Subcontractor / Security walkthroughs matching the ones in the request.

## Out of scope (as requested)

Rent payments, owner portal, owner statements, formal inspections module, PM finance/invoicing.

---

## Technical notes

- Kept separate from `jobs` table intentionally: converting to `jobs` would pull WOs into invoicing, quotes, visits, RLS surface for customers/subs used elsewhere — high blast radius. `pm_work_orders` is a small dedicated table that reuses shared building blocks (notifications, storage bucket, worker/sub role helpers) without touching the field-service pipeline. A future phase can add "escalate to Job" if needed.
- All new tables carry `GRANT` blocks per project rule.
- Trigger `pm_work_orders_sync_request_status` keeps `pm_maintenance_requests.status` in sync so existing tenant list/detail views work with zero changes.
