
-- Customer Service Preferences table
CREATE TABLE public.customer_service_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  preferred_service_window text DEFAULT 'no_preference',
  before_6am_ok boolean DEFAULT false,
  before_7am_ok boolean DEFAULT false,
  morning_preference boolean DEFAULT false,
  afternoon_preference boolean DEFAULT false,
  salt_restriction_notes text,
  hand_shovel_only_areas text,
  restricted_access_areas text,
  generator_access_notes text,
  basement_window_notes text,
  deck_patio_notes text,
  side_entrance_notes text,
  back_alley_garbage_access_notes text,
  roof_access_request_notes text,
  general_property_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

ALTER TABLE public.customer_service_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own service preferences"
  ON public.customer_service_preferences FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'customer') AND customer_id = get_customer_id_for_user(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'customer') AND customer_id = get_customer_id_for_user(auth.uid()));

CREATE POLICY "Staff full access to service preferences"
  ON public.customer_service_preferences FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'));

CREATE TRIGGER update_customer_service_preferences_updated_at
  BEFORE UPDATE ON public.customer_service_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Customer Referrals table
CREATE TABLE public.customer_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  referral_name text NOT NULL,
  referral_email text,
  referral_phone text,
  referral_address text,
  status text NOT NULL DEFAULT 'Pending',
  reward_type text DEFAULT 'credit',
  reward_value numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own referrals"
  ON public.customer_referrals FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'customer') AND customer_id = get_customer_id_for_user(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'customer') AND customer_id = get_customer_id_for_user(auth.uid()));

CREATE POLICY "Staff full access to referrals"
  ON public.customer_referrals FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'));

CREATE TRIGGER update_customer_referrals_updated_at
  BEFORE UPDATE ON public.customer_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recurring service requests table
CREATE TABLE public.customer_recurring_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id),
  service_category text NOT NULL,
  frequency text NOT NULL DEFAULT 'weekly',
  preferred_start_date date,
  preferred_service_window text,
  special_instructions text,
  payment_preference text DEFAULT 'invoice',
  status text NOT NULL DEFAULT 'Pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_recurring_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own recurring requests"
  ON public.customer_recurring_requests FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'customer') AND customer_id = get_customer_id_for_user(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'customer') AND customer_id = get_customer_id_for_user(auth.uid()));

CREATE POLICY "Staff full access to recurring requests"
  ON public.customer_recurring_requests FOR ALL
  TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'));

CREATE TRIGGER update_customer_recurring_requests_updated_at
  BEFORE UPDATE ON public.customer_recurring_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
