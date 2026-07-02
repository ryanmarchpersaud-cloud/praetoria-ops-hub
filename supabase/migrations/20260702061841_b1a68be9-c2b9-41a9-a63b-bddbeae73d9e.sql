CREATE TABLE public.pm_tenant_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
  referrer_user_id uuid,
  referrer_name text,
  referrer_contact text,
  friend_name text NOT NULL,
  friend_phone text,
  friend_email text,
  service_interest text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_tenant_referrals TO authenticated;
GRANT ALL ON public.pm_tenant_referrals TO service_role;

ALTER TABLE public.pm_tenant_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops manage all tenant referrals" ON public.pm_tenant_referrals
  FOR ALL USING (public.is_ops_staff(auth.uid())) WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Tenants create own referrals" ON public.pm_tenant_referrals
  FOR INSERT WITH CHECK (referrer_user_id = auth.uid());

CREATE POLICY "Tenants read own referrals" ON public.pm_tenant_referrals
  FOR SELECT USING (referrer_user_id = auth.uid());

CREATE TRIGGER pm_tenant_referrals_updated_at
  BEFORE UPDATE ON public.pm_tenant_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();