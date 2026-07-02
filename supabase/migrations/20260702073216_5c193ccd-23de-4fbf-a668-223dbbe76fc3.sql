
-- 1. Owner-visibility flags on maintenance requests
ALTER TABLE public.pm_maintenance_requests
  ADD COLUMN IF NOT EXISTS owner_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_visible_summary TEXT;

-- 2. Owner-visibility flags on work orders
ALTER TABLE public.pm_work_orders
  ADD COLUMN IF NOT EXISTS owner_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_visible_summary TEXT,
  ADD COLUMN IF NOT EXISTS owner_visible_completion_note TEXT;

-- 3. Owner documents table
CREATE TABLE IF NOT EXISTS public.pm_owner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.pm_property_owners(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.pm_managed_properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  is_owner_visible BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (owner_id IS NOT NULL OR property_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pm_owner_docs_owner ON public.pm_owner_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_pm_owner_docs_property ON public.pm_owner_documents(property_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_owner_documents TO authenticated;
GRANT ALL ON public.pm_owner_documents TO service_role;

ALTER TABLE public.pm_owner_documents ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER pm_owner_documents_touch
BEFORE UPDATE ON public.pm_owner_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ops staff: full access
CREATE POLICY "ops staff manage owner documents"
  ON public.pm_owner_documents FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

-- Property owners: read owner-visible docs linked to their owner record or assigned properties
CREATE POLICY "property owners read own docs"
  ON public.pm_owner_documents FOR SELECT
  TO authenticated
  USING (
    is_owner_visible = true
    AND (
      owner_id IN (SELECT id FROM public.pm_property_owners WHERE user_id = auth.uid())
      OR property_id IN (
        SELECT property_id FROM public.pm_owner_properties op
        JOIN public.pm_property_owners po ON po.id = op.owner_id
        WHERE po.user_id = auth.uid()
      )
    )
  );
