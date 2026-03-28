
-- Tighten WRITE policies on sensitive tables from is_staff_or_admin → is_ops_staff
-- Workers (staff/lead_worker/supervisor/dispatcher) should NOT write to these tables

-- 1. INVOICES
DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
CREATE POLICY "Office staff manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid())) WITH CHECK (is_ops_staff(auth.uid()));

-- 2. CUSTOMERS
DROP POLICY IF EXISTS "Staff manage customers" ON public.customers;
CREATE POLICY "Office staff manage customers" ON public.customers FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid())) WITH CHECK (is_ops_staff(auth.uid()));

-- 3. PROPERTIES
DROP POLICY IF EXISTS "Staff manage properties" ON public.properties;
CREATE POLICY "Office staff manage properties" ON public.properties FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid())) WITH CHECK (is_ops_staff(auth.uid()));

-- 4. QUOTES
DROP POLICY IF EXISTS "Staff manage quotes" ON public.quotes;
CREATE POLICY "Office staff manage quotes" ON public.quotes FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid())) WITH CHECK (is_ops_staff(auth.uid()));
