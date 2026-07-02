ALTER TABLE public.pm_maintenance_requests DROP CONSTRAINT IF EXISTS pm_mr_status_chk;
ALTER TABLE public.pm_maintenance_requests ADD CONSTRAINT pm_mr_status_chk
  CHECK (status = ANY (ARRAY['new','reviewed','work_order_created','assigned','in_progress','on_hold','completed','cancelled']));

ALTER TABLE public.pm_maintenance_requests DROP CONSTRAINT IF EXISTS pm_mr_category_chk;