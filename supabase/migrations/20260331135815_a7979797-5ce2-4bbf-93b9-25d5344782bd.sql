
CREATE TABLE public.incident_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  shared_by UUID,
  recipient_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  cover_note TEXT,
  include_photos BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.incident_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view incident shares" ON public.incident_shares
  FOR SELECT TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can create incident shares" ON public.incident_shares
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));
