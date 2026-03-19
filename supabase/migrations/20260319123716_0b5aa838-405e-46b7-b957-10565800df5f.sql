
-- =============================================
-- Phase 1: Emergency & Safety Module Schema
-- =============================================

-- 1. Add muster point & site emergency fields to properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS muster_point_name text,
  ADD COLUMN IF NOT EXISTS muster_point_description text,
  ADD COLUMN IF NOT EXISTS muster_point_photo_url text,
  ADD COLUMN IF NOT EXISTS muster_point_map_notes text,
  ADD COLUMN IF NOT EXISTS emergency_exit_notes text,
  ADD COLUMN IF NOT EXISTS first_aid_kit_location text,
  ADD COLUMN IF NOT EXISTS fire_extinguisher_location text,
  ADD COLUMN IF NOT EXISTS site_emergency_notes text;

-- 2. Add medical alert fields to worker_profiles
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS carries_epipen boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS carries_inhaler boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS diabetes_alert boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seizure_or_fainting_alert boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blood_pressure_alert boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_medical_notes text,
  ADD COLUMN IF NOT EXISTS medical_info_last_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS medical_info_consent boolean DEFAULT false;

-- 3. Add emergency contact and medical alert fields to subcontractors
ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS secondary_emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS secondary_emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS secondary_emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS carries_epipen boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS carries_inhaler boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS diabetes_alert boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seizure_or_fainting_alert boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS blood_pressure_alert boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_medical_notes text,
  ADD COLUMN IF NOT EXISTS medical_info_last_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS medical_info_consent boolean DEFAULT false;
