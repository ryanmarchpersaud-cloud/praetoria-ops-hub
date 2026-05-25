
-- ============================================================
-- FIX 1: request-attachments bucket — prevent path-squatting
-- Replace blanket INSERT policy with one requiring the first
-- folder to equal the uploader's auth.uid(), OR allowing ops staff
-- (who reply from the admin Request Detail screen using replies/{id}/...).
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload request attachments" ON storage.objects;

CREATE POLICY "Users upload to own folder or ops upload request attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'request-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_ops_staff(auth.uid())
  )
);

-- Also let ops staff view all request attachments (not just admins),
-- so dispatchers/managers can see customer-submitted files when replying.
DROP POLICY IF EXISTS "Staff can view all request attachments" ON storage.objects;
CREATE POLICY "Ops staff can view all request attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND public.is_ops_staff(auth.uid())
);

-- ============================================================
-- FIX 2: subcontractors self-update privilege escalation
-- Keep "update own row" RLS, but block changes to sensitive
-- columns via a BEFORE UPDATE trigger when the actor is the
-- subcontractor themselves (not ops/admin).
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_subcontractor_self_escalation()
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

  -- Only restrict when the row's owner is the actor (self-edit path).
  IF NEW.user_id IS DISTINCT FROM v_actor THEN
    RETURN NEW;
  END IF;

  -- Block changes to operational / financial / compliance / banking fields.
  IF NEW.is_blocked      IS DISTINCT FROM OLD.is_blocked      THEN RAISE EXCEPTION 'Not allowed to change is_blocked'      USING ERRCODE = '42501'; END IF;
  IF NEW.active_flag     IS DISTINCT FROM OLD.active_flag     THEN RAISE EXCEPTION 'Not allowed to change active_flag'     USING ERRCODE = '42501'; END IF;
  IF NEW.status          IS DISTINCT FROM OLD.status          THEN RAISE EXCEPTION 'Not allowed to change status'          USING ERRCODE = '42501'; END IF;
  IF NEW.hourly_rate     IS DISTINCT FROM OLD.hourly_rate     THEN RAISE EXCEPTION 'Not allowed to change hourly_rate'     USING ERRCODE = '42501'; END IF;
  IF NEW.user_id         IS DISTINCT FROM OLD.user_id         THEN RAISE EXCEPTION 'Not allowed to change user_id'         USING ERRCODE = '42501'; END IF;
  IF NEW.sin_encrypted   IS DISTINCT FROM OLD.sin_encrypted   THEN RAISE EXCEPTION 'Not allowed to change sin_encrypted'   USING ERRCODE = '42501'; END IF;
  IF NEW.bank_name       IS DISTINCT FROM OLD.bank_name       THEN RAISE EXCEPTION 'Not allowed to change banking fields'  USING ERRCODE = '42501'; END IF;
  IF NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number THEN RAISE EXCEPTION 'Not allowed to change banking fields' USING ERRCODE = '42501'; END IF;
  IF NEW.bank_transit_number IS DISTINCT FROM OLD.bank_transit_number THEN RAISE EXCEPTION 'Not allowed to change banking fields' USING ERRCODE = '42501'; END IF;
  IF NEW.bank_institution_number IS DISTINCT FROM OLD.bank_institution_number THEN RAISE EXCEPTION 'Not allowed to change banking fields' USING ERRCODE = '42501'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_subcontractor_self_escalation ON public.subcontractors;
CREATE TRIGGER trg_prevent_subcontractor_self_escalation
BEFORE UPDATE ON public.subcontractors
FOR EACH ROW
EXECUTE FUNCTION public.prevent_subcontractor_self_escalation();
