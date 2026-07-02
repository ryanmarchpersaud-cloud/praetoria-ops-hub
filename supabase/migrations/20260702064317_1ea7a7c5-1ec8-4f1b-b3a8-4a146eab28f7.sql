ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'new_tenant_referral';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_work_order_created';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_work_order_assigned';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_request_assigned';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_request_reviewed';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_request_in_progress';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_request_completed';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_new_notice';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_ledger_updated';
ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'pm_new_document';

ALTER TYPE public.notification_audience ADD VALUE IF NOT EXISTS 'tenant';
ALTER TYPE public.notification_audience ADD VALUE IF NOT EXISTS 'subcontractor';