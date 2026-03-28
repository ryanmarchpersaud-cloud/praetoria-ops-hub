
-- ============================================================
-- Tighten sensitive table SELECT from is_staff_or_admin → is_ops_staff
-- This prevents field workers (staff, lead_worker, supervisor, dispatcher)
-- from reading all invoices, quotes, customers, properties
-- Workers already have assignment-based access for visits/jobs
-- ============================================================

-- 1. INVOICES: Narrow staff SELECT to ops_staff only
DROP POLICY IF EXISTS "Staff view invoices" ON public.invoices;
CREATE POLICY "Office staff view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (is_ops_staff(auth.uid()));

-- 2. INVOICE_LINE_ITEMS: Narrow staff ALL to ops_staff only
DROP POLICY IF EXISTS "Staff manage invoice_line_items" ON public.invoice_line_items;
CREATE POLICY "Office staff manage invoice_line_items" ON public.invoice_line_items FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid())) WITH CHECK (is_ops_staff(auth.uid()));

-- 3. QUOTES: Narrow staff SELECT to ops_staff only
DROP POLICY IF EXISTS "Staff view quotes" ON public.quotes;
CREATE POLICY "Office staff view quotes" ON public.quotes FOR SELECT TO authenticated
  USING (is_ops_staff(auth.uid()));

-- 4. QUOTE_LINE_ITEMS: Narrow staff ALL to ops_staff only
DROP POLICY IF EXISTS "Staff manage quote_line_items" ON public.quote_line_items;
CREATE POLICY "Office staff manage quote_line_items" ON public.quote_line_items FOR ALL TO authenticated
  USING (is_ops_staff(auth.uid())) WITH CHECK (is_ops_staff(auth.uid()));

-- 5. CUSTOMERS: Narrow staff SELECT to ops_staff only
DROP POLICY IF EXISTS "Staff view customers" ON public.customers;
CREATE POLICY "Office staff view customers" ON public.customers FOR SELECT TO authenticated
  USING (is_ops_staff(auth.uid()));

-- 6. PROPERTIES: Narrow staff SELECT to ops_staff only
DROP POLICY IF EXISTS "Staff view properties" ON public.properties;
CREATE POLICY "Office staff view properties" ON public.properties FOR SELECT TO authenticated
  USING (is_ops_staff(auth.uid()));

-- 7. ACTIVITIES: Narrow staff SELECT to ops_staff (audit log is admin/office only)
DROP POLICY IF EXISTS "Staff view all activities" ON public.activities;
CREATE POLICY "Office staff view all activities" ON public.activities FOR SELECT TO authenticated
  USING (is_ops_staff(auth.uid()));
-- Keep "Users view own activities" policy for workers to see their own activity
