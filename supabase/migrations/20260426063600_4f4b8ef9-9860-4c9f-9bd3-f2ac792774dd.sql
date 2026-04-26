CREATE TABLE IF NOT EXISTS public.protected_customers (
  customer_id UUID PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  reason TEXT,
  added_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.protected_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and owners can view protected customers" ON public.protected_customers;
CREATE POLICY "Admins and owners can view protected customers"
ON public.protected_customers FOR SELECT TO authenticated
USING (public.is_admin_or_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins and owners can manage protected customers" ON public.protected_customers;
CREATE POLICY "Admins and owners can manage protected customers"
ON public.protected_customers FOR ALL TO authenticated
USING (public.is_admin_or_owner(auth.uid()))
WITH CHECK (public.is_admin_or_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_protected_customer(_customer_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.protected_customers WHERE customer_id = _customer_id); $$;

CREATE OR REPLACE FUNCTION public.customer_id_for_property(_property_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT customer_id FROM public.properties WHERE id = _property_id LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.block_writes_to_protected_customers()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_property_id UUID;
  v_name TEXT;
BEGIN
  BEGIN v_customer_id := NEW.customer_id; EXCEPTION WHEN undefined_column THEN v_customer_id := NULL; END;
  BEGIN v_property_id := NEW.property_id; EXCEPTION WHEN undefined_column THEN v_property_id := NULL; END;

  IF v_customer_id IS NULL AND v_property_id IS NOT NULL THEN
    v_customer_id := public.customer_id_for_property(v_property_id);
  END IF;

  IF v_customer_id IS NULL THEN RETURN NEW; END IF;

  IF public.is_protected_customer(v_customer_id) THEN
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), company_name, 'protected customer')
      INTO v_name FROM public.customers WHERE id = v_customer_id;

    RAISE EXCEPTION 'PROTECTED_CUSTOMER: Cannot % % for protected customer "%". This client is on the do-not-touch list — only Ryan may act on this account.',
      lower(TG_OP), TG_TABLE_NAME, COALESCE(v_name, 'unknown')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS block_protected_visits ON public.visits;
CREATE TRIGGER block_protected_visits BEFORE INSERT OR UPDATE OF customer_id, property_id ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.block_writes_to_protected_customers();

DROP TRIGGER IF EXISTS block_protected_jobs ON public.jobs;
CREATE TRIGGER block_protected_jobs BEFORE INSERT OR UPDATE OF customer_id, property_id ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.block_writes_to_protected_customers();

DROP TRIGGER IF EXISTS block_protected_quotes ON public.quotes;
CREATE TRIGGER block_protected_quotes BEFORE INSERT OR UPDATE OF customer_id ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.block_writes_to_protected_customers();

DROP TRIGGER IF EXISTS block_protected_invoices ON public.invoices;
CREATE TRIGGER block_protected_invoices BEFORE INSERT OR UPDATE OF customer_id, property_id ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.block_writes_to_protected_customers();

DROP TRIGGER IF EXISTS block_protected_op_tasks ON public.operational_tasks;
CREATE TRIGGER block_protected_op_tasks BEFORE INSERT OR UPDATE OF customer_id, property_id ON public.operational_tasks
  FOR EACH ROW EXECUTE FUNCTION public.block_writes_to_protected_customers();

INSERT INTO public.protected_customers (customer_id, reason) VALUES
  ('82a547b7-a368-4946-8637-467200dd4b36', 'Real client — only Ryan may act on this account'),
  ('c917f2a8-99e3-4ec2-81f9-a7953e144d7e', 'Real client — only Ryan may act on this account'),
  ('3560cba7-644c-49cf-a527-9e907ef4ea85', 'Real client — only Ryan may act on this account'),
  ('3ee4fb83-a4e0-4bfe-9cba-d79bb3a6737b', 'Real client — only Ryan may act on this account')
ON CONFLICT (customer_id) DO NOTHING;