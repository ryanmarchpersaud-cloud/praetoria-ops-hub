-- Reusable Work Catalogue Log for payroll/pay stub work descriptions
CREATE TABLE IF NOT EXISTS public.work_catalogue_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  category TEXT,
  default_hourly_rate NUMERIC(10,2),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS work_catalogue_items_label_unique
  ON public.work_catalogue_items (lower(label));

ALTER TABLE public.work_catalogue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff can view work catalogue"
  ON public.work_catalogue_items FOR SELECT
  TO authenticated
  USING (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can insert work catalogue"
  ON public.work_catalogue_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can update work catalogue"
  ON public.work_catalogue_items FOR UPDATE
  TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Admins can delete work catalogue"
  ON public.work_catalogue_items FOR DELETE
  TO authenticated
  USING (public.is_admin_or_owner(auth.uid()));

CREATE TRIGGER trg_work_catalogue_updated_at
  BEFORE UPDATE ON public.work_catalogue_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();