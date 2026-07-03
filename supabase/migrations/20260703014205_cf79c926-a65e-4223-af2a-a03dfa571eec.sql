
-- ============================================================
-- PHASE 6B — Move-Out Workflow + Staff Assignment Foundation
-- ============================================================

-- 1. Extend pm_move_out_checklists ---------------------------
ALTER TABLE public.pm_move_out_checklists
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.pm_tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS move_out_date date,
  ADD COLUMN IF NOT EXISTS notice_received_date date,
  ADD COLUMN IF NOT EXISTS inspection_date date,
  ADD COLUMN IF NOT EXISTS tenant_instructions_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS keys_returned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS garage_opener_returned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parking_pass_returned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_meter_reading text,
  ADD COLUMN IF NOT EXISTS tenant_visible_notes text,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- Broaden status set (drop old CHECK if it exists, add new one)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pm_move_out_checklists'::regclass
      AND contype = 'c'
      AND conname LIKE '%status%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.pm_move_out_checklists DROP CONSTRAINT ' || quote_ident(conname)
      FROM pg_constraint
      WHERE conrelid = 'public.pm_move_out_checklists'::regclass
        AND contype = 'c'
        AND conname LIKE '%status%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.pm_move_out_checklists
  ADD CONSTRAINT pm_move_out_checklists_status_check
  CHECK (status IN (
    'notice_received','scheduled','inspection_pending','inspection_completed',
    'cleaning_required','repairs_required','deposit_review','completed','cancelled',
    'open','in_progress'
  ));

-- 2. Add move_out link to staff tasks ------------------------
ALTER TABLE public.pm_staff_tasks
  ADD COLUMN IF NOT EXISTS move_out_id uuid REFERENCES public.pm_move_out_checklists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS move_in_id uuid REFERENCES public.pm_move_in_checklists(id) ON DELETE SET NULL;

-- 3. Inspections -------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_move_out_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  move_out_id uuid NOT NULL REFERENCES public.pm_move_out_checklists(id) ON DELETE CASCADE,
  general_condition_notes text,
  damage_notes text,
  cleaning_notes text,
  keys_remotes_returned boolean NOT NULL DEFAULT false,
  tenant_visible boolean NOT NULL DEFAULT false,
  admin_only_notes text,
  inspected_by uuid,
  inspected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_move_out_inspections TO authenticated;
GRANT ALL ON public.pm_move_out_inspections TO service_role;
ALTER TABLE public.pm_move_out_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_moveout_insp_select" ON public.pm_move_out_inspections
  FOR SELECT TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pm_move_out_checklists mo
      WHERE mo.id = pm_move_out_inspections.move_out_id
        AND mo.assigned_to = auth.uid()
    )
  );
CREATE POLICY "pm_moveout_insp_write" ON public.pm_move_out_inspections
  FOR ALL TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pm_move_out_checklists mo
      WHERE mo.id = pm_move_out_inspections.move_out_id
        AND mo.assigned_to = auth.uid()
    )
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pm_move_out_checklists mo
      WHERE mo.id = pm_move_out_inspections.move_out_id
        AND mo.assigned_to = auth.uid()
    )
  );
CREATE TRIGGER trg_pm_moveout_insp_updated BEFORE UPDATE ON public.pm_move_out_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.pm_move_out_inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.pm_move_out_inspections(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_move_out_inspection_photos TO authenticated;
GRANT ALL ON public.pm_move_out_inspection_photos TO service_role;
ALTER TABLE public.pm_move_out_inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pm_moveout_photo_all" ON public.pm_move_out_inspection_photos
  FOR ALL TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pm_move_out_inspections i
      JOIN public.pm_move_out_checklists mo ON mo.id = i.move_out_id
      WHERE i.id = pm_move_out_inspection_photos.inspection_id
        AND mo.assigned_to = auth.uid()
    )
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pm_move_out_inspections i
      JOIN public.pm_move_out_checklists mo ON mo.id = i.move_out_id
      WHERE i.id = pm_move_out_inspection_photos.inspection_id
        AND mo.assigned_to = auth.uid()
    )
  );

