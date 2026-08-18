-- Combined quotation + service agreement support
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS is_combined_document boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS doc_status text,
  ADD COLUMN IF NOT EXISTS quotation_number text,
  ADD COLUMN IF NOT EXISTS activation_checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_approved_by uuid,
  ADD COLUMN IF NOT EXISTS pricing_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS has_unresolved_values boolean NOT NULL DEFAULT true;

-- Customer document classification / staff-only reference area
ALTER TABLE public.customer_documents
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_stage text,
  ADD COLUMN IF NOT EXISTS staff_only boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Customers view their own documents" ON public.customer_documents;
CREATE POLICY "Customers view their own documents"
  ON public.customer_documents FOR SELECT
  TO authenticated
  USING (customer_id = get_customer_id_for_user(auth.uid()) AND staff_only = false);

-- Signed versions are immutable
CREATE OR REPLACE FUNCTION public.protect_signed_agreements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.customer_signed_at IS NOT NULL THEN
    IF NEW.body_html IS DISTINCT FROM OLD.body_html
       OR NEW.field_values IS DISTINCT FROM OLD.field_values
       OR NEW.field_schema IS DISTINCT FROM OLD.field_schema
       OR NEW.customer_signed_at IS DISTINCT FROM OLD.customer_signed_at THEN
      RAISE EXCEPTION 'A signed agreement cannot be modified. Create a new version instead.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_signed_agreements ON public.agreements;
CREATE TRIGGER trg_protect_signed_agreements
BEFORE UPDATE ON public.agreements
FOR EACH ROW EXECUTE FUNCTION public.protect_signed_agreements();