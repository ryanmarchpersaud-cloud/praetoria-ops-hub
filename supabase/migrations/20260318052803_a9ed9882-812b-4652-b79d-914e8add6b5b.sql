
CREATE TABLE public.products_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL DEFAULT 'Service',
  service_category TEXT NOT NULL DEFAULT 'Other',
  unit_price NUMERIC(12,2) DEFAULT 0,
  unit_label TEXT DEFAULT 'per visit',
  status TEXT NOT NULL DEFAULT 'Active',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff full access to products_services"
  ON public.products_services FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers can view active products"
  ON public.products_services FOR SELECT
  TO authenticated
  USING (status = 'Active');
