
# Phase 10 — Property Management Document Hub

Additive only. No changes to Android/iOS packaging, Stripe, Finance, HR, payroll, Worker/Sub/Customer portals, tenant ledger, owner statements logic, invoices, jobs, or unrelated systems.

## 1. Database

New table `public.pm_documents` with fields:
- `id`, `created_at`, `updated_at`, `uploaded_by`
- `title`, `description`, `document_type`, `category`
- Relations (all nullable): `property_id`, `unit_id`, `owner_id`, `tenant_id`, `lease_id`, `maintenance_request_id`, `work_order_id`, `expense_id`, `owner_statement_id`, `owner_approval_id`, `owner_thread_id`, `tenant_thread_id`, `lease_renewal_id`, `move_in_id`, `move_out_id`, `inspection_id`, `notice_id`
- `file_path`, `file_name`, `file_size`, `mime_type`
- `visibility` enum: `internal_only | tenant_visible | owner_visible | tenant_and_owner_visible`
- Convenience booleans `owner_visible`, `tenant_visible` (derived, kept for filtering)
- `status` enum: `active | archived | expired | deleted`
- `expires_at` (nullable)

Grants: `SELECT/INSERT/UPDATE/DELETE` to `authenticated`; `ALL` to `service_role`. Enable RLS.

RLS policies:
- ops staff (`is_ops_staff` / property_manager role): full manage
- tenant: `SELECT` where `visibility in (tenant_visible, tenant_and_owner_visible)` AND doc's `tenant_id` maps to the current user's tenant record
- owner: `SELECT` where `visibility in (owner_visible, tenant_and_owner_visible)` AND doc's `owner_id` matches current owner (or `property_id` in owner's assigned properties)
- workers/subs/customers/anon: no access
- `updated_at` trigger

## 2. Storage

Create private bucket `pm-documents` (public=false). Storage.objects RLS:
- ops staff: full manage under `pm-documents/`
- tenant/owner: `SELECT` only when a matching `pm_documents` row exists for their scope and visibility (via EXISTS check on `file_path`)
- others: no access
- All downloads go through signed URLs (edge helper or `supabase.storage.createSignedUrl`)

## 3. Admin route

`/property-management/documents` — `PMDocumentsList.tsx`
- Filters: property, unit, owner, tenant, category/type, visibility, search
- Actions: Upload (with picker of related record + visibility + type), archive, download (signed URL), view
- Reusable `<PMDocumentUploadDialog>` component

## 4. Integration entry points (Phase 10 scope)

Add "Documents" section / "Upload Document" button to:
- PMPropertyDetail
- PMTenantDetail
- PMOwnerDetail
- PMLeaseDetail
- PMMaintenanceRequestDetail
- PMWorkOrderDetail

(Move-in/Move-out/renewal detail pages don't exist yet as standalone detail routes; deferred as noted.)

## 5. Tenant / Owner portals

- `TenantDocuments.tsx`: add PM Documents section listing tenant-visible docs for the tenant's lease/unit/property with signed-URL download.
- `OwnerDocuments.tsx`: add PM Documents section listing owner-visible docs for owner's assigned properties with signed-URL download.
- Existing customer/tenant/owner document tables remain untouched.

## 6. Navigation

- Admin sidebar (Property Management): add "Documents" link → `/property-management/documents`.
- Tenant/Owner: reuse existing Documents pages — no new bottom-nav entries.

## 7. Not built (deferred, per spec)

E-signature, legal generation, public links, SMS/email delivery, OCR, AI review, tenant↔owner sharing, worker/sub access, HR/Finance/Stripe changes, leasing-agent per-thread access, move-in/out/renewal/notice detail attach buttons.

## 8. QA (manual)

1. Admin uploads `internal_only` doc → tenant & owner cannot see.
2. Admin uploads `tenant_visible` linked to tenant A → tenant A sees, tenant B does not, owner does not.
3. Admin uploads `owner_visible` linked to owner X / property P → owner X sees, owner Y does not, tenant does not.
4. Worker/sub/customer/anon → no access.
5. Signed URLs open; no public URL is generated.
6. No other systems touched.

## Technical notes

- Migration is one call (schema only). Data reads/writes happen from the app after regenerated types land.
- Signed URL TTL: 3600s default.
- Reuse existing `has_role` / `is_ops_staff` helpers; do not add new role tables.
- Table follows the required order: CREATE → GRANT → ENABLE RLS → POLICIES → trigger.
