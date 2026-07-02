-- Tenant referrals: add admin_notes for internal review, ensure status has default
ALTER TABLE public.pm_tenant_referrals
  ADD COLUMN IF NOT EXISTS admin_notes text;

ALTER TABLE public.pm_tenant_referrals
  ALTER COLUMN status SET DEFAULT 'new';

-- Ensure updated_at trigger exists (uses shared function)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_pm_tenant_referrals_updated_at'
  ) THEN
    CREATE TRIGGER update_pm_tenant_referrals_updated_at
    BEFORE UPDATE ON public.pm_tenant_referrals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;