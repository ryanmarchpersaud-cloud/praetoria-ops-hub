
-- Property site alerts: accessibility, medical, hazards, equipment
CREATE TABLE public.property_site_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  -- Accessibility
  has_wheelchair_ramp BOOLEAN DEFAULT false,
  has_elderly_resident BOOLEAN DEFAULT false,
  has_mobility_impaired BOOLEAN DEFAULT false,
  accessibility_notes TEXT,
  -- Medical
  medical_alert BOOLEAN DEFAULT false,
  medical_alert_text TEXT,
  -- Site hazards
  has_dog BOOLEAN DEFAULT false,
  dog_notes TEXT,
  has_locked_gate BOOLEAN DEFAULT false,
  gate_access_notes TEXT,
  has_steep_grade BOOLEAN DEFAULT false,
  has_low_wires BOOLEAN DEFAULT false,
  has_icy_spots BOOLEAN DEFAULT false,
  hazard_notes TEXT,
  -- Equipment
  required_equipment TEXT[] DEFAULT '{}',
  hand_shovel_only BOOLEAN DEFAULT false,
  equipment_notes TEXT,
  -- General
  priority_tier TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id)
);

-- Customer warnings: payment issues, complaints, behavior
CREATE TABLE public.customer_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL DEFAULT 'general',
  severity TEXT NOT NULL DEFAULT 'low',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.property_site_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_warnings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read site alerts
CREATE POLICY "Authenticated users can read site alerts"
  ON public.property_site_alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage site alerts"
  ON public.property_site_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read customer warnings"
  ON public.customer_warnings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage customer warnings"
  ON public.customer_warnings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_property_site_alerts_updated_at
  BEFORE UPDATE ON public.property_site_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_warnings_updated_at
  BEFORE UPDATE ON public.customer_warnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
