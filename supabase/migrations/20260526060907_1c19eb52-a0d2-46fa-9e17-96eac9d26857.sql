-- 1) Restrict products_services write access to ops staff only
DROP POLICY IF EXISTS "Staff full access to products_services" ON public.products_services;

-- Keep read access broad for non-customers so workers/subs can view the catalog (they need to see services)
CREATE POLICY "Non-customers can view products_services"
ON public.products_services
FOR SELECT
TO authenticated
USING (NOT public.has_role(auth.uid(), 'customer'::public.app_role));

-- Only ops staff (owner/admin/ops_manager/accountant/hr_admin/manager) may insert/update/delete
CREATE POLICY "Ops staff can insert products_services"
ON public.products_services
FOR INSERT
TO authenticated
WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can update products_services"
ON public.products_services
FOR UPDATE
TO authenticated
USING (public.is_ops_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff can delete products_services"
ON public.products_services
FOR DELETE
TO authenticated
USING (public.is_ops_staff(auth.uid()));

-- 2) Extend prevent_subcontractor_self_escalation trigger to cover additional admin-only fields
CREATE OR REPLACE FUNCTION public.prevent_subcontractor_self_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  -- Service role / automation (no auth.uid) and ops staff can change anything.
  IF v_actor IS NULL OR public.is_ops_staff(v_actor) OR public.is_admin_or_owner(v_actor) THEN
    RETURN NEW;
  END IF;

  -- Only restrict when the row's owner is the actor (self-edit path).
  IF NEW.user_id IS DISTINCT FROM v_actor THEN
    RETURN NEW;
  END IF;

  -- Block changes to operational / financial / compliance / banking / admin-only fields.
  IF NEW.is_blocked              IS DISTINCT FROM OLD.is_blocked              THEN RAISE EXCEPTION 'Not allowed to change is_blocked'              USING ERRCODE = '42501'; END IF;
  IF NEW.blocked_reason          IS DISTINCT FROM OLD.blocked_reason          THEN RAISE EXCEPTION 'Not allowed to change blocked_reason'          USING ERRCODE = '42501'; END IF;
  IF NEW.active_flag             IS DISTINCT FROM OLD.active_flag             THEN RAISE EXCEPTION 'Not allowed to change active_flag'             USING ERRCODE = '42501'; END IF;
  IF NEW.status                  IS DISTINCT FROM OLD.status                  THEN RAISE EXCEPTION 'Not allowed to change status'                  USING ERRCODE = '42501'; END IF;
  IF NEW.hourly_rate             IS DISTINCT FROM OLD.hourly_rate             THEN RAISE EXCEPTION 'Not allowed to change hourly_rate'             USING ERRCODE = '42501'; END IF;
  IF NEW.pay_type                IS DISTINCT FROM OLD.pay_type                THEN RAISE EXCEPTION 'Not allowed to change pay_type'                USING ERRCODE = '42501'; END IF;
  IF NEW.pay_schedule            IS DISTINCT FROM OLD.pay_schedule            THEN RAISE EXCEPTION 'Not allowed to change pay_schedule'            USING ERRCODE = '42501'; END IF;
  IF NEW.notes_admin_only        IS DISTINCT FROM OLD.notes_admin_only        THEN RAISE EXCEPTION 'Not allowed to change notes_admin_only'        USING ERRCODE = '42501'; END IF;
  IF NEW.user_id                 IS DISTINCT FROM OLD.user_id                 THEN RAISE EXCEPTION 'Not allowed to change user_id'                 USING ERRCODE = '42501'; END IF;
  IF NEW.sin_encrypted           IS DISTINCT FROM OLD.sin_encrypted           THEN RAISE EXCEPTION 'Not allowed to change sin_encrypted'           USING ERRCODE = '42501'; END IF;
  IF NEW.bank_name               IS DISTINCT FROM OLD.bank_name               THEN RAISE EXCEPTION 'Not allowed to change banking fields'          USING ERRCODE = '42501'; END IF;
  IF NEW.bank_account_number     IS DISTINCT FROM OLD.bank_account_number     THEN RAISE EXCEPTION 'Not allowed to change banking fields'          USING ERRCODE = '42501'; END IF;
  IF NEW.bank_transit_number     IS DISTINCT FROM OLD.bank_transit_number     THEN RAISE EXCEPTION 'Not allowed to change banking fields'          USING ERRCODE = '42501'; END IF;
  IF NEW.bank_institution_number IS DISTINCT FROM OLD.bank_institution_number THEN RAISE EXCEPTION 'Not allowed to change banking fields'          USING ERRCODE = '42501'; END IF;

  RETURN NEW;
END;
$function$;