-- 4. Seed default move-out checklist items ------------------
CREATE OR REPLACE FUNCTION public.seed_pm_move_out_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pm_move_out_checklist_items WHERE checklist_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.pm_move_out_checklist_items (checklist_id, label, category, sort_order) VALUES
    (NEW.id, 'Notice received', 'notice', 10),
    (NEW.id, 'Move-out date confirmed', 'notice', 20),
    (NEW.id, 'Tenant move-out instructions sent', 'notice', 30),
    (NEW.id, 'Keys / remotes return required', 'access', 40),
    (NEW.id, 'Garage opener return required', 'access', 50),
    (NEW.id, 'Parking pass return required', 'access', 60),
    (NEW.id, 'Move-out inspection scheduled', 'inspection', 70),
    (NEW.id, 'Move-out inspection completed', 'inspection', 80),
    (NEW.id, 'Photos uploaded', 'inspection', 90),
    (NEW.id, 'Cleaning condition reviewed', 'condition', 100),
    (NEW.id, 'Damage notes added', 'condition', 110),
    (NEW.id, 'Repairs required (yes/no)', 'condition', 120),
    (NEW.id, 'Final utility / meter reading', 'utilities', 130),
    (NEW.id, 'Final tenant ledger review (placeholder)', 'financial', 140),
    (NEW.id, 'Deposit review (placeholder)', 'financial', 150),
    (NEW.id, 'Unit status set to vacant / available soon', 'unit', 160),
    (NEW.id, 'Re-listing task created (if needed)', 'unit', 170);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_pm_move_out_items ON public.pm_move_out_checklists;
CREATE TRIGGER trg_seed_pm_move_out_items AFTER INSERT ON public.pm_move_out_checklists
  FOR EACH ROW EXECUTE FUNCTION public.seed_pm_move_out_items();

-- 5. Tighten RLS: leasing_agent sees only own-assigned rows -
-- Prospects
DROP POLICY IF EXISTS "pm_staff_select_prospects" ON public.pm_prospects;
DROP POLICY IF EXISTS "pm_staff_update_prospects" ON public.pm_prospects;
CREATE POLICY "pm_staff_select_prospects" ON public.pm_prospects
  FOR SELECT TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND (assigned_to = auth.uid() OR assigned_to IS NULL))
  );
CREATE POLICY "pm_staff_update_prospects" ON public.pm_prospects
  FOR UPDATE TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  );

-- Showings
DROP POLICY IF EXISTS "pm_staff_select_showings" ON public.pm_showings;
DROP POLICY IF EXISTS "pm_staff_update_showings" ON public.pm_showings;
CREATE POLICY "pm_staff_select_showings" ON public.pm_showings
  FOR SELECT TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND (assigned_to = auth.uid() OR assigned_to IS NULL))
  );
CREATE POLICY "pm_staff_update_showings" ON public.pm_showings
  FOR UPDATE TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  );

-- Applications: no assigned_to yet -> add column
ALTER TABLE public.pm_applications ADD COLUMN IF NOT EXISTS assigned_to uuid;
DROP POLICY IF EXISTS "pm_staff_select_applications" ON public.pm_applications;
DROP POLICY IF EXISTS "pm_staff_update_applications" ON public.pm_applications;
CREATE POLICY "pm_staff_select_applications" ON public.pm_applications
  FOR SELECT TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND (assigned_to = auth.uid() OR assigned_to IS NULL))
  );
CREATE POLICY "pm_staff_update_applications" ON public.pm_applications
  FOR UPDATE TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  );

-- Move-ins
DROP POLICY IF EXISTS "pm_staff_select_moveins" ON public.pm_move_in_checklists;
DROP POLICY IF EXISTS "pm_staff_update_moveins" ON public.pm_move_in_checklists;
CREATE POLICY "pm_staff_select_moveins" ON public.pm_move_in_checklists
  FOR SELECT TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND (assigned_to = auth.uid() OR assigned_to IS NULL))
  );
CREATE POLICY "pm_staff_update_moveins" ON public.pm_move_in_checklists
  FOR UPDATE TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  );

