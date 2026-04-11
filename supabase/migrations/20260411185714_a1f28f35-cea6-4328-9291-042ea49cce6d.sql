-- Worker profiles: add missing personal/HR columns
ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_province TEXT,
  ADD COLUMN IF NOT EXISTS address_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS ethnicity TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS sin_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_number TEXT,
  ADD COLUMN IF NOT EXISTS pay_schedule TEXT DEFAULT 'bi-weekly',
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Subcontractors: add missing personal columns
ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS ethnicity TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS sin_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_number TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_class TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_expiry DATE,
  ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'contract',
  ADD COLUMN IF NOT EXISTS pay_schedule TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS referral_source TEXT;