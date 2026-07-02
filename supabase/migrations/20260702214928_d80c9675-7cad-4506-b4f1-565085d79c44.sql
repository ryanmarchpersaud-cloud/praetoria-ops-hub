
-- Phase 6 — PM Staff / Leasing Agent Portal foundation
-- Additive only. No changes to existing tables or policies.

-- 1. Enum values
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'property_manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'leasing_agent';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_property_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'property_manager'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_leasing_agent(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'leasing_agent'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_pm_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner','admin','property_manager','leasing_agent')
  );
$$;

-- 3. pm_prospects
CREATE TABLE IF NOT EXISTS public.pm_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  preferred_contact text CHECK (preferred_contact IN ('email','phone','sms','any')) DEFAULT 'any',
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  desired_move_in date,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  occupants integer,
  pets text,
  parking text,
  source text CHECK (source IN ('website','referral','phone','social_media','sign','walk_in','other')) DEFAULT 'other',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','showing_scheduled','applied','approved','declined','converted','closed')),
  notes text,
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_prospects TO authenticated;
GRANT ALL ON public.pm_prospects TO service_role;
ALTER TABLE public.pm_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_staff_select_prospects" ON public.pm_prospects FOR SELECT TO authenticated USING (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_insert_prospects" ON public.pm_prospects FOR INSERT TO authenticated WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_update_prospects" ON public.pm_prospects FOR UPDATE TO authenticated USING (public.is_pm_staff(auth.uid())) WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_admin_delete_prospects" ON public.pm_prospects FOR DELETE TO authenticated USING (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()));
CREATE TRIGGER trg_pm_prospects_updated BEFORE UPDATE ON public.pm_prospects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. pm_showings
CREATE TABLE IF NOT EXISTS public.pm_showings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.pm_prospects(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  showing_type text CHECK (showing_type IN ('in_person','virtual','self_guided')) DEFAULT 'in_person',
  assigned_to uuid,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','no_show','cancelled','rescheduled')),
  notes text,
  follow_up_required boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_showings TO authenticated;
GRANT ALL ON public.pm_showings TO service_role;
ALTER TABLE public.pm_showings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_staff_select_showings" ON public.pm_showings FOR SELECT TO authenticated USING (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_insert_showings" ON public.pm_showings FOR INSERT TO authenticated WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_update_showings" ON public.pm_showings FOR UPDATE TO authenticated USING (public.is_pm_staff(auth.uid())) WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_admin_delete_showings" ON public.pm_showings FOR DELETE TO authenticated USING (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()));
CREATE TRIGGER trg_pm_showings_updated BEFORE UPDATE ON public.pm_showings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. pm_applications
CREATE TABLE IF NOT EXISTS public.pm_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.pm_prospects(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','submitted','under_review','approved','declined','withdrawn')),
  submitted_at timestamptz,
  desired_move_in date,
  notes text,
  admin_review_status text CHECK (admin_review_status IN ('pending','in_review','approved','declined')) DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_applications TO authenticated;
GRANT ALL ON public.pm_applications TO service_role;
ALTER TABLE public.pm_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_staff_select_applications" ON public.pm_applications FOR SELECT TO authenticated USING (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_insert_applications" ON public.pm_applications FOR INSERT TO authenticated WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_update_applications" ON public.pm_applications FOR UPDATE TO authenticated USING (public.is_pm_staff(auth.uid())) WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_admin_delete_applications" ON public.pm_applications FOR DELETE TO authenticated USING (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()));
CREATE TRIGGER trg_pm_applications_updated BEFORE UPDATE ON public.pm_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. pm_application_documents
CREATE TABLE IF NOT EXISTS public.pm_application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.pm_applications(id) ON DELETE CASCADE,
  label text NOT NULL,
  file_url text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_application_documents TO authenticated;
GRANT ALL ON public.pm_application_documents TO service_role;
ALTER TABLE public.pm_application_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_staff_all_appdocs" ON public.pm_application_documents FOR ALL TO authenticated
  USING (public.is_pm_staff(auth.uid())) WITH CHECK (public.is_pm_staff(auth.uid()));

