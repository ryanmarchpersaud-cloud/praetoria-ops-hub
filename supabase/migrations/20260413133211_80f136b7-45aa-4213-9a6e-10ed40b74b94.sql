
CREATE TABLE public.email_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  source_label TEXT NOT NULL DEFAULT 'Manual',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view email contacts"
  ON public.email_contacts FOR SELECT
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can create email contacts"
  ON public.email_contacts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can update email contacts"
  ON public.email_contacts FOR UPDATE
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE POLICY "Staff can delete email contacts"
  ON public.email_contacts FOR DELETE
  TO authenticated
  USING (public.is_staff_or_admin(auth.uid()));

CREATE TRIGGER update_email_contacts_updated_at
  BEFORE UPDATE ON public.email_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
