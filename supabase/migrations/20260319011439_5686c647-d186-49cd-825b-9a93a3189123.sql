
-- Client Hub Settings
CREATE TABLE public.client_hub_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Client profile defaults
  default_customer_types jsonb DEFAULT '["Residential","Commercial","Property Manager","HOA / Condo Board","Government / Municipal"]'::jsonb,
  default_tags jsonb DEFAULT '["VIP","Priority","Seasonal","Recurring","New"]'::jsonb,
  default_contact_method text DEFAULT 'email',
  separate_billing_address boolean DEFAULT false,
  -- Relationship settings
  vip_flag_enabled boolean DEFAULT true,
  do_not_contact_enabled boolean DEFAULT true,
  -- Required fields
  require_email boolean DEFAULT true,
  require_phone boolean DEFAULT true,
  require_address boolean DEFAULT true,
  require_postal_code boolean DEFAULT false,
  duplicate_detection_enabled boolean DEFAULT false,
  portal_invitation_auto boolean DEFAULT false,
  -- Visibility
  comm_history_visible_to text DEFAULT 'admin_only',
  client_notes_editable_by text DEFAULT 'admin_manager',
  comm_prefs_editable_by text DEFAULT 'admin_manager',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_hub_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage client hub settings" ON public.client_hub_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view client hub settings" ON public.client_hub_settings FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Messaging / Email & SMS Settings
CREATE TABLE public.messaging_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_sender_name text DEFAULT 'Praetoria Group',
  default_sender_email text DEFAULT 'noreply@praetoriagroup.ca',
  reply_to_email text DEFAULT 'ops@praetoriagroup.ca',
  sms_sender_label text DEFAULT 'Praetoria',
  default_signature text DEFAULT '',
  unsubscribe_footer text DEFAULT '',
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT true,
  quote_notification boolean DEFAULT true,
  invoice_notification boolean DEFAULT true,
  job_reminder boolean DEFAULT true,
  overdue_reminder boolean DEFAULT true,
  marketing_enabled boolean DEFAULT false,
  internal_notifications boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messaging_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage messaging settings" ON public.messaging_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view messaging settings" ON public.messaging_settings FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Request & Booking Settings
CREATE TABLE public.request_booking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Intake
  request_intake_enabled boolean DEFAULT true,
  online_booking_enabled boolean DEFAULT true,
  request_approval_required boolean DEFAULT false,
  booking_approval_required boolean DEFAULT true,
  same_day_requests boolean DEFAULT true,
  emergency_requests boolean DEFAULT true,
  require_description boolean DEFAULT true,
  require_service_type boolean DEFAULT true,
  require_photos boolean DEFAULT false,
  -- Booking
  lead_time_hours integer DEFAULT 24,
  max_bookings_per_day integer DEFAULT 50,
  cancellation_hours integer DEFAULT 24,
  recurring_booking_enabled boolean DEFAULT true,
  -- Routing
  default_request_owner text DEFAULT 'ops_queue',
  auto_convert_to_quote boolean DEFAULT false,
  triage_required boolean DEFAULT false,
  -- Customer wording
  request_form_instructions text DEFAULT 'Tell us what you need and we will get back to you promptly.',
  booking_confirmation_text text DEFAULT 'Your booking has been confirmed. We will be in touch with details.',
  request_received_text text DEFAULT 'Thank you! Your request has been received and our team is reviewing it.',
  portal_help_text text DEFAULT 'Need help? Contact us at ops@praetoriagroup.ca',
  -- Access
  customers_can_create boolean DEFAULT true,
  customers_can_cancel boolean DEFAULT true,
  staff_can_create boolean DEFAULT true,
  subcontractors_can_view boolean DEFAULT false,
  review_before_convert boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.request_booking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage request booking settings" ON public.request_booking_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view request booking settings" ON public.request_booking_settings FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));

-- Portal Settings
CREATE TABLE public.portal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Visibility
  show_requests boolean DEFAULT true,
  show_quotes boolean DEFAULT true,
  show_invoices boolean DEFAULT true,
  show_jobs boolean DEFAULT false,
  show_visits boolean DEFAULT true,
  show_properties boolean DEFAULT true,
  show_comm_history boolean DEFAULT false,
  show_documents boolean DEFAULT false,
  -- Actions
  allow_submit_requests boolean DEFAULT true,
  allow_approve_quotes boolean DEFAULT true,
  allow_decline_quotes boolean DEFAULT true,
  allow_pay_invoices boolean DEFAULT false,
  allow_update_contact boolean DEFAULT true,
  allow_manage_addresses boolean DEFAULT true,
  allow_reschedule boolean DEFAULT false,
  allow_cancel_requests boolean DEFAULT true,
  -- Branding
  welcome_message text DEFAULT 'Welcome to your Praetoria Group client portal.',
  support_text text DEFAULT 'Need help? Email ops@praetoriagroup.ca or call (780) 555-0100.',
  footer_note text DEFAULT '',
  login_instructions text DEFAULT 'Log in with the email address associated with your account.',
  -- Access
  invitation_required boolean DEFAULT true,
  self_signup_allowed boolean DEFAULT false,
  inactive_client_blocked boolean DEFAULT true,
  multi_property_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage portal settings" ON public.portal_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff view portal settings" ON public.portal_settings FOR SELECT TO authenticated USING (NOT has_role(auth.uid(), 'customer'::app_role));