-- 7. pm_move_in_checklists
CREATE TABLE IF NOT EXISTS public.pm_move_in_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.pm_prospects(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.pm_applications(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_move_in_checklists TO authenticated;
GRANT ALL ON public.pm_move_in_checklists TO service_role;
ALTER TABLE public.pm_move_in_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_staff_select_moveins" ON public.pm_move_in_checklists FOR SELECT TO authenticated USING (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_insert_moveins" ON public.pm_move_in_checklists FOR INSERT TO authenticated WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_update_moveins" ON public.pm_move_in_checklists FOR UPDATE TO authenticated USING (public.is_pm_staff(auth.uid())) WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_admin_delete_moveins" ON public.pm_move_in_checklists FOR DELETE TO authenticated USING (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()));
CREATE TRIGGER trg_pm_moveins_updated BEFORE UPDATE ON public.pm_move_in_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. pm_move_in_checklist_items
CREATE TABLE IF NOT EXISTS public.pm_move_in_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.pm_move_in_checklists(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text,
  completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  completed_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_move_in_checklist_items TO authenticated;
GRANT ALL ON public.pm_move_in_checklist_items TO service_role;
ALTER TABLE public.pm_move_in_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_staff_all_moveinitems" ON public.pm_move_in_checklist_items FOR ALL TO authenticated
  USING (public.is_pm_staff(auth.uid())) WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE TRIGGER trg_pm_moveinitems_updated BEFORE UPDATE ON public.pm_move_in_checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default move-in items on new checklist
CREATE OR REPLACE FUNCTION public.seed_pm_move_in_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.pm_move_in_checklist_items (checklist_id, label, category, sort_order) VALUES
    (NEW.id, 'Lease signed', 'lease', 10),
    (NEW.id, 'Deposit received', 'financial', 20),
    (NEW.id, 'First rent charge recorded', 'financial', 30),
    (NEW.id, 'Tenant portal invite sent', 'onboarding', 40),
    (NEW.id, 'Insurance requested / provided', 'compliance', 50),
    (NEW.id, 'Emergency contact collected', 'onboarding', 60),
    (NEW.id, 'Keys prepared', 'access', 70),
    (NEW.id, 'Garage remote prepared', 'access', 80),
    (NEW.id, 'Parking info confirmed', 'access', 90),
    (NEW.id, 'Move-in inspection scheduled', 'inspection', 100),
    (NEW.id, 'Move-in inspection completed', 'inspection', 110),
    (NEW.id, 'Photos uploaded', 'inspection', 120),
    (NEW.id, 'Welcome notice sent', 'onboarding', 130);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_seed_pm_move_in_items AFTER INSERT ON public.pm_move_in_checklists
  FOR EACH ROW EXECUTE FUNCTION public.seed_pm_move_in_items();

-- 9. pm_move_out_checklists (Phase 6B placeholder)
CREATE TABLE IF NOT EXISTS public.pm_move_out_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid REFERENCES public.pm_leases(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_move_out_checklists TO authenticated;
GRANT ALL ON public.pm_move_out_checklists TO service_role;
ALTER TABLE public.pm_move_out_checklists ENABLE ROW LEVEL SECURITY;
-- Only admin, owner, property_manager (no leasing_agent access)
CREATE POLICY "pm_mgr_all_moveouts" ON public.pm_move_out_checklists FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()));

-- 10. pm_move_out_checklist_items
CREATE TABLE IF NOT EXISTS public.pm_move_out_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.pm_move_out_checklists(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text,
  completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  completed_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_move_out_checklist_items TO authenticated;
GRANT ALL ON public.pm_move_out_checklist_items TO service_role;
ALTER TABLE public.pm_move_out_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_mgr_all_moveoutitems" ON public.pm_move_out_checklist_items FOR ALL TO authenticated
  USING (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()));

-- 11. pm_staff_tasks
CREATE TABLE IF NOT EXISTS public.pm_staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to uuid,
  property_id uuid REFERENCES public.pm_managed_properties(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.pm_units(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.pm_prospects(id) ON DELETE SET NULL,
  application_id uuid REFERENCES public.pm_applications(id) ON DELETE SET NULL,
  due_date date,
  priority text CHECK (priority IN ('low','normal','high','urgent')) DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pm_staff_tasks TO authenticated;
GRANT ALL ON public.pm_staff_tasks TO service_role;
ALTER TABLE public.pm_staff_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_staff_select_tasks" ON public.pm_staff_tasks FOR SELECT TO authenticated USING (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_insert_tasks" ON public.pm_staff_tasks FOR INSERT TO authenticated WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_staff_update_tasks" ON public.pm_staff_tasks FOR UPDATE TO authenticated USING (public.is_pm_staff(auth.uid())) WITH CHECK (public.is_pm_staff(auth.uid()));
CREATE POLICY "pm_admin_delete_tasks" ON public.pm_staff_tasks FOR DELETE TO authenticated USING (public.is_admin_or_owner(auth.uid()) OR public.is_property_manager(auth.uid()));
CREATE TRIGGER trg_pm_staff_tasks_updated BEFORE UPDATE ON public.pm_staff_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
