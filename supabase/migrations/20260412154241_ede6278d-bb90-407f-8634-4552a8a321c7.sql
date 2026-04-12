ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'agreement_sent';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'new_service_request';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'emergency_sos';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'incident_report';