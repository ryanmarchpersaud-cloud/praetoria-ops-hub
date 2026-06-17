
CREATE TABLE public.job_cost_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE REFERENCES public.jobs(id) ON DELETE CASCADE,
  travel_included_in_quote boolean NOT NULL DEFAULT false,
  distance_notes text,
  trip_count_override integer,
  travel_hours numeric(8,2) NOT NULL DEFAULT 0,
  travel_labour_cost numeric(12,2) NOT NULL DEFAULT 0,
  hotel_cost numeric(12,2) NOT NULL DEFAULT 0,
  meal_cost numeric(12,2) NOT NULL DEFAULT 0,
  fuel_per_trip numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_cost_meta TO authenticated;
GRANT ALL ON public.job_cost_meta TO service_role;

ALTER TABLE public.job_cost_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ops staff view job cost meta"
  ON public.job_cost_meta FOR SELECT
  USING (public.is_ops_staff(auth.uid()));

CREATE POLICY "Admins manage job cost meta"
  ON public.job_cost_meta FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_job_cost_meta_updated_at
  BEFORE UPDATE ON public.job_cost_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
