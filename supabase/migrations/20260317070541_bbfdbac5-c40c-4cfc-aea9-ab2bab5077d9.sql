
-- Replace visit_photos policy
DROP POLICY "Authenticated users can manage visit photos" ON public.visit_photos;

CREATE POLICY "Staff full access to visit_photos"
  ON public.visit_photos FOR ALL
  TO authenticated
  USING (NOT public.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT public.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers view own visit_photos"
  ON public.visit_photos FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'customer'::app_role)
    AND customer_id = public.get_customer_id_for_user(auth.uid())
  );

-- Replace visits policy
DROP POLICY "Authenticated users can do everything with visits" ON public.visits;

CREATE POLICY "Staff full access to visits"
  ON public.visits FOR ALL
  TO authenticated
  USING (NOT public.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT public.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers view own visits"
  ON public.visits FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'customer'::app_role)
    AND customer_id = public.get_customer_id_for_user(auth.uid())
  );

-- Replace properties policy
DROP POLICY "Authenticated users can do everything with properties" ON public.properties;

CREATE POLICY "Staff full access to properties"
  ON public.properties FOR ALL
  TO authenticated
  USING (NOT public.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT public.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers view own properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'customer'::app_role)
    AND customer_id = public.get_customer_id_for_user(auth.uid())
  );

-- Replace quotes policy
DROP POLICY "Authenticated users can do everything with quotes" ON public.quotes;

CREATE POLICY "Staff full access to quotes"
  ON public.quotes FOR ALL
  TO authenticated
  USING (NOT public.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT public.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers view own quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'customer'::app_role)
    AND customer_id = public.get_customer_id_for_user(auth.uid())
  );

-- Replace customers policy
DROP POLICY "Authenticated users can do everything with customers" ON public.customers;

CREATE POLICY "Staff full access to customers"
  ON public.customers FOR ALL
  TO authenticated
  USING (NOT public.has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT public.has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers view own record"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'customer'::app_role)
    AND id = public.get_customer_id_for_user(auth.uid())
  );
