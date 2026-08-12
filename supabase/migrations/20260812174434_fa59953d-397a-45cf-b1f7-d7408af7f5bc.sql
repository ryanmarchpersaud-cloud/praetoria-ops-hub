
-- 1. Agreement columns
ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS agreement_number text,
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'service_agreement',
  ADD COLUMN IF NOT EXISTS field_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS field_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fields_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_countersignature boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS countersigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS countersigned_by uuid,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_agreement_id uuid REFERENCES public.agreements(id),
  ADD COLUMN IF NOT EXISTS relationship_type text,
  ADD COLUMN IF NOT EXISTS season_start date,
  ADD COLUMN IF NOT EXISTS season_end date;

CREATE UNIQUE INDEX IF NOT EXISTS agreements_agreement_number_key
  ON public.agreements(agreement_number) WHERE agreement_number IS NOT NULL;

ALTER TABLE public.agreement_signatures
  ADD COLUMN IF NOT EXISTS signer_role text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS signer_title text,
  ADD COLUMN IF NOT EXISTS field_values jsonb;

-- 2. Agreement number generator (PA-00001)
CREATE OR REPLACE FUNCTION public.generate_agreement_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX((regexp_replace(agreement_number, '^PA-', ''))::integer), 0) + 1
    INTO next_num
  FROM public.agreements
  WHERE agreement_number ~ '^PA-[0-9]+$';
  RETURN 'PA-' || lpad(next_num::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_agreement_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.agreement_number IS NULL THEN
    NEW.agreement_number := public.generate_agreement_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_agreement_number ON public.agreements;
CREATE TRIGGER trg_set_agreement_number
BEFORE INSERT ON public.agreements
FOR EACH ROW EXECUTE FUNCTION public.set_agreement_number();

-- Backfill existing agreements
DO $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.agreements WHERE agreement_number IS NULL ORDER BY created_at LOOP
    UPDATE public.agreements SET agreement_number = public.generate_agreement_number() WHERE id = r.id;
    n := n + 1;
  END LOOP;
END $$;

-- 3. Customer signing RPC (token based, guided fields)
CREATE OR REPLACE FUNCTION public.submit_agreement_signature(
  _token text,
  _signer_name text,
  _signer_email text,
  _signer_title text,
  _signature_data text,
  _signature_type text,
  _consent_text text,
  _field_values jsonb,
  _user_agent text
)
RETURNS public.agreements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.agreements;
  new_status text;
BEGIN
  SELECT * INTO a FROM public.agreements WHERE signing_token = _token;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;
  IF a.status IN ('fully_executed','signed','declined','voided','expired','superseded','customer_signed','awaiting_praetoria') THEN
    RAISE EXCEPTION 'This agreement is no longer available for signing';
  END IF;
  IF a.expires_at IS NOT NULL AND a.expires_at < now() THEN
    RAISE EXCEPTION 'This signing link has expired';
  END IF;

  new_status := CASE WHEN a.requires_countersignature THEN 'awaiting_praetoria' ELSE 'fully_executed' END;

  UPDATE public.agreements SET
    field_values = COALESCE(_field_values, field_values),
    fields_locked = true,
    status = new_status,
    signed_at = now(),
    customer_signed_at = now(),
    executed_at = CASE WHEN new_status = 'fully_executed' THEN now() ELSE executed_at END,
    updated_at = now()
  WHERE id = a.id
  RETURNING * INTO a;

  INSERT INTO public.agreement_signatures
    (agreement_id, signer_name, signer_email, signer_title, signer_role, signature_data, signature_type, consent_text, user_agent, field_values)
  VALUES
    (a.id, _signer_name, _signer_email, _signer_title, 'customer', _signature_data, COALESCE(_signature_type,'typed'), _consent_text, _user_agent, _field_values);

  INSERT INTO public.agreement_audit_log (agreement_id, action, metadata, user_agent)
  VALUES (a.id, 'customer_signed', jsonb_build_object('signer_name', _signer_name, 'signer_email', _signer_email, 'signer_title', _signer_title), _user_agent);

  IF new_status = 'fully_executed' THEN
    INSERT INTO public.agreement_audit_log (agreement_id, action, metadata)
    VALUES (a.id, 'completed', jsonb_build_object('agreement_number', a.agreement_number));
  END IF;

  RETURN a;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_agreement_signature(text,text,text,text,text,text,text,jsonb,text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_agreement_signature(text,text,text,text,text,text,text,jsonb,text) TO anon, authenticated, service_role;

-- 4. Praetoria countersignature RPC (ops staff only)
CREATE OR REPLACE FUNCTION public.countersign_agreement(
  _agreement_id uuid,
  _signer_name text,
  _signer_title text,
  _signature_data text,
  _signature_type text,
  _user_agent text
)
RETURNS public.agreements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a public.agreements;
BEGIN
  IF NOT public.is_ops_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to countersign agreements';
  END IF;

  SELECT * INTO a FROM public.agreements WHERE id = _agreement_id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Agreement not found'; END IF;
  IF a.status NOT IN ('awaiting_praetoria','customer_signed','signed') THEN
    RAISE EXCEPTION 'Agreement is not awaiting Praetoria signature';
  END IF;

  UPDATE public.agreements SET
    status = 'fully_executed',
    countersigned_at = now(),
    countersigned_by = auth.uid(),
    executed_at = now(),
    updated_at = now()
  WHERE id = _agreement_id
  RETURNING * INTO a;

  INSERT INTO public.agreement_signatures
    (agreement_id, signer_name, signer_title, signer_role, signature_data, signature_type, consent_text, user_agent)
  VALUES
    (a.id, _signer_name, _signer_title, 'praetoria', _signature_data, COALESCE(_signature_type,'typed'),
     'Authorized representative signature on behalf of Praetoria', _user_agent);

  INSERT INTO public.agreement_audit_log (agreement_id, action, performed_by, metadata, user_agent)
  VALUES (a.id, 'praetoria_signed', auth.uid(), jsonb_build_object('signer_name', _signer_name, 'signer_title', _signer_title), _user_agent);

  INSERT INTO public.agreement_audit_log (agreement_id, action, performed_by, metadata)
  VALUES (a.id, 'completed', auth.uid(), jsonb_build_object('agreement_number', a.agreement_number));

  RETURN a;
END;
$$;

REVOKE ALL ON FUNCTION public.countersign_agreement(uuid,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.countersign_agreement(uuid,text,text,text,text,text) TO authenticated, service_role;

-- 5. Void agreement (ops staff)
CREATE OR REPLACE FUNCTION public.void_agreement(_agreement_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ops_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.agreements
    SET status = 'voided', voided_at = now(), voided_by = auth.uid(), void_reason = _reason, updated_at = now()
  WHERE id = _agreement_id AND status <> 'fully_executed';
  INSERT INTO public.agreement_audit_log (agreement_id, action, performed_by, metadata)
  VALUES (_agreement_id, 'voided', auth.uid(), jsonb_build_object('reason', _reason));
END;
$$;

REVOKE ALL ON FUNCTION public.void_agreement(uuid,text) FROM public;
GRANT EXECUTE ON FUNCTION public.void_agreement(uuid,text) TO authenticated, service_role;