-- Move-outs: replace mgr-only ALL policy with granular ones
DROP POLICY IF EXISTS "pm_mgr_all_moveouts" ON public.pm_move_out_checklists;
CREATE POLICY "pm_mo_select" ON public.pm_move_out_checklists
  FOR SELECT TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  );
CREATE POLICY "pm_mo_insert" ON public.pm_move_out_checklists
  FOR INSERT TO authenticated WITH CHECK (
    public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid())
  );
CREATE POLICY "pm_mo_update" ON public.pm_move_out_checklists
  FOR UPDATE TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  );
CREATE POLICY "pm_mo_delete" ON public.pm_move_out_checklists
  FOR DELETE TO authenticated USING (
    public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid())
  );

-- Move-out checklist items: allow assigned leasing_agent
DROP POLICY IF EXISTS "pm_mgr_all_moveoutitems" ON public.pm_move_out_checklist_items;
CREATE POLICY "pm_moitems_all" ON public.pm_move_out_checklist_items
  FOR ALL TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pm_move_out_checklists mo
      WHERE mo.id = pm_move_out_checklist_items.checklist_id
        AND mo.assigned_to = auth.uid()
    )
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.pm_move_out_checklists mo
      WHERE mo.id = pm_move_out_checklist_items.checklist_id
        AND mo.assigned_to = auth.uid()
    )
  );

-- Staff tasks: leasing_agent sees only assigned
DROP POLICY IF EXISTS "pm_staff_select_tasks" ON public.pm_staff_tasks;
DROP POLICY IF EXISTS "pm_staff_update_tasks" ON public.pm_staff_tasks;
CREATE POLICY "pm_staff_select_tasks" ON public.pm_staff_tasks
  FOR SELECT TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND (assigned_to = auth.uid() OR created_by = auth.uid()))
  );
CREATE POLICY "pm_staff_update_tasks" ON public.pm_staff_tasks
  FOR UPDATE TO authenticated USING (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  ) WITH CHECK (
    public.is_ops_staff(auth.uid())
    OR public.is_property_manager(auth.uid())
    OR (public.is_leasing_agent(auth.uid()) AND assigned_to = auth.uid())
  );

-- 6. Notifications for assignments --------------------------
CREATE OR REPLACE FUNCTION public.notify_pm_task_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'pm_task_assigned','in_app','worker', NEW.assigned_to,'pm_staff_task', NEW.id,
      'New PM task: ' || COALESCE(NEW.title,''),
      'You have been assigned a PM task' || COALESCE(' due ' || NEW.due_date::text,'') || '.',
      'sent', now()
    );
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_pm_task_assigned ON public.pm_staff_tasks;
CREATE TRIGGER trg_notify_pm_task_assigned AFTER INSERT OR UPDATE OF assigned_to ON public.pm_staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_pm_task_assigned();

CREATE OR REPLACE FUNCTION public.notify_pm_move_out_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'pm_move_out_assigned','in_app','worker', NEW.assigned_to,'pm_move_out', NEW.id,
      'Move-out assigned to you',
      'A move-out has been assigned to you' || COALESCE(' for ' || NEW.move_out_date::text,'') || '.',
      'sent', now()
    );
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_pm_move_out_assigned ON public.pm_move_out_checklists;
CREATE TRIGGER trg_notify_pm_move_out_assigned AFTER INSERT OR UPDATE OF assigned_to ON public.pm_move_out_checklists
  FOR EACH ROW EXECUTE FUNCTION public.notify_pm_move_out_assigned();

CREATE OR REPLACE FUNCTION public.notify_pm_showing_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (event, channel, audience, recipient_id, record_type, record_id, subject, body, status, sent_at)
    VALUES (
      'pm_showing_assigned','in_app','worker', NEW.assigned_to,'pm_showing', NEW.id,
      'Showing assigned to you',
      'You have been assigned a showing' || COALESCE(' on ' || NEW.scheduled_at::text,'') || '.',
      'sent', now()
    );
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_pm_showing_assigned ON public.pm_showings;
CREATE TRIGGER trg_notify_pm_showing_assigned AFTER INSERT OR UPDATE OF assigned_to ON public.pm_showings
  FOR EACH ROW EXECUTE FUNCTION public.notify_pm_showing_assigned();
