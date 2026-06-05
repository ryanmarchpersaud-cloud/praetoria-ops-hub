
CREATE TABLE public.payment_method_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  subcontractor_id UUID REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_type TEXT NOT NULL DEFAULT 'customer',
  processor TEXT NOT NULL DEFAULT 'stripe',
  processor_customer_id TEXT,
  processor_payment_method_id TEXT,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month SMALLINT,
  card_exp_year SMALLINT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  authorization_text TEXT NOT NULL,
  authorization_version TEXT NOT NULL DEFAULT 'v1',
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  setup_session_id TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pma_customer ON public.payment_method_authorizations(customer_id);
CREATE INDEX idx_pma_subcontractor ON public.payment_method_authorizations(subcontractor_id);
CREATE INDEX idx_pma_user ON public.payment_method_authorizations(user_id);

GRANT SELECT, INSERT ON public.payment_method_authorizations TO authenticated;
GRANT ALL ON public.payment_method_authorizations TO service_role;

ALTER TABLE public.payment_method_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff full access to pma"
  ON public.payment_method_authorizations
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Customers view own pma"
  ON public.payment_method_authorizations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'customer'::app_role)
    AND customer_id = public.get_customer_id_for_user(auth.uid())
  );

CREATE POLICY "Customers insert own pma"
  ON public.payment_method_authorizations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (customer_id IS NOT NULL AND customer_id = public.get_customer_id_for_user(auth.uid()))
      OR customer_id IS NULL
    )
  );
