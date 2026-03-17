
-- Add new columns to service_requests for the structured wizard
ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS specific_request_type text,
  ADD COLUMN IF NOT EXISTS requested_timing text DEFAULT 'Routine',
  ADD COLUMN IF NOT EXISTS area_of_property text,
  ADD COLUMN IF NOT EXISTS access_notes text,
  ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';
