
CREATE TABLE public.subcontractor_billing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id uuid NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,
  payment_preference text NOT NULL DEFAULT 'etransfer',
  card_brand text,
  card_last4 text,
  payment_method_present boolean NOT NULL DEFAULT false,
  autopay_enabled boolean NOT NULL DEFAULT false,
  autopay_consent_at timestamptz,
  billing_email text,
  processor_customer_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(subcontractor_id)
);

ALTER TABLE public.subcontractor_billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all subcontractor billing profiles"
  ON public.subcontractor_billing_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Subcontractors manage own billing profile"
  ON public.subcontractor_billing_profiles FOR ALL TO authenticated
  USING (subcontractor_id IN (SELECT id FROM subcontractors WHERE user_id = auth.uid()))
  WITH CHECK (subcontractor_id IN (SELECT id FROM subcontractors WHERE user_id = auth.uid()));
