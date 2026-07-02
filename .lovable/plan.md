## Phase 4 — Property Owner Portal Foundation

A partial Phase 4 already exists (`/owner` routes, `OwnerLayout`, `useOwnerPortal`, `send-owner-invite` edge function, `pm_owner_properties` link table). Before I rewrite anything, I want to confirm scope so I don't accidentally break what's already live.

### Two questions before I build

1. **Routes:** the spec says `/property-owner/*`, but the existing portal is already mounted at `/owner/*` and used by the invite flow. Do you want me to:
   - **(A)** keep `/owner/*` (safer, additive, no auth/redirect breakage), or
   - **(B)** migrate to `/property-owner/*` (adds redirect from `/owner/*`, more work, small risk).

2. **"From scratch"**: do you want me to delete the current owner portal files and rebuild, or **extend** what's there to hit every Phase 4 item you listed? Extending is safer and faster; a full rebuild risks breaking the invite flow you already tested.

### What I will build (assuming A + extend)

**Database (additive migration)**
- `pm_owner_documents` table (owner-visible docs), private `owner-documents` storage bucket, signed-URL access, RLS scoped through `pm_owner_properties`.
- Add `owner_visible` boolean flags to `pm_maintenance_requests` and `pm_work_orders` (default false) plus `owner_visible_summary` / `owner_visible_completion_note` text.
- `pm_owner_account_deletion_requests` table (or reuse `account_deletion_requests` with `requester_type='property_owner'`).
- RLS helper functions already present (`is_property_owner_of`, `get_owner_property_ids`) — verify + tighten. Add `SECURITY DEFINER` read functions for maintenance/work-order/document lists to avoid recursion.
- GRANTs for every new table.

**Owner portal pages**
- `OwnerHome` — welcome, KPI cards (properties, units, occupied, vacant, open maintenance), recent activity, docs shortcut, PM contact.
- `OwnerProperties` — list of assigned properties with unit/occupancy/open-maintenance counts.
- `OwnerPropertyDetail` — summary, units, occupancy, lease active/ending/ended chip only, owner-visible maintenance list, owner-visible docs, PM contact.
- `OwnerMaintenance` — all owner-visible requests + WOs across assigned properties, filters, owner-facing summary only.
- `OwnerDocuments` **(new)** — list of owner-visible docs with signed-URL open/download.
- `OwnerAccount` — profile, assigned properties, support, privacy, Request Account Deletion, sign out.
- Emerald theme, mobile-first, bottom nav: Home / Properties / Maintenance / Documents / Account.

**Admin side**
- Confirm "Invite to Owner Portal" on `PMOwnerDetail` (already wired via `send-owner-invite`) shows "Portal linked" badge.
- Owner-visible toggles on maintenance request + WO admin pages (checkbox + summary/completion textareas).
- Owner document upload UI on `PMOwnerDetail` and property detail (admin only).
- **Admin Preview** button on `PMOwnerDetail` → opens owner portal in preview mode with amber banner "Admin Preview — read-only". Read-only enforced by a preview context flag that disables all mutating buttons; audit writes tagged `admin_preview=true`.

**Guardrails (won't touch)**
- No changes to tenant, worker, subcontractor, customer, admin, finance, HR, invoices, jobs, visits, pay stubs, Stripe, mobile config, package name, icons, signing, auth flow.
- Additive migrations only; no revoked grants (the prior Phase 4 regression).
- Every new `public` table gets `GRANT ... TO authenticated; GRANT ALL ... TO service_role;` in the same migration.

### Intentionally not built (Phase 5)
Live rent, payouts, owner statements, Stripe rent, accounting reports.

### Please reply with A or B, and confirm "extend" vs "rebuild from scratch" so I proceed correctly.
