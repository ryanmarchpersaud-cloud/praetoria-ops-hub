ALTER TABLE public.employee_time_off_requests
ADD COLUMN pay_status TEXT NOT NULL DEFAULT 'paid';