CREATE TABLE public.customer_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  relationship TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  notes TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_contacts_customer_id ON public.customer_contacts(customer_id);

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff manage customer contacts"
ON public.customer_contacts FOR ALL
USING (public.is_ops_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Customers view own contacts"
ON public.customer_contacts FOR SELECT
USING (customer_id = public.get_customer_id_for_user(auth.uid()));

CREATE TRIGGER update_customer_contacts_updated_at
BEFORE UPDATE ON public.customer_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER customer_contacts_protected_writes
BEFORE INSERT OR UPDATE OR DELETE ON public.customer_contacts
FOR EACH ROW EXECUTE FUNCTION public.block_writes_to_protected_customers();