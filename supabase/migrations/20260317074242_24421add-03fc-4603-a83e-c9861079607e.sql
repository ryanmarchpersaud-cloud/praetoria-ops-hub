
CREATE TABLE public.timesheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Workers see own entries, staff/admin see all
CREATE POLICY "Users can view own timesheets"
  ON public.timesheets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR NOT public.has_role(auth.uid(), 'customer'));

CREATE POLICY "Users can insert own timesheets"
  ON public.timesheets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own timesheets"
  ON public.timesheets FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can manage all timesheets"
  ON public.timesheets FOR ALL TO authenticated
  USING (NOT public.has_role(auth.uid(), 'customer'))
  WITH CHECK (NOT public.has_role(auth.uid(), 'customer'));
