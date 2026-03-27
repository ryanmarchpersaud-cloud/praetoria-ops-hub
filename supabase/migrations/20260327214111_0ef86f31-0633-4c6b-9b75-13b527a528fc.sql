
-- ============================================================
-- Fix RLS gaps: activities, invoices, quotes, properties, customers
-- for subcontractor isolation and audit log protection
-- ============================================================

-- 1. ACTIVITIES: Replace "true" SELECT with staff-only + own-records
DROP POLICY IF EXISTS "Authenticated users can view all activities" ON public.activities;
CREATE POLICY "Staff view all activities" ON public.activities FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()));
CREATE POLICY "Users view own activities" ON public.activities FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. INVOICES: Replace "NOT customer" SELECT with proper isolation
-- Staff (not subs) can view all; customers own; subs see nothing extra
DROP POLICY IF EXISTS "Staff view invoices" ON public.invoices;
CREATE POLICY "Staff view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()));

-- 3. INVOICE_LINE_ITEMS: Replace "NOT customer" ALL with staff-only
DROP POLICY IF EXISTS "Staff full access to invoice_line_items" ON public.invoice_line_items;
CREATE POLICY "Staff manage invoice_line_items" ON public.invoice_line_items FOR ALL TO authenticated
  USING (is_staff_or_admin(auth.uid())) WITH CHECK (is_staff_or_admin(auth.uid()));

-- 4. QUOTES: Replace "NOT customer" SELECT with staff-only
DROP POLICY IF EXISTS "Staff view quotes" ON public.quotes;
CREATE POLICY "Staff view quotes" ON public.quotes FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()));

-- 5. QUOTE_LINE_ITEMS: Replace "NOT customer" ALL with staff-only
DROP POLICY IF EXISTS "Staff full access to quote_line_items" ON public.quote_line_items;
CREATE POLICY "Staff manage quote_line_items" ON public.quote_line_items FOR ALL TO authenticated
  USING (is_staff_or_admin(auth.uid())) WITH CHECK (is_staff_or_admin(auth.uid()));

-- 6. PROPERTIES: Replace "NOT customer" SELECT with staff-only
DROP POLICY IF EXISTS "Staff view properties" ON public.properties;
CREATE POLICY "Staff view properties" ON public.properties FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()));

-- 7. CUSTOMERS: Replace "NOT customer" SELECT with staff-only
DROP POLICY IF EXISTS "Staff view customers" ON public.customers;
CREATE POLICY "Staff view customers" ON public.customers FOR SELECT TO authenticated
  USING (is_staff_or_admin(auth.uid()));
