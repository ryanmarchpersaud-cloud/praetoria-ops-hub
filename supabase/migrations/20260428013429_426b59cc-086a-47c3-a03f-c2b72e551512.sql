CREATE OR REPLACE FUNCTION public.block_writes_to_protected_customers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id UUID;
  v_property_id UUID;
  v_name TEXT;
  v_actor UUID;
BEGIN
  BEGIN v_customer_id := NEW.customer_id; EXCEPTION WHEN undefined_column THEN v_customer_id := NULL; END;
  BEGIN v_property_id := NEW.property_id; EXCEPTION WHEN undefined_column THEN v_property_id := NULL; END;

  IF v_customer_id IS NULL AND v_property_id IS NOT NULL THEN
    v_customer_id := public.customer_id_for_property(v_property_id);
  END IF;

  IF v_customer_id IS NULL THEN RETURN NEW; END IF;

  IF NOT public.is_protected_customer(v_customer_id) THEN
    RETURN NEW;
  END IF;

  -- Admin override: a logged-in admin or owner may act on protected customers.
  -- Automation (service role, no auth.uid) and all other roles remain blocked.
  v_actor := auth.uid();
  IF v_actor IS NOT NULL AND public.is_admin_or_owner(v_actor) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), company_name, 'protected customer')
    INTO v_name FROM public.customers WHERE id = v_customer_id;

  RAISE EXCEPTION 'PROTECTED_CUSTOMER: Cannot % % for protected customer "%". This client is on the do-not-touch list — only Ryan (admin) may act on this account.',
    lower(TG_OP), TG_TABLE_NAME, COALESCE(v_name, 'unknown')
    USING ERRCODE = 'check_violation';
END;
$function$;