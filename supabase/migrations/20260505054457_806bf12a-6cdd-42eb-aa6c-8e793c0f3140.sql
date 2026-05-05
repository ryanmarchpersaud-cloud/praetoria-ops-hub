-- Snow Logs table for historical archive
CREATE TABLE public.snow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  season TEXT,
  temperature_c NUMERIC(5,2),
  weather_conditions TEXT,
  snowfall_cm NUMERIC(6,2),
  services_performed TEXT[] DEFAULT '{}',
  salt_kg NUMERIC(8,2),
  sand_kg NUMERIC(8,2),
  materials_notes TEXT,
  crew_names TEXT,
  total_hours NUMERIC(6,2),
  customer_summary TEXT,
  internal_notes TEXT,
  attachment_url TEXT,
  source TEXT DEFAULT 'paper_archive',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_snow_logs_property ON public.snow_logs(property_id);
CREATE INDEX idx_snow_logs_customer ON public.snow_logs(customer_id);
CREATE INDEX idx_snow_logs_date ON public.snow_logs(service_date DESC);
CREATE INDEX idx_snow_logs_season ON public.snow_logs(season);

ALTER TABLE public.snow_logs ENABLE ROW LEVEL SECURITY;

-- Ops staff: full access
CREATE POLICY "Ops staff manage snow logs"
ON public.snow_logs
FOR ALL
TO authenticated
USING (public.is_ops_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()));

-- Customers: view their own
CREATE POLICY "Customers view their own snow logs"
ON public.snow_logs
FOR SELECT
TO authenticated
USING (customer_id = public.get_customer_id_for_user(auth.uid()));

-- updated_at trigger
CREATE TRIGGER trg_snow_logs_updated_at
BEFORE UPDATE ON public.snow_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();