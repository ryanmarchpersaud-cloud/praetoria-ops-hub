
-- =========================================================
-- AGREEMENTS: lock down anon access, route signing via RPC
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view agreement by signing token" ON public.agreements;
DROP POLICY IF EXISTS "Anon can update agreement via signing token" ON public.agreements;
DROP POLICY IF EXISTS "Can insert signature for valid agreement" ON public.agreement_signatures;

-- Public signing functions (SECURITY DEFINER) ------------------
CREATE OR REPLACE FUNCTION public.get_agreement_by_token(_token uuid)
RETURNS public.agreements
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.agreements
  WHERE signing_token = _token
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.mark_agreement_viewed(_token uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.agreements
   WHERE signing_token = _token AND status = 'sent' LIMIT 1;
  IF v_id IS NULL THEN RETURN; END IF;

  UPDATE public.agreements
     SET status = 'viewed', viewed_at = now()
   WHERE id = v_id;

  INSERT INTO public.agreement_audit_log(agreement_id, action, user_agent)
  VALUES (v_id, 'viewed', NULL);
END $$;

CREATE OR REPLACE FUNCTION public.sign_agreement_with_token(
  _token uuid,
  _signer_name text,
  _signer_email text,
  _signature_data text,
  _signature_type text,
  _consent_text text,
  _user_agent text
) RETURNS public.agreements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ag public.agreements%ROWTYPE;
BEGIN
  IF _token IS NULL THEN RAISE EXCEPTION 'Invalid token'; END IF;
  IF COALESCE(trim(_signer_name), '') = '' THEN RAISE EXCEPTION 'Signer name required'; END IF;
  IF _signature_type NOT IN ('typed','drawn') THEN RAISE EXCEPTION 'Invalid signature type'; END IF;

  SELECT * INTO v_ag FROM public.agreements WHERE signing_token = _token LIMIT 1;
  IF v_ag.id IS NULL THEN RAISE EXCEPTION 'Agreement not found'; END IF;
  IF v_ag.status NOT IN ('sent','viewed') THEN
    RAISE EXCEPTION 'Agreement is not available for signing (status: %)', v_ag.status;
  END IF;
  IF v_ag.expires_at IS NOT NULL AND v_ag.expires_at < now() THEN
    RAISE EXCEPTION 'Agreement has expired';
  END IF;

  INSERT INTO public.agreement_signatures(
    agreement_id, signer_name, signer_email,
    signature_data, signature_type, consent_text, user_agent
  ) VALUES (
    v_ag.id, _signer_name, NULLIF(_signer_email,''),
    _signature_data, _signature_type,
    COALESCE(NULLIF(_consent_text,''), 'I have read and agree to the terms of this agreement.'),
    _user_agent
  );

  UPDATE public.agreements
     SET status = 'signed', signed_at = now()
   WHERE id = v_ag.id
   RETURNING * INTO v_ag;

  INSERT INTO public.agreement_audit_log(agreement_id, action, user_agent, metadata)
  VALUES (v_ag.id, 'signed', _user_agent,
          jsonb_build_object('signer_name', _signer_name, 'signer_email', _signer_email));

  RETURN v_ag;
END $$;

CREATE OR REPLACE FUNCTION public.decline_agreement_with_token(_token uuid, _user_agent text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.agreements
   WHERE signing_token = _token AND status IN ('sent','viewed') LIMIT 1;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Agreement not available'; END IF;

  UPDATE public.agreements
     SET status = 'declined', declined_at = now()
   WHERE id = v_id;

  INSERT INTO public.agreement_audit_log(agreement_id, action, user_agent)
  VALUES (v_id, 'declined', _user_agent);
END $$;

GRANT EXECUTE ON FUNCTION public.get_agreement_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_agreement_viewed(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_agreement_with_token(uuid, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_agreement_with_token(uuid, text) TO anon, authenticated;

-- =========================================================
-- AGREEMENT TEMPLATES: restrict write to ops staff
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can insert templates" ON public.agreement_templates;
DROP POLICY IF EXISTS "Authenticated can update templates" ON public.agreement_templates;
DROP POLICY IF EXISTS "Authenticated can delete templates" ON public.agreement_templates;

CREATE POLICY "Ops staff insert templates"
ON public.agreement_templates FOR INSERT TO authenticated
WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff update templates"
ON public.agreement_templates FOR UPDATE TO authenticated
USING (public.is_ops_staff(auth.uid()))
WITH CHECK (public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff delete templates"
ON public.agreement_templates FOR DELETE TO authenticated
USING (public.is_ops_staff(auth.uid()));

-- =========================================================
-- CUSTOMER WARNINGS: restrict read
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can read customer warnings" ON public.customer_warnings;

CREATE POLICY "Ops staff and owning customer read warnings"
ON public.customer_warnings FOR SELECT TO authenticated
USING (
  public.is_ops_staff(auth.uid())
  OR customer_id = public.get_customer_id_for_user(auth.uid())
);

-- =========================================================
-- PROFILES: restrict read to own + ops
-- =========================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_ops_staff(auth.uid()));

-- =========================================================
-- PROPERTY SITE ALERTS: restrict read
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can read site alerts" ON public.property_site_alerts;

CREATE POLICY "Scoped read site alerts"
ON public.property_site_alerts FOR SELECT TO authenticated
USING (
  public.is_ops_staff(auth.uid())
  OR public.customer_id_for_property(property_id) = public.get_customer_id_for_user(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.property_id = property_site_alerts.property_id
      AND (
        public.is_worker_assigned_to_visit(auth.uid(), v.id)
        OR public.is_sub_assigned_to_visit(auth.uid(), v.id)
      )
  )
);

-- =========================================================
-- STORAGE: agreement-attachments — restrict delete to ops staff
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can delete agreement files" ON storage.objects;
CREATE POLICY "Ops staff delete agreement files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agreement-attachments' AND public.is_ops_staff(auth.uid()));

-- =========================================================
-- STORAGE: invoice-attachments — restrict uploads to ops staff
-- =========================================================
DROP POLICY IF EXISTS "Allow authenticated uploads to invoice-attachments" ON storage.objects;
CREATE POLICY "Ops staff upload invoice attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoice-attachments' AND public.is_ops_staff(auth.uid()));

-- =========================================================
-- STORAGE: hr-documents — restrict to ops staff
-- =========================================================
DROP POLICY IF EXISTS "Staff can read HR documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload HR documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete HR documents" ON storage.objects;

CREATE POLICY "Ops staff read HR documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'hr-documents' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff upload HR documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hr-documents' AND public.is_ops_staff(auth.uid()));

CREATE POLICY "Ops staff delete HR documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'hr-documents' AND public.is_ops_staff(auth.uid()));

-- =========================================================
-- STORAGE: request-attachments — remove broad public-read
-- (keeps existing scoped + ops policies that already exist)
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view request attachments" ON storage.objects;

-- =========================================================
-- FUNCTION HARDENING: search_path on personal-expense trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_personal_expense_next_due()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  candidate DATE;
  today DATE := CURRENT_DATE;
  yr INT; mo INT; day_in_month INT;
BEGIN
  yr := EXTRACT(YEAR FROM today);
  mo := EXTRACT(MONTH FROM today);
  day_in_month := LEAST(NEW.due_day, EXTRACT(DAY FROM (date_trunc('month', today) + interval '1 month' - interval '1 day'))::INT);
  candidate := make_date(yr, mo, day_in_month);
  IF candidate < today THEN
    candidate := (candidate + interval '1 month')::DATE;
    day_in_month := LEAST(NEW.due_day, EXTRACT(DAY FROM (date_trunc('month', candidate) + interval '1 month' - interval '1 day'))::INT);
    candidate := make_date(EXTRACT(YEAR FROM candidate)::INT, EXTRACT(MONTH FROM candidate)::INT, day_in_month);
  END IF;
  NEW.next_due_date := candidate;
  NEW.updated_at := now();
  RETURN NEW;
END $function$;
