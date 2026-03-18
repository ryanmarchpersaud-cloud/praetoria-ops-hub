

## Plan: Build Missing Admin Settings Pages

Currently the Settings section only has 3 pages: General, Integrations, and Manage Team. The user wants 5 additional admin control plane sections built out. Here is what exists vs. what needs to be created:

| Section | Status | Action |
|---------|--------|--------|
| Manage Team | Done | Already built |
| Roles & Permissions | Missing | New page |
| Audit Log | Missing | New page |
| Connected Apps | Missing | New page |
| Seat Usage / Plan Limits | Missing | New page |

### 1. Update SettingsLayout Navigation

Add 4 new nav items organized into logical groups:

```
Business Management
  - General
  - Integrations
  - Connected Apps (NEW)

Team Organization  
  - Manage Team
  - Roles & Permissions (NEW)

Administration
  - Audit Log (NEW)
  - Seat Usage & Limits (NEW)
```

Icons: `Plug` for Connected Apps, `ShieldCheck` for Roles & Permissions, `ScrollText` for Audit Log, `Gauge` for Seat Usage.

### 2. Roles & Permissions Page (`/settings/roles`)

- Display a card for each role (Admin, Staff, Subcontractor, Customer) showing:
  - Role name and description
  - What portal/section it grants access to
  - Key permissions list (read-only reference, not editable -- permissions are enforced via RLS)
- Count of users currently assigned each role (query `user_roles` table)
- This is a reference/visibility page so admins understand what each role can do

### 3. Audit Log Page (`/settings/audit-log`)

- Query the existing `activities` table (already has `action_name`, `workflow_name`, `record_type`, `record_id`, `user_id`, `created_at`)
- Display as a filterable table with columns: Timestamp, User, Action, Record Type, Record ID
- Filters: date range picker, user dropdown, action type
- Link record_id to its detail page using the existing `getRecordLink` pattern from ActivityPage
- This reuses existing data -- no new tables needed

### 4. Connected Apps Page (`/settings/connected-apps`)

- Show integration cards for configured services:
  - n8n Webhook (status: connected, with link to Integrations page for config)
  - Weather API (status: active)
  - Placeholder cards for future integrations (Stripe, QuickBooks, etc.) marked as "Coming Soon"
- Each card shows: app name, icon, status badge, brief description

### 5. Seat Usage & Plan Limits Page (`/settings/usage`)

- Query `user_roles` and the `manage-team` edge function's `get_user_statuses` action
- Display metrics cards: Total Users, Active, Deactivated, by Role breakdown
- A simple bar/progress visualization for seat counts
- Role distribution breakdown (reuse the `counts` logic already in ManageTeamPage)
- This is a read-only dashboard -- no new tables needed

### 6. Routing (App.tsx)

Add 4 new `AdminRoute`-protected routes:
- `/settings/roles` → RolesPermissionsPage
- `/settings/audit-log` → AuditLogPage  
- `/settings/connected-apps` → ConnectedAppsPage
- `/settings/usage` → SeatUsagePage

### Files to Create
- `src/pages/RolesPermissionsPage.tsx`
- `src/pages/AuditLogPage.tsx`
- `src/pages/ConnectedAppsPage.tsx`
- `src/pages/SeatUsagePage.tsx`

### Files to Modify
- `src/components/SettingsLayout.tsx` -- add new nav items
- `src/App.tsx` -- add routes

No database changes required. All pages use existing tables (`activities`, `user_roles`, `profiles`).

