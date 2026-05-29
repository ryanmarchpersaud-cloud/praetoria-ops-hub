-- ============================================================
-- Security hardening: column-level guards & realtime scoping
-- ============================================================

-- 1) worker_profiles: prevent self-escalation on sensitive fields
--    The existing "Workers can update own photo" RLS policy allows the
--    row owner to UPDATE any column. Add a trigger that blocks changes
--    to compensation, banking, employment, identity, and admin-only
--    fields unless the actor is ops staff (or service-role automation).
CREATE OR REPLACE FUNCTION public.prevent_worker_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  -- Service role / automation (no auth.uid) and ops staff can change anything.
  IF v_actor IS NULL OR public.is_ops_staff(v_actor) OR public.is_admin_or_owner(v_actor) THEN
    RETURN NEW;
  END IF;

  -- Only restrict self-edits.
  IF NEW.user_id IS DISTINCT FROM v_actor THEN
    RETURN NEW;
  END IF;

  -- Compensation
  IF NEW.hourly_rate          IS DISTINCT FROM OLD.hourly_rate          THEN RAISE EXCEPTION 'Not allowed to change hourly_rate'          USING ERRCODE = '42501'; END IF;
  IF NEW.pay_type             IS DISTINCT FROM OLD.pay_type             THEN RAISE EXCEPTION 'Not allowed to change pay_type'             USING ERRCODE = '42501'; END IF;
  IF NEW.pay_schedule         IS DISTINCT FROM OLD.pay_schedule         THEN RAISE EXCEPTION 'Not allowed to change pay_schedule'         USING ERRCODE = '42501'; END IF;
  IF NEW.vacation_balance     IS DISTINCT FROM OLD.vacation_balance     THEN RAISE EXCEPTION 'Not allowed to change vacation_balance'     USING ERRCODE = '42501'; END IF;
  IF NEW.sick_balance         IS DISTINCT FROM OLD.sick_balance         THEN RAISE EXCEPTION 'Not allowed to change sick_balance'         USING ERRCODE = '42501'; END IF;
  IF NEW.personal_days_balance IS DISTINCT FROM OLD.personal_days_balance THEN RAISE EXCEPTION 'Not allowed to change personal_days_balance' USING ERRCODE = '42501'; END IF;

  -- Employment / status
  IF NEW.employment_status    IS DISTINCT FROM OLD.employment_status    THEN RAISE EXCEPTION 'Not allowed to change employment_status'    USING ERRCODE = '42501'; END IF;
  IF NEW.employment_type      IS DISTINCT FROM OLD.employment_type      THEN RAISE EXCEPTION 'Not allowed to change employment_type'      USING ERRCODE = '42501'; END IF;
  IF NEW.hire_date            IS DISTINCT FROM OLD.hire_date            THEN RAISE EXCEPTION 'Not allowed to change hire_date'            USING ERRCODE = '42501'; END IF;
  IF NEW.role_title           IS DISTINCT FROM OLD.role_title           THEN RAISE EXCEPTION 'Not allowed to change role_title'           USING ERRCODE = '42501'; END IF;
  IF NEW.team                 IS DISTINCT FROM OLD.team                 THEN RAISE EXCEPTION 'Not allowed to change team'                 USING ERRCODE = '42501'; END IF;
  IF NEW.employee_id          IS DISTINCT FROM OLD.employee_id          THEN RAISE EXCEPTION 'Not allowed to change employee_id'          USING ERRCODE = '42501'; END IF;
  IF NEW.supervisor_name      IS DISTINCT FROM OLD.supervisor_name      THEN RAISE EXCEPTION 'Not allowed to change supervisor_name'      USING ERRCODE = '42501'; END IF;
  IF NEW.manager_name         IS DISTINCT FROM OLD.manager_name         THEN RAISE EXCEPTION 'Not allowed to change manager_name'         USING ERRCODE = '42501'; END IF;
  IF NEW.branch_location      IS DISTINCT FROM OLD.branch_location      THEN RAISE EXCEPTION 'Not allowed to change branch_location'      USING ERRCODE = '42501'; END IF;

  -- Banking / identity (highly sensitive)
  IF NEW.sin_encrypted        IS DISTINCT FROM OLD.sin_encrypted        THEN RAISE EXCEPTION 'Not allowed to change sin_encrypted'        USING ERRCODE = '42501'; END IF;
  IF NEW.bank_name            IS DISTINCT FROM OLD.bank_name            THEN RAISE EXCEPTION 'Not allowed to change bank_name'            USING ERRCODE = '42501'; END IF;
  IF NEW.bank_institution_number IS DISTINCT FROM OLD.bank_institution_number THEN RAISE EXCEPTION 'Not allowed to change bank_institution_number' USING ERRCODE = '42501'; END IF;

  -- Compliance / driver / equipment
  IF NEW.license_verified     IS DISTINCT FROM OLD.license_verified     THEN RAISE EXCEPTION 'Not allowed to change license_verified'     USING ERRCODE = '42501'; END IF;
  IF NEW.equipment_permissions IS DISTINCT FROM OLD.equipment_permissions THEN RAISE EXCEPTION 'Not allowed to change equipment_permissions' USING ERRCODE = '42501'; END IF;
  IF NEW.benefits_status      IS DISTINCT FROM OLD.benefits_status      THEN RAISE EXCEPTION 'Not allowed to change benefits_status'      USING ERRCODE = '42501'; END IF;
  IF NEW.benefits_provider    IS DISTINCT FROM OLD.benefits_provider    THEN RAISE EXCEPTION 'Not allowed to change benefits_provider'    USING ERRCODE = '42501'; END IF;
  IF NEW.benefits_plan_summary IS DISTINCT FROM OLD.benefits_plan_summary THEN RAISE EXCEPTION 'Not allowed to change benefits_plan_summary' USING ERRCODE = '42501'; END IF;
  IF NEW.benefits_effective_date IS DISTINCT FROM OLD.benefits_effective_date THEN RAISE EXCEPTION 'Not allowed to change benefits_effective_date' USING ERRCODE = '42501'; END IF;

  -- Service category (operational assignment)
  IF NEW.primary_service_category IS DISTINCT FROM OLD.primary_service_category THEN RAISE EXCEPTION 'Not allowed to change primary_service_category' USING ERRCODE = '42501'; END IF;
  IF NEW.secondary_service_category IS DISTINCT FROM OLD.secondary_service_category THEN RAISE EXCEPTION 'Not allowed to change secondary_service_category' USING ERRCODE = '42501'; END IF;

  -- Identity-binding column
  IF NEW.user_id              IS DISTINCT FROM OLD.user_id              THEN RAISE EXCEPTION 'Not allowed to change user_id'              USING ERRCODE = '42501'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_worker_self_escalation ON public.worker_profiles;
CREATE TRIGGER trg_prevent_worker_self_escalation
BEFORE UPDATE ON public.worker_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_worker_self_escalation();


-- 2) realtime.messages: scope broadcast/presence to admins & managers only.
--    The prior policies allowed any non-customer role (including
--    subcontractors and field workers) to subscribe to / publish on any
--    channel topic, exposing admin/manager channels.
DROP POLICY IF EXISTS "Staff can publish realtime broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "Staff can receive realtime broadcasts" ON realtime.messages;

CREATE POLICY "Ops staff can publish realtime broadcasts"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can receive realtime broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.is_ops_staff(auth.uid()));