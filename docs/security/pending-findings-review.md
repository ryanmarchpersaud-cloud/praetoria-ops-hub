# Pending Security Findings — Review Required

**Created:** 2026-06-08  
**Status:** Documented only. **No code, schema, storage, RLS, Stripe, auth, routing, or portal changes made.** Awaiting Ryan's per-item approval before any implementation.

The Pay Stub print XSS finding (#3 in the original scan) has been fixed in `src/components/PayStubDetailDialog.tsx` and added to the iOS Build 11 checklist. The 6 findings below are **not** fixed yet — each one touches a locked area (RLS / storage privacy / Stripe / realtime / portal access) and needs separate approval and behavioral testing.

---

## 1. `customers` table — workers/subs read full PII
- **Scanner ID:** `customers_table_worker_sub_access` (error)
- **Risk:** Workers and subcontractors can read customer billing email, secondary email, accounts_payable_email, billing address, and internal notes for any customer linked to their assigned jobs/visits. Only minimum contact info (name, service address, on-site phone) is needed for field work.
- **Locked area:** Supabase RLS policies on `customers` (the most-touched table in the app).
- **Impact if changed:** Every worker/sub portal screen that reads customer data must be re-tested — schedule cards, visit detail, job detail, site alerts, navigation links, customer profile peek, communications. Risk of breaking field-work flows if a needed column is now hidden.
- **Recommended approach (for review):** Create a `customers_field_safe` SECURITY DEFINER view exposing only `id, first_name, last_name, company_name, service phone, service address, special instructions`. Update worker/sub-facing hooks (`useCustomers`, visit/job detail queries) to read from the view. Keep the existing table RLS untouched for ops staff.
- **Estimated test surface:** Worker portal + Subcontractor portal — every screen that reads customer fields.

## 2. `integration_logs` — non-customers can read recipient contact data
- **Scanner ID:** `integration_logs_worker_readable` (error)
- **Risk:** The "Staff can view integration logs" policy grants SELECT to any authenticated user who is not a customer. The `recipient` column contains outbound email/phone for notifications, exposing customer contact data to workers, subs, dispatchers, etc.
- **Locked area:** Supabase RLS policies.
- **Impact if changed:** Drop the broad policy; rely on the existing admin/manager-scoped policy. Anyone non-admin who currently views the Integration Logs / Audit screens may lose access. Need to confirm whether dispatchers or supervisors actually use the logs UI.
- **Recommended approach (for review):** Drop the broad `Staff can view integration logs` policy. Verify only `/audit-log`, `/connected-apps`, `/auth-email-health`, and `/integrations` admin pages query this table.

## 3. `attachments` storage bucket is public
- **Scanner ID:** `attachments_bucket_public` (warn)
- **Risk:** The bucket is configured public. Customer documents, agreement files, and uploaded attachments could be served by the Supabase CDN to anonymous users who know or guess the object path. Object paths use predictable patterns like `customer-documents/{customer_id}/{timestamp}-{uuid}.{ext}` — UUID is high-entropy, but the public flag still bypasses auth.
- **Locked area:** Storage privacy. Parallels the pending `property-photos` private migration decision (already documented at `docs/security/property-photos-private-migration-plan.md`).
- **Impact if changed:** Many code paths already use `createSignedUrl` (CustomerDocumentsCard, IncidentAttachmentsList, agreement signatures, worker docs) — those continue to work after the flip. BUT any place that builds a raw `getPublicUrl()` or hardcoded `/storage/v1/object/public/attachments/...` URL will break. Need a full audit of `getPublicUrl` call sites under `attachments/` before flipping.
- **Recommended approach (for review):** Same staged migration plan as property-photos: audit `getPublicUrl` call sites → migrate to signed URLs → flip bucket private in a separate migration.

## 4. `avatars` storage bucket is public
- **Scanner ID:** `avatars_bucket_public` (warn)
- **Risk:** Profile photos of workers/subs/staff enumerable by anyone who can guess object paths (paths are typically `{user_uuid}/avatar.jpg`). UUIDs leak via JWT and various API responses.
- **Locked area:** Storage privacy.
- **Impact if changed:** Avatars are rendered throughout the app — header user menu, employee lists, schedule cards, messaging, crew assignments. All read sites must switch from `getPublicUrl` to signed URLs (15-min TTL). Performance impact: extra signed-URL round trips per avatar render unless cached.
- **Recommended approach (for review):** Build an `useSignedAvatarUrl(path)` hook with in-memory cache + 10-min refresh, migrate read sites, then flip bucket private.

## 5. `customer_billing_profiles.processor_customer_id` exposed to customers
- **Scanner ID:** `customer_billing_profiles_processor_id` (warn)
- **Risk:** Customer RLS allows reading own row, which includes the Stripe `processor_customer_id`. A leaked Stripe customer ID can be used in some enumeration attacks against the Stripe API (limited blast radius — the attacker still needs a Stripe secret key to do damage).
- **Locked area:** **Stripe / payment logic.** Per launch rules this is off-limits without explicit approval.
- **Impact if changed:** Customer portal billing screens (`PortalBilling`, `PaymentsSettingsPage`, saved-card display) may currently read this column. Edge functions (`setup-payment-method`, `create-checkout`, `collect-payment`, `sync-payment-method`, `stripe-webhook`) all touch it server-side and are unaffected.
- **Recommended approach (for review):** Either (a) add a column-level RLS restriction excluding `processor_customer_id`, `default_payment_method_id` from customer-role reads via a customer-facing view, or (b) restructure portal hooks to use an edge function instead of direct table read. Both require Stripe-flow regression testing.

## 6. `realtime.messages` channel authorization gap
- **Scanner ID:** `realtime_channel_authorization_gap` (warn)
- **Risk:** Only `is_ops_staff` has SELECT on `realtime.messages`. Workers/subs/customers either (a) can't receive legitimate realtime events at all, or (b) if they somehow can, there's no topic-scoping to block them subscribing to arbitrary topics. Underlying per-table RLS still filters row payloads, so this is a defense-in-depth gap rather than a direct data leak.
- **Locked area:** Supabase RLS + realtime + portal behavior. Several portals depend on realtime (messaging, notifications, incident feed, video calls).
- **Impact if changed:** Adding topic-scoped policies for worker/sub/customer realtime subscriptions could silently re-enable channels that are currently failing, or break ones that currently work. Need to map each `supabase.channel(...)` call site to a topic pattern first.
- **Recommended approach (for review):** Audit every `supabase.channel(...)` subscription in the app, document the topic pattern and required role, then add topic-scoped `realtime.messages` SELECT policies per role.

---

## Decision queue

Each item above needs a separate go/no-go from Ryan before any code, migration, or storage change. Ordering suggestion (highest risk → lowest):

1. **#1 customers RLS** (error, PII leak to field staff)
2. **#2 integration_logs RLS** (error, customer contact leak to non-admins)
3. **#3 attachments bucket** (warn, but stores customer docs)
4. **#5 Stripe processor_customer_id** (warn, Stripe surface)
5. **#4 avatars bucket** (warn, low-sensitivity content)
6. **#6 realtime topic scoping** (warn, defense-in-depth)
