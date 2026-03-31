
ALTER TABLE public.hr_benefit_enrollments 
  ADD COLUMN IF NOT EXISTS change_type text NOT NULL DEFAULT 'new_enrollment',
  ADD COLUMN IF NOT EXISTS change_reason text,
  ADD COLUMN IF NOT EXISTS termination_date text;

ALTER TABLE public.hr_sgi_driver_records 
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_reminder_date text;
