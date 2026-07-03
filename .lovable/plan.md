## Phase 7.1 — Full Leasing Intake Forms (Additive Only)

Goal: replace the current minimal Prospect / Showing / Task dialogs in the PM Staff portal with real, industry-standard leasing intake forms. Additive schema only — nothing existing breaks, seeded test records stay valid.

### 1. Database migration (all new columns nullable, no policy changes)

**`pm_prospects`** — add:
- Identity: `preferred_name`, `date_of_birth` (date), `gender` (text, optional)
- Government ID: `id_type` (enum-like text: drivers_license / sk_id / passport / other), `id_number`, `id_expiry` (date), `id_photo_path` (storage path, optional)
- Contact: `alternate_phone`, `preferred_contact_method` (email/phone/sms)
- Current housing: `current_address`, `current_move_in_date`, `current_monthly_rent`, `reason_for_leaving`, `current_landlord_name`, `current_landlord_phone`
- Previous housing: `previous_address`, `previous_landlord_name`, `previous_landlord_phone`
- Employment: `employer_name`, `job_title`, `employment_start_date`, `gross_monthly_income`, `supervisor_name`, `supervisor_phone`, `secondary_income_source`, `secondary_income_amount`, `income_proof_path`
- Household: `occupant_count`, `co_applicants` (jsonb — array of {name, relationship, dob}), `has_pets`, `pets` (jsonb — array of {type, breed, weight, name}), `is_smoker`, `vehicles` (jsonb — array of {make, model, year, plate})
- Desired unit: `interested_property_id` (fk properties, nullable), `interested_unit_id` (fk pm_units, nullable), `desired_lease_term_months`, `budget_max`
- Consents (with timestamps): `credit_check_consent`, `credit_check_consent_at`, `background_check_consent`, `background_check_consent_at`, `reference_check_consent`, `reference_check_consent_at`, `consent_ip`

**`pm_showings`** — add:
- `duration_minutes` (default 30), `meeting_location`, `confirmation_status` (unconfirmed/confirmed/declined), `confirmed_at`, `no_show` (bool), `feedback_rating` (1-5), `feedback_notes`, `interest_level` (low/medium/high/none)

**`pm_staff_tasks`** — add:
- `category` (general/showing/renewal/maintenance/inspection/screening/documents/other), `checklist` (jsonb — array of {label, done}), `reminder_at` (timestamptz), `attachments` (jsonb — array of {name, path}), `linked_prospect_id` (fk pm_prospects, nullable), `linked_showing_id` (fk pm_showings, nullable)

No RLS/grant changes required — new columns inherit existing table policies.

### 2. Storage
Add private bucket `pm-prospect-docs` for ID photos and income proof. RLS: only ops staff (PM/admin/leasing agent) can read/write. Signed URLs for display.

### 3. Form components (rewrite dialogs — same trigger points)

Files:
- `src/components/pm-staff/ProspectDialog.tsx` — multi-section form with tabs/accordion: Identity · Contact · Current Housing · Previous Housing · Employment & Income · Household (dynamic co-applicant/pet/vehicle rows) · Desired Unit · Consents. Zod validation, file upload for ID photo + income proof.
- `src/components/pm-staff/ShowingDialog.tsx` — Prospect picker, date/time, duration, type, meeting location, agent, notes; after-showing section (only if past): confirmation, no-show, interest level, feedback.
- `src/components/pm-staff/TaskDialog.tsx` — Title, description, category, priority, due date, reminder, assignee, linked prospect/showing, checklist builder (add/remove rows), attachments.

Reused pattern: sub-components declared outside main component (per Core rule), semantic tokens only.

### 4. Hooks updates
- `src/hooks/pm/useProspects.ts` — extend insert/update payload types; keep existing calls backward-compatible (all new fields optional).
- `src/hooks/pm/useShowings.ts` — same.
- `src/hooks/pm/usePMStaffTasks.ts` — same, plus checklist toggle helper.

### 5. Detail views (light additions, read-only)
- Prospect detail page: show all captured fields grouped by section, redact SIN, show ID photo via signed URL, show consent audit stamps.
- Showing card: show duration, meeting spot, confirmation badge, feedback after completion.
- Task card: show category chip, checklist progress "3/5", reminder time.

### 6. Out of scope (explicitly not touched)
Android, iOS, Play Store, App Store, icons, signing, package name, Stripe, saved cards, invoices, tenant ledger, owner statements, owner payouts, Finance, HR, payroll, pay stubs, service jobs, visits, worker/subcontractor/customer portals, tenant portal, owner portal, lease renewals workflow, owner approvals workflow, notifications.

### 7. Verification
- Existing 3 seeded prospects still load in list and detail (all new fields null).
- New prospect can be created with only Name (required) — all other fields optional.
- New prospect can be created with the full intake.
- Showings and Tasks unchanged for existing records; new fields editable.
- No RLS regressions (existing policies untouched).
- No other portals or modules changed.

### Technical notes
- Migration: single file, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` for each; new FKs use `ON DELETE SET NULL`.
- Storage bucket created with `supabase--storage_create_bucket` (private).
- Zod schemas colocated with each dialog for client-side validation; server-side length limits enforced by column types.
- No changes to `pm_staff_tasks_status_check` constraint; existing `'open'` status remains default.
