
-- 1. integration_logs: drop broad policy
DROP POLICY IF EXISTS "Staff can view integration logs" ON public.integration_logs;

-- 2. products_services: drop overly-broad customer policy, add scoped one
DROP POLICY IF EXISTS "Customers can view active products" ON public.products_services;

CREATE POLICY "Customers can view customer-visible active products"
ON public.products_services
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'customer'::app_role)
  AND status = 'Active'
  AND customer_visible = true
);

-- 3. team_members: drop broad directory policy (ops staff + self policies remain)
DROP POLICY IF EXISTS "Ops staff and field roles view team directory" ON public.team_members;

-- 4. is_sub_assigned_to_visit: remove property-level OR branch
CREATE OR REPLACE FUNCTION public.is_sub_assigned_to_visit(_user_id uuid, _visit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits v
    JOIN public.subcontractor_assignments sa
      ON sa.visit_id = v.id
      OR (sa.job_id IS NOT NULL AND sa.job_id = v.job_id)
    JOIN public.subcontractors s ON s.id = sa.subcontractor_id
    WHERE v.id = _visit_id
      AND s.user_id = _user_id
  )
$function$;
