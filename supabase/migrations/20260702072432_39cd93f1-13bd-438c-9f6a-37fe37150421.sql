
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.app_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE private.app_secrets FROM PUBLIC, anon, authenticated;

INSERT INTO private.app_secrets(name, value)
SELECT 'pii_encryption_key', encode(extensions.gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM private.app_secrets WHERE name = 'pii_encryption_key');

CREATE OR REPLACE FUNCTION private.pii_key() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT value FROM private.app_secrets WHERE name = 'pii_encryption_key' LIMIT 1;
$$;
REVOKE ALL ON FUNCTION private.pii_key() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.pii_encrypt(_plain text) RETURNS bytea
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = private, public, extensions AS $$
  SELECT CASE
    WHEN _plain IS NULL OR length(trim(_plain)) = 0 THEN NULL
    ELSE extensions.pgp_sym_encrypt(_plain, private.pii_key())
  END;
$$;
REVOKE ALL ON FUNCTION private.pii_encrypt(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.pii_decrypt(_ct bytea) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public, extensions AS $$
  SELECT CASE WHEN _ct IS NULL THEN NULL ELSE extensions.pgp_sym_decrypt(_ct, private.pii_key()) END;
$$;
REVOKE ALL ON FUNCTION private.pii_decrypt(bytea) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.worker_profiles
  ADD COLUMN IF NOT EXISTS sin_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS bank_account_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS bank_transit_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS bank_institution_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS bank_account_last4 text,
  ADD COLUMN IF NOT EXISTS sin_last3 text;

ALTER TABLE public.subcontractors
  ADD COLUMN IF NOT EXISTS sin_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS bank_account_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS bank_transit_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS bank_institution_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS bank_account_last4 text,
  ADD COLUMN IF NOT EXISTS sin_last3 text;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, sin_encrypted, bank_account_number, bank_transit_number, bank_institution_number
           FROM public.worker_profiles
           WHERE sin_encrypted IS NOT NULL OR bank_account_number IS NOT NULL OR bank_transit_number IS NOT NULL OR bank_institution_number IS NOT NULL
  LOOP
    UPDATE public.worker_profiles SET
      sin_ciphertext = COALESCE(sin_ciphertext, private.pii_encrypt(r.sin_encrypted)),
      bank_account_ciphertext = COALESCE(bank_account_ciphertext, private.pii_encrypt(r.bank_account_number)),
      bank_transit_ciphertext = COALESCE(bank_transit_ciphertext, private.pii_encrypt(r.bank_transit_number)),
      bank_institution_ciphertext = COALESCE(bank_institution_ciphertext, private.pii_encrypt(r.bank_institution_number)),
      sin_last3 = COALESCE(sin_last3, RIGHT(regexp_replace(coalesce(r.sin_encrypted,''), '\D', '', 'g'), 3)),
      bank_account_last4 = COALESCE(bank_account_last4, RIGHT(regexp_replace(coalesce(r.bank_account_number,''), '\D', '', 'g'), 4)),
      sin_encrypted = CASE WHEN r.sin_encrypted IS NOT NULL THEN 'STORED' ELSE NULL END,
      bank_account_number = CASE WHEN r.bank_account_number IS NOT NULL THEN 'STORED' ELSE NULL END,
      bank_transit_number = CASE WHEN r.bank_transit_number IS NOT NULL THEN 'STORED' ELSE NULL END,
      bank_institution_number = CASE WHEN r.bank_institution_number IS NOT NULL THEN 'STORED' ELSE NULL END
    WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, sin_encrypted, bank_account_number, bank_transit_number, bank_institution_number
           FROM public.subcontractors
           WHERE sin_encrypted IS NOT NULL OR bank_account_number IS NOT NULL OR bank_transit_number IS NOT NULL OR bank_institution_number IS NOT NULL
  LOOP
    UPDATE public.subcontractors SET
      sin_ciphertext = COALESCE(sin_ciphertext, private.pii_encrypt(r.sin_encrypted)),
      bank_account_ciphertext = COALESCE(bank_account_ciphertext, private.pii_encrypt(r.bank_account_number)),
      bank_transit_ciphertext = COALESCE(bank_transit_ciphertext, private.pii_encrypt(r.bank_transit_number)),
      bank_institution_ciphertext = COALESCE(bank_institution_ciphertext, private.pii_encrypt(r.bank_institution_number)),
      sin_last3 = COALESCE(sin_last3, RIGHT(regexp_replace(coalesce(r.sin_encrypted,''), '\D', '', 'g'), 3)),
      bank_account_last4 = COALESCE(bank_account_last4, RIGHT(regexp_replace(coalesce(r.bank_account_number,''), '\D', '', 'g'), 4)),
      sin_encrypted = CASE WHEN r.sin_encrypted IS NOT NULL THEN 'STORED' ELSE NULL END,
      bank_account_number = CASE WHEN r.bank_account_number IS NOT NULL THEN 'STORED' ELSE NULL END,
      bank_transit_number = CASE WHEN r.bank_transit_number IS NOT NULL THEN 'STORED' ELSE NULL END,
      bank_institution_number = CASE WHEN r.bank_institution_number IS NOT NULL THEN 'STORED' ELSE NULL END
    WHERE id = r.id;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.encrypt_worker_pii() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, extensions AS $$
BEGIN
  IF NEW.sin_encrypted IS NOT NULL AND NEW.sin_encrypted <> 'STORED' THEN
    NEW.sin_ciphertext := private.pii_encrypt(NEW.sin_encrypted);
    NEW.sin_last3 := RIGHT(regexp_replace(NEW.sin_encrypted, '\D', '', 'g'), 3);
    NEW.sin_encrypted := 'STORED';
  ELSIF NEW.sin_encrypted IS NULL AND (TG_OP = 'INSERT' OR OLD.sin_encrypted IS DISTINCT FROM NEW.sin_encrypted) THEN
    NEW.sin_ciphertext := NULL; NEW.sin_last3 := NULL;
  END IF;
  IF NEW.bank_account_number IS NOT NULL AND NEW.bank_account_number <> 'STORED' THEN
    NEW.bank_account_ciphertext := private.pii_encrypt(NEW.bank_account_number);
    NEW.bank_account_last4 := RIGHT(regexp_replace(NEW.bank_account_number, '\D', '', 'g'), 4);
    NEW.bank_account_number := 'STORED';
  ELSIF NEW.bank_account_number IS NULL AND (TG_OP = 'INSERT' OR OLD.bank_account_number IS DISTINCT FROM NEW.bank_account_number) THEN
    NEW.bank_account_ciphertext := NULL; NEW.bank_account_last4 := NULL;
  END IF;
  IF NEW.bank_transit_number IS NOT NULL AND NEW.bank_transit_number <> 'STORED' THEN
    NEW.bank_transit_ciphertext := private.pii_encrypt(NEW.bank_transit_number);
    NEW.bank_transit_number := 'STORED';
  ELSIF NEW.bank_transit_number IS NULL AND (TG_OP = 'INSERT' OR OLD.bank_transit_number IS DISTINCT FROM NEW.bank_transit_number) THEN
    NEW.bank_transit_ciphertext := NULL;
  END IF;
  IF NEW.bank_institution_number IS NOT NULL AND NEW.bank_institution_number <> 'STORED' THEN
    NEW.bank_institution_ciphertext := private.pii_encrypt(NEW.bank_institution_number);
    NEW.bank_institution_number := 'STORED';
  ELSIF NEW.bank_institution_number IS NULL AND (TG_OP = 'INSERT' OR OLD.bank_institution_number IS DISTINCT FROM NEW.bank_institution_number) THEN
    NEW.bank_institution_ciphertext := NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_encrypt_worker_pii ON public.worker_profiles;
CREATE TRIGGER trg_encrypt_worker_pii
  BEFORE INSERT OR UPDATE ON public.worker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_worker_pii();

DROP TRIGGER IF EXISTS trg_encrypt_subcontractor_pii ON public.subcontractors;
CREATE TRIGGER trg_encrypt_subcontractor_pii
  BEFORE INSERT OR UPDATE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_worker_pii();

CREATE OR REPLACE FUNCTION public.get_worker_pii(_worker_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private, extensions AS $$
DECLARE r public.worker_profiles;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'owner'::public.app_role)
      OR public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'hr_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.worker_profiles WHERE id = _worker_id;
  RETURN jsonb_build_object(
    'sin', private.pii_decrypt(r.sin_ciphertext),
    'bank_account_number', private.pii_decrypt(r.bank_account_ciphertext),
    'bank_transit_number', private.pii_decrypt(r.bank_transit_ciphertext),
    'bank_institution_number', private.pii_decrypt(r.bank_institution_ciphertext)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_worker_pii(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_subcontractor_pii(_sub_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private, extensions AS $$
DECLARE r public.subcontractors;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'owner'::public.app_role)
      OR public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'hr_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.subcontractors WHERE id = _sub_id;
  RETURN jsonb_build_object(
    'sin', private.pii_decrypt(r.sin_ciphertext),
    'bank_account_number', private.pii_decrypt(r.bank_account_ciphertext),
    'bank_transit_number', private.pii_decrypt(r.bank_transit_ciphertext),
    'bank_institution_number', private.pii_decrypt(r.bank_institution_ciphertext)
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_subcontractor_pii(uuid) TO authenticated;

REVOKE SELECT (sin_ciphertext, bank_account_ciphertext, bank_transit_ciphertext, bank_institution_ciphertext) ON public.worker_profiles FROM authenticated;
REVOKE SELECT (sin_ciphertext, bank_account_ciphertext, bank_transit_ciphertext, bank_institution_ciphertext) ON public.subcontractors FROM authenticated;

-- Worker + subcontractor self-update lockdown
DROP POLICY IF EXISTS "Workers can update own photo" ON public.worker_profiles;
DROP POLICY IF EXISTS "Subcontractors update own profile fields" ON public.subcontractors;

CREATE OR REPLACE FUNCTION public.update_own_worker_photo(_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE public.worker_profiles SET profile_photo_url = _url WHERE user_id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.update_own_worker_photo(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_own_subcontractor_photo(_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  UPDATE public.subcontractors SET profile_photo_url = _url WHERE user_id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.update_own_subcontractor_photo(text) TO authenticated;

-- Customers billing exposure lockdown
REVOKE SELECT (
  billing_contact_name, billing_contact_email, billing_contact_phone,
  billing_contact_title, billing_contact_fax,
  accounts_payable_email, requires_po_number, preferred_billing_method,
  billing_address_line_1, billing_city, billing_province, billing_postal_code,
  billing_address_same_as_service, notes, project_notes
) ON public.customers FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_billing_details(_customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.customers;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ops_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.customers WHERE id = _customer_id;
  RETURN jsonb_build_object(
    'billing_contact_name', r.billing_contact_name,
    'billing_contact_email', r.billing_contact_email,
    'billing_contact_phone', r.billing_contact_phone,
    'billing_contact_title', r.billing_contact_title,
    'billing_contact_fax', r.billing_contact_fax,
    'accounts_payable_email', r.accounts_payable_email,
    'requires_po_number', r.requires_po_number,
    'preferred_billing_method', r.preferred_billing_method,
    'billing_address_line_1', r.billing_address_line_1,
    'billing_city', r.billing_city,
    'billing_province', r.billing_province,
    'billing_postal_code', r.billing_postal_code,
    'billing_address_same_as_service', r.billing_address_same_as_service,
    'notes', r.notes,
    'project_notes', r.project_notes
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.get_customer_billing_details(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_customer_delivery_email(_customer_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_ops_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(email, billing_contact_email, accounts_payable_email, site_contact_email)
    INTO v FROM public.customers WHERE id = _customer_id;
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_customer_delivery_email(uuid) TO authenticated;

-- Storage: authenticated-only read policies for now-private buckets
DROP POLICY IF EXISTS "Authenticated can read attachments" ON storage.objects;
CREATE POLICY "Authenticated can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('attachments','avatars','property-photos'));

DROP POLICY IF EXISTS "Authenticated can upload to attachments" ON storage.objects;
CREATE POLICY "Authenticated can upload to attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('attachments','avatars','property-photos'));

DROP POLICY IF EXISTS "Authenticated can update attachments" ON storage.objects;
CREATE POLICY "Authenticated can update attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('attachments','avatars','property-photos'))
WITH CHECK (bucket_id IN ('attachments','avatars','property-photos'));
