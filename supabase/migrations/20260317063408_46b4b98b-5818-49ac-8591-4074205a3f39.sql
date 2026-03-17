
-- Photo tag enum
CREATE TYPE public.photo_tag AS ENUM ('Before', 'After', 'Progress', 'Issue');

-- Visit photos table
CREATE TABLE public.visit_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  photo_tag public.photo_tag NOT NULL DEFAULT 'After',
  caption TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_visit_photos_visit_id ON public.visit_photos(visit_id);
CREATE INDEX idx_visit_photos_customer_id ON public.visit_photos(customer_id);
CREATE INDEX idx_visit_photos_property_id ON public.visit_photos(property_id);

-- RLS
ALTER TABLE public.visit_photos ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage photos
CREATE POLICY "Authenticated users can manage visit photos"
  ON public.visit_photos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Storage bucket for visit photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('visit-photos', 'visit-photos', true);

-- Storage policies: authenticated users can upload
CREATE POLICY "Authenticated users can upload visit photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'visit-photos');

-- Authenticated users can view visit photos
CREATE POLICY "Anyone can view visit photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'visit-photos');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete visit photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'visit-photos');
