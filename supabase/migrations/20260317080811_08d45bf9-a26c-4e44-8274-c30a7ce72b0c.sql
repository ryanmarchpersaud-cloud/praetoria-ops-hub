
-- Notification event types enum
CREATE TYPE public.notification_event AS ENUM (
  'quote_sent',
  'visit_scheduled',
  'worker_assigned',
  'worker_en_route',
  'visit_completed',
  'invoice_sent',
  'invoice_overdue',
  'payment_received',
  'payment_failed'
);

-- Notification channel enum
CREATE TYPE public.notification_channel AS ENUM ('email', 'sms', 'in_app');

-- Notification audience enum
CREATE TYPE public.notification_audience AS ENUM ('customer', 'worker', 'admin');

-- Notifications table - logs all sent/pending notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event notification_event NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  audience notification_audience NOT NULL DEFAULT 'customer',
  recipient_id UUID, -- user_id of the recipient
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  record_type TEXT, -- e.g. 'quote', 'visit', 'invoice'
  record_id UUID,
  subject TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed, read
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer notification preferences
CREATE TABLE public.customer_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  event notification_event NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, event)
);

-- Notification templates
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event notification_event NOT NULL,
  audience notification_audience NOT NULL DEFAULT 'customer',
  channel notification_channel NOT NULL DEFAULT 'email',
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event, audience, channel)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Notifications RLS
CREATE POLICY "Staff full access to notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'customer'::app_role) AND customer_id = get_customer_id_for_user(auth.uid()));

CREATE POLICY "Customers can mark own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'customer'::app_role) AND customer_id = get_customer_id_for_user(auth.uid()));

-- Notification preferences RLS
CREATE POLICY "Staff full access to notification_preferences"
  ON public.customer_notification_preferences FOR ALL TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'::app_role));

CREATE POLICY "Customers manage own notification preferences"
  ON public.customer_notification_preferences FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'customer'::app_role) AND customer_id = get_customer_id_for_user(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'customer'::app_role) AND customer_id = get_customer_id_for_user(auth.uid()));

-- Templates RLS (read for authenticated, manage for staff)
CREATE POLICY "Authenticated can view active templates"
  ON public.notification_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff can manage templates"
  ON public.notification_templates FOR ALL TO authenticated
  USING (NOT has_role(auth.uid(), 'customer'::app_role))
  WITH CHECK (NOT has_role(auth.uid(), 'customer'::app_role));

-- Seed default notification templates
INSERT INTO public.notification_templates (event, audience, channel, subject_template, body_template) VALUES
  ('quote_sent', 'customer', 'email', 'Your quote {{quote_number}} is ready', 'Hi {{customer_name}}, your quote for {{service_type}} at {{property}} is ready for review. Total: ${{total}}'),
  ('quote_sent', 'customer', 'sms', 'Quote ready', 'Hi {{customer_name}}, your quote {{quote_number}} (${{total}}) for {{property}} is ready. Check your email for details.'),
  ('visit_scheduled', 'customer', 'email', 'Visit scheduled for {{scheduled_date}}', 'Hi {{customer_name}}, a {{service_type}} visit has been scheduled for {{scheduled_date}} at {{property}}.'),
  ('visit_scheduled', 'customer', 'sms', 'Visit scheduled', '{{service_type}} visit scheduled for {{scheduled_date}} at {{property}}.'),
  ('visit_scheduled', 'worker', 'email', 'New assignment: {{property}} on {{scheduled_date}}', 'You have been assigned a {{service_type}} visit at {{property}} on {{scheduled_date}}. Customer: {{customer_name}}.'),
  ('visit_scheduled', 'worker', 'sms', 'New assignment', 'Assigned: {{service_type}} at {{property}} on {{scheduled_date}}. Customer: {{customer_name}}.'),
  ('worker_assigned', 'customer', 'email', 'Worker assigned to your visit', 'Hi {{customer_name}}, {{worker_name}} has been assigned to your {{service_type}} visit at {{property}} on {{scheduled_date}}.'),
  ('worker_assigned', 'worker', 'email', 'You''ve been assigned a visit', 'You''ve been assigned to a {{service_type}} visit at {{property}} on {{scheduled_date}}. Customer: {{customer_name}}.'),
  ('worker_en_route', 'customer', 'email', '{{worker_name}} is on the way', 'Hi {{customer_name}}, {{worker_name}} is en route to {{property}} for your {{service_type}} visit.'),
  ('worker_en_route', 'customer', 'sms', 'Worker en route', '{{worker_name}} is on the way to {{property}} for your {{service_type}} visit.'),
  ('visit_completed', 'customer', 'email', 'Visit completed at {{property}}', 'Hi {{customer_name}}, your {{service_type}} visit at {{property}} has been completed on {{scheduled_date}}.'),
  ('visit_completed', 'customer', 'sms', 'Visit completed', 'Your {{service_type}} visit at {{property}} is complete.'),
  ('invoice_sent', 'customer', 'email', 'Invoice {{invoice_number}} — ${{total}}', 'Hi {{customer_name}}, invoice {{invoice_number}} for ${{total}} is due by {{due_date}}. Property: {{property}}.'),
  ('invoice_sent', 'customer', 'sms', 'Invoice ready', 'Invoice {{invoice_number}} for ${{total}} due {{due_date}}. Check your email for details.'),
  ('invoice_overdue', 'customer', 'email', 'Overdue: Invoice {{invoice_number}}', 'Hi {{customer_name}}, invoice {{invoice_number}} for ${{total}} is now overdue. Please remit payment at your earliest convenience.'),
  ('invoice_overdue', 'customer', 'sms', 'Invoice overdue', 'Invoice {{invoice_number}} (${{total}}) is overdue. Please arrange payment.'),
  ('invoice_overdue', 'admin', 'in_app', 'Overdue invoice {{invoice_number}}', 'Invoice {{invoice_number}} for {{customer_name}} (${{total}}) is now overdue.'),
  ('payment_received', 'customer', 'email', 'Payment received — {{invoice_number}}', 'Hi {{customer_name}}, we''ve received your payment of ${{amount_paid}} for invoice {{invoice_number}}. Thank you!'),
  ('payment_received', 'customer', 'sms', 'Payment received', 'Payment of ${{amount_paid}} received for invoice {{invoice_number}}. Thank you!'),
  ('payment_received', 'admin', 'in_app', 'Payment received for {{invoice_number}}', 'Payment of ${{amount_paid}} received from {{customer_name}} for invoice {{invoice_number}}.'),
  ('payment_failed', 'customer', 'email', 'Payment failed — {{invoice_number}}', 'Hi {{customer_name}}, the payment for invoice {{invoice_number}} (${{total}}) could not be processed. Please update your payment method.'),
  ('payment_failed', 'customer', 'sms', 'Payment failed', 'Payment for invoice {{invoice_number}} failed. Please update your payment method.'),
  ('payment_failed', 'admin', 'in_app', 'Payment failed for {{invoice_number}}', 'Payment failed for {{customer_name}} on invoice {{invoice_number}} (${{total}}).')
ON CONFLICT DO NOTHING;
