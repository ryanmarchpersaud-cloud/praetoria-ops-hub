
-- Phase 7.1 — Full Leasing Intake fields (additive only, all new columns nullable)

-- ============ pm_prospects ============
ALTER TABLE public.pm_prospects
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS id_type text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS id_expiry date,
  ADD COLUMN IF NOT EXISTS id_photo_path text,
  ADD COLUMN IF NOT EXISTS alternate_phone text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text,
  ADD COLUMN IF NOT EXISTS current_address text,
  ADD COLUMN IF NOT EXISTS current_move_in_date date,
  ADD COLUMN IF NOT EXISTS current_monthly_rent numeric(12,2),
  ADD COLUMN IF NOT EXISTS reason_for_leaving text,
  ADD COLUMN IF NOT EXISTS current_landlord_name text,
  ADD COLUMN IF NOT EXISTS current_landlord_phone text,
  ADD COLUMN IF NOT EXISTS previous_address text,
  ADD COLUMN IF NOT EXISTS previous_landlord_name text,
  ADD COLUMN IF NOT EXISTS previous_landlord_phone text,
  ADD COLUMN IF NOT EXISTS employer_name text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS employment_start_date date,
  ADD COLUMN IF NOT EXISTS gross_monthly_income numeric(12,2),
  ADD COLUMN IF NOT EXISTS supervisor_name text,
  ADD COLUMN IF NOT EXISTS supervisor_phone text,
  ADD COLUMN IF NOT EXISTS secondary_income_source text,
  ADD COLUMN IF NOT EXISTS secondary_income_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS income_proof_path text,
  ADD COLUMN IF NOT EXISTS occupant_count integer,
  ADD COLUMN IF NOT EXISTS co_applicants jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS has_pets boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pets jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_smoker boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS vehicles jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interested_property_id uuid,
  ADD COLUMN IF NOT EXISTS interested_unit_id uuid,
  ADD COLUMN IF NOT EXISTS desired_lease_term_months integer,
  ADD COLUMN IF NOT EXISTS budget_max numeric(12,2),
  ADD COLUMN IF NOT EXISTS credit_check_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_check_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS background_check_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS background_check_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reference_check_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_check_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip text;

-- FK for interested property/unit (ON DELETE SET NULL, IF NOT EXISTS pattern)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pm_prospects_interested_property_fk') THEN
    ALTER TABLE public.pm_prospects
      ADD CONSTRAINT pm_prospects_interested_property_fk
      FOREIGN KEY (interested_property_id) REFERENCES public.properties(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pm_prospects_interested_unit_fk') THEN
    ALTER TABLE public.pm_prospects
      ADD CONSTRAINT pm_prospects_interested_unit_fk
      FOREIGN KEY (interested_unit_id) REFERENCES public.pm_units(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============ pm_showings ============
ALTER TABLE public.pm_showings
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS meeting_location text,
  ADD COLUMN IF NOT EXISTS confirmation_status text DEFAULT 'unconfirmed',
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback_rating integer,
  ADD COLUMN IF NOT EXISTS feedback_notes text,
  ADD COLUMN IF NOT EXISTS interest_level text;

-- ============ pm_staff_tasks ============
ALTER TABLE public.pm_staff_tasks
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_prospect_id uuid,
  ADD COLUMN IF NOT EXISTS linked_showing_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pm_staff_tasks_linked_prospect_fk') THEN
    ALTER TABLE public.pm_staff_tasks
      ADD CONSTRAINT pm_staff_tasks_linked_prospect_fk
      FOREIGN KEY (linked_prospect_id) REFERENCES public.pm_prospects(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pm_staff_tasks_linked_showing_fk') THEN
    ALTER TABLE public.pm_staff_tasks
      ADD CONSTRAINT pm_staff_tasks_linked_showing_fk
      FOREIGN KEY (linked_showing_id) REFERENCES public.pm_showings(id) ON DELETE SET NULL;
  END IF;
END $$;
