
ALTER VIEW public.pm_expenses_owner_safe SET (security_invoker = true);
ALTER VIEW public.pm_tenant_ledger_tenant_safe SET (security_invoker = true);
