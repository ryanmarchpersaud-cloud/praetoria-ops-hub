
# Phase 6.1 — PM Staff Self-Service

Additive expansion of the PM Staff / Leasing Agent Portal. Reuses existing HR / timesheet / pay stub / document / training / PPE / expense systems with strict "own records only" access. Nothing on the leasing side changes.

## Scope guarantees (nothing else touched)

- No changes to: Admin, Finance, Stripe, saved cards, tenant portal, owner portal, customer portal, worker portal, subcontractor portal, HR module UI, payroll logic, invoices, owner statements, tenant ledger, property expenses, service jobs/visits, mobile packaging (Android/iOS/Google Play/App Store, icons, signing, package name).
- Existing PM Staff pages (Home, Vacancies, Prospects, Showings, Applications, Tasks, Move-Ins, More, Account) are preserved as-is. Bottom nav stays: Home / Vacancies / Prospects / Showings / Tasks / More.
- Praetoria logo stays in header. Staff avatar shown separately in header (next to name) and inside Profile.

## Sidebar reorganization (PM Staff Layout only)

Left sidebar / More menu grouped into two sections:

```text
LEASING WORK
  Home
  Vacancies
  Prospects
  Showings
  Applications
  Move-Ins
  Tasks

MY STAFF ACCOUNT
  My Profile
  Time Clock
  My Timesheets
  My Pay Stubs
  My Documents
  Training & Safety
  My PPE / Equipment
  Expense Claims
  Time Off / Sick Days
  Messages
```

Bottom nav (mobile) stays 6 items; self-service lives under **More** + **Account**.

## New PM Staff routes

All under `/pm-staff/*`, protected by `PMStaffRoute`:

- `/pm-staff/profile`
- `/pm-staff/time-clock`
- `/pm-staff/timesheets`
- `/pm-staff/pay-stubs`
- `/pm-staff/pay-stubs/:id`
- `/pm-staff/documents`
- `/pm-staff/training`
- `/pm-staff/ppe`
- `/pm-staff/expenses`
- `/pm-staff/time-off`
- `/pm-staff/messages`

## Reuse map (no duplication)

| Self-service area | Existing system reused | Access rule |
|---|---|---|
| Profile / avatar | `profiles` + `worker_profiles` (read own) | Own row only |
| Time Clock | `timesheets` (new `source='pm_staff'` tag) | Own entries only |
| Timesheets | `timesheets` | Own entries only |
| Pay Stubs | `employee_pay_stubs` | Own stubs only (never SIN/bank) |
| Documents | `worker_documents` | Own docs only |
| Training | `training_assignments` + `training_courses` | Own assignments only |
| PPE / Equipment | `worker_equipment_items` | Own items only |
| Expense Claims | `worker_expense_claims` | Own claims only |
| Time Off / Sick | `employee_time_off_requests` | Own requests only |
| Messages | existing notifications | Own notifications only |

Nothing about the worker portal's own use of these tables changes — RLS additions are **read/write own row** overlays, gated by the new `is_pm_staff()` helper (already added in Phase 6).

## RLS additions (own-row overlay only)

For each table above, add a policy that grants PM staff `SELECT` on rows where the record belongs to them (matched by `user_id` / `worker_id` / `employee_id` depending on table), plus `INSERT`/`UPDATE` on their own draft time clock, expense claim, and time-off records. No policy grants access to other people's rows. No policy exposes SIN, banking, or payroll data — the UI simply does not query those columns.

## Security rules enforced (portal-side + RLS-side)

PM staff (property_manager, leasing_agent) explicitly **cannot** access:

- Other employees' pay stubs, SIN, banking, payroll runs
- Admin dashboard, HR module, Finance, Stripe, saved cards
- Owner statements, owner payouts, tenant ledger detail, property expenses (unless later specifically approved)
- Worker/subcontractor private records outside leasing scope
- Tenant / owner records outside PM staff scope
- App / mobile / signing settings

Enforced by: route guards (`PMStaffRoute`), sidebar visibility, RLS "own row" policies, and by never selecting sensitive columns in the queries these new pages issue.

## UI pattern

- Reuse existing components where clean (pay stub viewer, timesheet list, document list, expense form, time-off form) rendered inside `PMStaffLayout` — no admin chrome.
- Placeholder-quality empty states where an admin hasn't populated data yet ("No pay stubs yet", etc.).
- Praetoria emerald PM theme retained; staff avatar as a `<Avatar>` next to display name in header.

## Technical Details

**Files to add**
- `src/pages/pm-staff/Profile.tsx`
- `src/pages/pm-staff/TimeClock.tsx`
- `src/pages/pm-staff/MyTimesheets.tsx`
- `src/pages/pm-staff/MyPayStubs.tsx`
- `src/pages/pm-staff/MyPayStubDetail.tsx`
- `src/pages/pm-staff/MyDocuments.tsx`
- `src/pages/pm-staff/Training.tsx`
- `src/pages/pm-staff/MyPPE.tsx`
- `src/pages/pm-staff/ExpenseClaims.tsx`
- `src/pages/pm-staff/TimeOff.tsx`
- `src/pages/pm-staff/Messages.tsx`
- `src/hooks/usePMStaffSelfService.ts` (own-row fetchers)

**Files to edit**
- `src/components/pm-staff/PMStaffLayout.tsx` — add "My Staff Account" nav group.
- `src/components/pm-staff/PMStaffBottomNav.tsx` — unchanged (6 items).
- `src/pages/pm-staff/More.tsx` — surface self-service shortcuts.
- `src/pages/pm-staff/Account.tsx` — surface Profile / Documents / Pay Stubs shortcuts + avatar.
- `src/App.tsx` — register new routes inside existing `PMStaffRoute`.

**Migration (single)**
- Add `is_pm_staff_own_row(user_id uuid)` helper if needed, and add own-row `SELECT` (and limited `INSERT`/`UPDATE` for time clock / expense / time-off drafts) policies on: `timesheets`, `employee_pay_stubs`, `worker_documents`, `training_assignments`, `worker_equipment_items`, `worker_expense_claims`, `employee_time_off_requests`.
- No table structure changes. No changes to existing worker/HR policies.

**Roll-out**
- Ship as a single additive change set. No mobile packaging, no third-party integrations, no changes to existing worker portal.

Awaiting approval to build Phase 6.1.
