
REVOKE EXECUTE ON FUNCTION public.pm_get_tenant_balance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pm_get_lease_balance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pm_my_balance() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pm_my_next_due() FROM PUBLIC, anon;
