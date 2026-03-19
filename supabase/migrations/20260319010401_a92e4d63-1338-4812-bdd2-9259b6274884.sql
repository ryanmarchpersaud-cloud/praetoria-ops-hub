
-- Work Settings table
CREATE TABLE public.work_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Job execution
  photo_before_required boolean DEFAULT false,
  photo_after_required boolean DEFAULT false,
  notes_required boolean DEFAULT false,
  worker_checkin_required boolean DEFAULT false,
  worker_checkout_required boolean DEFAULT false,
  signature_required boolean DEFAULT false,
  damage_reporting_required boolean DEFAULT true,
  internal_approval_required boolean DEFAULT false,
  -- Staffing
  subcontractor_assignment_allowed boolean DEFAULT true,
  team_lead_required boolean DEFAULT false,
  max_workers_per_job integer DEFAULT 10,
  -- Time & Labor
  default_labor_unit text DEFAULT 'hours',
  default_estimated_duration integer DEFAULT 60,
  overtime_threshold_hours numeric DEFAULT 8,
  break_duration_minutes integer DEFAULT 30,
  oncall_enabled boolean DEFAULT false,
  after_hours_work_allowed boolean DEFAULT true,
  weekend_work_allowed boolean DEFAULT true,
  -- Operational
  weather_sensitive_toggle boolean DEFAULT false,
  dispatch_notes_default text DEFAULT '',
  worker_instruction_visibility text DEFAULT 'assigned_only',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage work settings" ON public.work_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view work settings" ON public.work_settings FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Schedule Settings table
CREATE TABLE public.schedule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_view text DEFAULT 'week',
  default_duration_minutes integer DEFAULT 60,
  time_slot_increment integer DEFAULT 15,
  workday_start text DEFAULT '07:00',
  workday_end text DEFAULT '18:00',
  first_day_of_week integer DEFAULT 1,
  -- Availability
  business_hours jsonb DEFAULT '{"mon":"07:00-18:00","tue":"07:00-18:00","wed":"07:00-18:00","thu":"07:00-18:00","fri":"07:00-18:00","sat":"08:00-14:00","sun":"closed"}'::jsonb,
  blackout_dates jsonb DEFAULT '[]'::jsonb,
  holidays jsonb DEFAULT '[]'::jsonb,
  after_hours_available boolean DEFAULT false,
  emergency_scheduling boolean DEFAULT true,
  weekend_scheduling boolean DEFAULT true,
  -- Dispatch
  travel_buffer_minutes integer DEFAULT 15,
  setup_buffer_minutes integer DEFAULT 10,
  prevent_double_booking boolean DEFAULT true,
  allow_overlapping boolean DEFAULT false,
  enforce_worker_availability boolean DEFAULT true,
  subcontractor_scheduling boolean DEFAULT true,
  -- Booking
  lead_time_hours integer DEFAULT 24,
  same_day_booking boolean DEFAULT false,
  cancellation_window_hours integer DEFAULT 24,
  admin_approval_for_changes boolean DEFAULT false,
  auto_create_visits boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage schedule settings" ON public.schedule_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view schedule settings" ON public.schedule_settings FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Route Settings table
CREATE TABLE public.route_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_priority text DEFAULT 'clustered_area',
  planning_mode text DEFAULT 'manual',
  default_travel_buffer integer DEFAULT 15,
  start_location text DEFAULT '',
  return_to_base boolean DEFAULT true,
  avg_travel_speed_kmh integer DEFAULT 40,
  service_time_weight numeric DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.route_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage route settings" ON public.route_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view route settings" ON public.route_settings FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Service Territories
CREATE TABLE public.service_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#3b82f6',
  postal_codes text[] DEFAULT '{}',
  cities text[] DEFAULT '{}',
  preferred_worker_ids uuid[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage territories" ON public.service_territories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view territories" ON public.service_territories FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Form Templates
CREATE TABLE public.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  service_category text DEFAULT 'Other',
  form_type text DEFAULT 'checklist',
  completion_timing text DEFAULT 'after_work',
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  worker_visible boolean DEFAULT true,
  admin_visible boolean DEFAULT true,
  customer_visible boolean DEFAULT false,
  version integer DEFAULT 1,
  sort_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage form templates" ON public.form_templates FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view form templates" ON public.form_templates FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Form Template Fields
CREATE TABLE public.form_template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  is_required boolean DEFAULT false,
  placeholder text DEFAULT '',
  options jsonb DEFAULT '[]'::jsonb,
  default_value text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_template_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage form fields" ON public.form_template_fields FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view form fields" ON public.form_template_fields FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));
