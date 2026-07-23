ALTER TYPE public.notification_event ADD VALUE IF NOT EXISTS 'task_assigned';
ALTER TABLE public.operational_tasks ADD COLUMN IF NOT EXISTS customer_name_text text;
ALTER TABLE public.operational_tasks ADD COLUMN IF NOT EXISTS property_name_text text;