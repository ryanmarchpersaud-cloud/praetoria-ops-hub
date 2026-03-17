
-- Enums for new modules
CREATE TYPE public.property_status AS ENUM ('Active', 'Inactive', 'Seasonal', 'Pending');
CREATE TYPE public.property_type AS ENUM ('Residential', 'Commercial', 'Industrial', 'Municipal', 'Strata', 'Other');
CREATE TYPE public.job_status AS ENUM ('Draft', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'On Hold');
CREATE TYPE public.job_priority AS ENUM ('Low', 'Normal', 'High', 'Urgent');
CREATE TYPE public.visit_status AS ENUM ('Scheduled', 'En Route', 'In Progress', 'Completed', 'Missed', 'Cancelled');
CREATE TYPE public.visit_type AS ENUM ('Routine', 'One-time', 'Emergency', 'Inspection', 'Follow-up');

-- Properties
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  property_name text NOT NULL,
  address_line_1 text,
  city text,
  province text,
  postal_code text,
  property_type public.property_type NOT NULL DEFAULT 'Residential',
  access_notes text,
  gate_code text,
  seasonal_notes text,
  status public.property_status NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything with properties" ON public.properties FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  service_category public.service_category NOT NULL DEFAULT 'Other',
  job_title text NOT NULL,
  scope_of_work text,
  priority public.job_priority NOT NULL DEFAULT 'Normal',
  scheduled_date date,
  status public.job_status NOT NULL DEFAULT 'Draft',
  assigned_to uuid,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything with jobs" ON public.jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate job numbers
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.jobs;
  NEW.job_number := 'PJ-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_job_number BEFORE INSERT ON public.jobs FOR EACH ROW WHEN (NEW.job_number IS NULL OR NEW.job_number = '') EXECUTE FUNCTION public.generate_job_number();

-- Visits
CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_number text NOT NULL UNIQUE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  arrival_time timestamptz,
  completion_time timestamptz,
  visit_type public.visit_type NOT NULL DEFAULT 'Routine',
  visit_status public.visit_status NOT NULL DEFAULT 'Scheduled',
  crew_notes text,
  customer_visible_notes text,
  weather_notes text,
  snow_depth text,
  service_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can do everything with visits" ON public.visits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER set_visits_updated_at BEFORE UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate visit numbers
CREATE OR REPLACE FUNCTION public.generate_visit_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(visit_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM public.visits;
  NEW.visit_number := 'PV-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_visit_number BEFORE INSERT ON public.visits FOR EACH ROW WHEN (NEW.visit_number IS NULL OR NEW.visit_number = '') EXECUTE FUNCTION public.generate_visit_number();
