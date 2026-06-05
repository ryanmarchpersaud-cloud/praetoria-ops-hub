CREATE OR REPLACE FUNCTION public.update_customer_portal_profile(
  p_first_name text,
  p_last_name text,
  p_company_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address_line_1 text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_postal_code text DEFAULT NULL
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer public.customers;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'customer'::public.app_role) THEN
    RAISE EXCEPTION 'Only signed-in customers can update their portal profile';
  END IF;

  IF length(trim(coalesce(p_first_name, ''))) = 0 THEN
    RAISE EXCEPTION 'First name is required';
  END IF;

  IF length(trim(coalesce(p_last_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Last name is required';
  END IF;

  UPDATE public.customers
  SET
    first_name = left(trim(p_first_name), 100),
    last_name = left(trim(p_last_name), 100),
    company_name = nullif(left(trim(coalesce(p_company_name, '')), 160), ''),
    phone = nullif(left(trim(coalesce(p_phone, '')), 40), ''),
    address_line_1 = nullif(left(trim(coalesce(p_address_line_1, '')), 200), ''),
    city = nullif(left(trim(coalesce(p_city, '')), 120), ''),
    province = nullif(left(trim(coalesce(p_province, '')), 80), ''),
    postal_code = nullif(left(upper(trim(coalesce(p_postal_code, ''))), 20), ''),
    updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING * INTO v_customer;

  IF v_customer.id IS NULL THEN
    RAISE EXCEPTION 'No customer profile is linked to this account';
  END IF;

  RETURN v_customer;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_customer_portal_profile(text, text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_subcontractor_portal_profile(
  p_company_name text,
  p_contact_name text,
  p_phone text DEFAULT NULL,
  p_mailing_address text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL
)
RETURNS public.subcontractors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subcontractor public.subcontractors;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'subcontractor'::public.app_role) THEN
    RAISE EXCEPTION 'Only signed-in subcontractors can update their portal profile';
  END IF;

  IF length(trim(coalesce(p_company_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Company name is required';
  END IF;

  IF length(trim(coalesce(p_contact_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Contact name is required';
  END IF;

  UPDATE public.subcontractors
  SET
    company_name = left(trim(p_company_name), 160),
    contact_name = left(trim(p_contact_name), 160),
    phone = nullif(left(trim(coalesce(p_phone, '')), 40), ''),
    mailing_address = nullif(left(trim(coalesce(p_mailing_address, '')), 240), ''),
    emergency_contact_name = nullif(left(trim(coalesce(p_emergency_contact_name, '')), 160), ''),
    emergency_contact_phone = nullif(left(trim(coalesce(p_emergency_contact_phone, '')), 40), ''),
    updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING * INTO v_subcontractor;

  IF v_subcontractor.id IS NULL THEN
    RAISE EXCEPTION 'No subcontractor profile is linked to this account';
  END IF;

  RETURN v_subcontractor;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_subcontractor_portal_profile(text, text, text, text, text, text) TO authenticated;