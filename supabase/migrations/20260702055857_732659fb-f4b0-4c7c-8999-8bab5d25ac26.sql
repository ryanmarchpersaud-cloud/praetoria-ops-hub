
-- 1. Sequence + trigger for WO numbers
CREATE SEQUENCE IF NOT EXISTS public.pm_work_order_number_seq START 1;

-- 2. pm_work_orders
CREATE TABLE public.pm_work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number text UNIQUE,
  maintenance_request_id uuid NOT NULL UNIQUE REFERENCES public.pm_maintenance_requests(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.pm_managed_properties(id),
  unit_id uuid REFERENCES public.pm_units(id),
  lease_id uuid REFERENCES public.pm_leases(id),
  tenant_id uuid REFERENCES public.pm_tenants(id),
  title text NOT NULL,
  description text,
  category text,
  issue_label text,
  issue_key text,
  priority text NOT NULL DEFAULT 'normal',
  is_urgent_safety boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'created',
  assignee_type text NOT NULL DEFAULT 'unassigned',
  assigned_worker_id uuid,
  assigned_subcontractor_id uuid REFERENCES public.subcontractors(id),
  share_tenant_contact boolean NOT NULL DEFAULT false,
  access_notes text,
  preferred_contact_time text,
  permission_to_enter boolean,
  completion_notes text,
  tenant_visible_completion_note text,
  completed_at timestamptz,
  completed_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_wo_status_check CHECK (status IN ('created','assigned','in_progress','completed','cancelled')),
  CONSTRAINT pm_wo_assignee_type_check CHECK (assignee_type IN ('worker','subcontractor','unassigned'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_work_orders TO authenticated;
GRANT ALL ON public.pm_work_orders TO service_role;
GRANT USAGE ON SEQUENCE public.pm_work_order_number_seq TO authenticated, service_role;

ALTER TABLE public.pm_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops full pm_work_orders" ON public.pm_work_orders
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "worker read own pm_work_orders" ON public.pm_work_orders
  FOR SELECT TO authenticated
  USING (assigned_worker_id = auth.uid());

CREATE POLICY "worker update own pm_work_orders" ON public.pm_work_orders
  FOR UPDATE TO authenticated
  USING (assigned_worker_id = auth.uid())
  WITH CHECK (assigned_worker_id = auth.uid());

CREATE POLICY "sub read own pm_work_orders" ON public.pm_work_orders
  FOR SELECT TO authenticated
  USING (
    assigned_subcontractor_id IS NOT NULL
    AND assigned_subcontractor_id = public.get_subcontractor_id_for_user(auth.uid())
  );

CREATE POLICY "sub update own pm_work_orders" ON public.pm_work_orders
  FOR UPDATE TO authenticated
  USING (
    assigned_subcontractor_id IS NOT NULL
    AND assigned_subcontractor_id = public.get_subcontractor_id_for_user(auth.uid())
  )
  WITH CHECK (
    assigned_subcontractor_id IS NOT NULL
    AND assigned_subcontractor_id = public.get_subcontractor_id_for_user(auth.uid())
  );

-- Tenant read own WOs (safe columns only enforced in hook)
CREATE POLICY "tenant read own pm_work_orders" ON public.pm_work_orders
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT id FROM public.pm_tenants WHERE user_id = auth.uid()
    )
  );

-- WO number trigger
CREATE OR REPLACE FUNCTION public.generate_pm_work_order_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    NEW.work_order_number := 'WO-' || LPAD(nextval('public.pm_work_order_number_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_wo_number BEFORE INSERT ON public.pm_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_pm_work_order_number();

CREATE TRIGGER trg_pm_wo_updated BEFORE UPDATE ON public.pm_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Extend pm_maintenance_requests
ALTER TABLE public.pm_maintenance_requests
  ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.pm_work_orders(id);

-- 4. Extend pm_maintenance_request_attachments (tenant visibility)
ALTER TABLE public.pm_maintenance_request_attachments
  ADD COLUMN IF NOT EXISTS tenant_visible boolean NOT NULL DEFAULT false;

-- 5. Status sync trigger: WO -> request
CREATE OR REPLACE FUNCTION public.sync_pm_request_status_from_wo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_req_status text;
BEGIN
  new_req_status := CASE NEW.status
    WHEN 'created'     THEN 'work_order_created'
    WHEN 'assigned'    THEN 'assigned'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed'   THEN 'completed'
    WHEN 'cancelled'   THEN 'cancelled'
    ELSE NULL END;

  IF new_req_status IS NOT NULL THEN
    UPDATE public.pm_maintenance_requests
       SET status = new_req_status,
           work_order_id = NEW.id,
           completed_at = CASE WHEN NEW.status = 'completed' THEN COALESCE(NEW.completed_at, now())
                               ELSE completed_at END
     WHERE id = NEW.maintenance_request_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pm_wo_sync_request AFTER INSERT OR UPDATE OF status ON public.pm_work_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_pm_request_status_from_wo();

-- 6. pm_work_order_attachments
CREATE TABLE public.pm_work_order_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES public.pm_work_orders(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  content_type text,
  kind text NOT NULL DEFAULT 'other',
  tenant_visible boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_wo_att_kind CHECK (kind IN ('before','after','completion','other'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_work_order_attachments TO authenticated;
GRANT ALL ON public.pm_work_order_attachments TO service_role;

ALTER TABLE public.pm_work_order_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops full pm_wo_attachments" ON public.pm_work_order_attachments
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "worker/sub read own wo attachments" ON public.pm_work_order_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pm_work_orders w
      WHERE w.id = work_order_id
        AND (
          w.assigned_worker_id = auth.uid()
          OR (w.assigned_subcontractor_id IS NOT NULL
              AND w.assigned_subcontractor_id = public.get_subcontractor_id_for_user(auth.uid()))
        )
    )
  );

CREATE POLICY "worker/sub insert own wo attachments" ON public.pm_work_order_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pm_work_orders w
      WHERE w.id = work_order_id
        AND (
          w.assigned_worker_id = auth.uid()
          OR (w.assigned_subcontractor_id IS NOT NULL
              AND w.assigned_subcontractor_id = public.get_subcontractor_id_for_user(auth.uid()))
        )
    )
  );

CREATE POLICY "tenant read visible wo attachments" ON public.pm_work_order_attachments
  FOR SELECT TO authenticated
  USING (
    tenant_visible = true
    AND EXISTS (
      SELECT 1 FROM public.pm_work_orders w
      JOIN public.pm_tenants t ON t.id = w.tenant_id
      WHERE w.id = work_order_id AND t.user_id = auth.uid()
    )
  );

-- 7. pm_maintenance_activity
CREATE TABLE public.pm_maintenance_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.pm_maintenance_requests(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES public.pm_work_orders(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_role text,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  tenant_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pm_activity_request_idx ON public.pm_maintenance_activity(request_id, created_at DESC);
CREATE INDEX pm_activity_wo_idx ON public.pm_maintenance_activity(work_order_id, created_at DESC);

GRANT SELECT, INSERT ON public.pm_maintenance_activity TO authenticated;
GRANT ALL ON public.pm_maintenance_activity TO service_role;

ALTER TABLE public.pm_maintenance_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops full pm_activity" ON public.pm_maintenance_activity
  FOR ALL TO authenticated
  USING (public.is_ops_staff(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "ops insert pm_activity" ON public.pm_maintenance_activity
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pm_work_orders w
      WHERE w.id = work_order_id
        AND (
          w.assigned_worker_id = auth.uid()
          OR (w.assigned_subcontractor_id IS NOT NULL
              AND w.assigned_subcontractor_id = public.get_subcontractor_id_for_user(auth.uid()))
        )
    )
  );

CREATE POLICY "worker/sub read own wo activity" ON public.pm_maintenance_activity
  FOR SELECT TO authenticated
  USING (
    work_order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.pm_work_orders w
      WHERE w.id = work_order_id
        AND (
          w.assigned_worker_id = auth.uid()
          OR (w.assigned_subcontractor_id IS NOT NULL
              AND w.assigned_subcontractor_id = public.get_subcontractor_id_for_user(auth.uid()))
        )
    )
  );

CREATE POLICY "tenant read own visible activity" ON public.pm_maintenance_activity
  FOR SELECT TO authenticated
  USING (
    tenant_visible = true
    AND request_id IN (
      SELECT r.id FROM public.pm_maintenance_requests r
      JOIN public.pm_tenants t ON t.id = r.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );
