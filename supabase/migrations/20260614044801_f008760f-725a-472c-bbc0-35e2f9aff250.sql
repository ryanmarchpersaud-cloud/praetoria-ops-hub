-- Restrict products_services SELECT to ops staff only (plus existing customer-active-only policy).
-- Workers and subcontractors must never see pricing fields (unit_price, minimum_charge,
-- internal_notes, internal_item_code, etc.). They do not query this table directly;
-- service info is delivered via visits/jobs without pricing.
DROP POLICY IF EXISTS "Non-customers can view products_services" ON public.products_services;

CREATE POLICY "Ops staff can view products_services"
ON public.products_services
FOR SELECT
TO authenticated
USING (public.is_ops_staff(auth.uid()));