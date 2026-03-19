
-- Add property verification fields
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS photo_front_url text,
  ADD COLUMN IF NOT EXISTS photo_winter_url text,
  ADD COLUMN IF NOT EXISTS photo_night_url text,
  ADD COLUMN IF NOT EXISTS landmark_notes text,
  ADD COLUMN IF NOT EXISTS caution_notes text,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS high_risk_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS house_number_location text,
  ADD COLUMN IF NOT EXISTS access_type text;

-- Create property-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload property photos
CREATE POLICY "Staff upload property photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-photos' AND NOT public.has_role(auth.uid(), 'customer'::public.app_role));

-- Allow public read of property photos
CREATE POLICY "Public read property photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'property-photos');

-- Allow staff to delete property photos
CREATE POLICY "Staff delete property photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'property-photos' AND NOT public.has_role(auth.uid(), 'customer'::public.app_role));
