CREATE OR REPLACE FUNCTION public.admin_delete_customer(_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_counts jsonb := '{}'::jsonb;
  v_job_ids uuid[];
  v_visit_ids uuid[];
  v_invoice_ids uuid[];
  v_quote_ids uuid[];
  v_property_ids uuid[];
  v_request_ids uuid[];
  v_agreement_ids uuid[];
  v_lead_ids uuid[];
  v_n int;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_owner(v_actor) THEN
    RAISE EXCEPTION 'Only admins or owners can delete customers' USING ERRCODE = '42501';
  END IF;

  IF public.is_protected_customer(_customer_id) THEN
    RAISE EXCEPTION 'PROTECTED_CUSTOMER: This customer is protected and cannot be deleted. Remove the protection flag first.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), company_name, 'unknown')
    INTO v_name FROM public.customers WHERE id = _customer_id;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Customer not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Collect dependent ids first
  SELECT array_agg(id) INTO v_job_ids       FROM public.jobs            WHERE customer_id = _customer_id;
  SELECT array_agg(id) INTO v_visit_ids     FROM public.visits          WHERE customer_id = _customer_id OR job_id = ANY(COALESCE(v_job_ids, ARRAY[]::uuid[]));
  SELECT array_agg(id) INTO v_invoice_ids   FROM public.invoices        WHERE customer_id = _customer_id;
  SELECT array_agg(id) INTO v_quote_ids     FROM public.quotes          WHERE customer_id = _customer_id;
  SELECT array_agg(id) INTO v_property_ids  FROM public.properties      WHERE customer_id = _customer_id;
  SELECT array_agg(id) INTO v_request_ids   FROM public.service_requests WHERE customer_id = _customer_id;
  SELECT array_agg(id) INTO v_agreement_ids FROM public.agreements      WHERE customer_id = _customer_id;
  SELECT array_agg(id) INTO v_lead_ids      FROM public.leads           WHERE customer_id = _customer_id;

  -- Children of jobs / visits / invoices / quotes / requests
  IF v_visit_ids IS NOT NULL THEN
    DELETE FROM public.visit_photos       WHERE visit_id = ANY(v_visit_ids);
    DELETE FROM public.snow_logs          WHERE visit_id = ANY(v_visit_ids);
    BEGIN DELETE FROM public.subcontractor_assignments WHERE visit_id = ANY(v_visit_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;

  IF v_quote_ids IS NOT NULL THEN
    DELETE FROM public.quote_line_items   WHERE quote_id = ANY(v_quote_ids);
  END IF;

  IF v_invoice_ids IS NOT NULL THEN
    DELETE FROM public.invoice_line_items WHERE invoice_id = ANY(v_invoice_ids);
    BEGIN DELETE FROM public.payments     WHERE invoice_id = ANY(v_invoice_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.finance_refunds WHERE invoice_id = ANY(v_invoice_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;

  IF v_job_ids IS NOT NULL THEN
    BEGIN DELETE FROM public.subcontractor_assignments WHERE job_id = ANY(v_job_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.finance_job_cost_snapshots WHERE job_id = ANY(v_job_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.finance_expenses WHERE job_id = ANY(v_job_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;

  IF v_request_ids IS NOT NULL THEN
    BEGIN DELETE FROM public.request_messages WHERE request_id = ANY(v_request_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.request_attachments WHERE request_id = ANY(v_request_ids); EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;

  -- Direct customer-scoped tables
  DELETE FROM public.visits                          WHERE customer_id = _customer_id;
  DELETE FROM public.jobs                            WHERE customer_id = _customer_id;
  DELETE FROM public.invoices                        WHERE customer_id = _customer_id;
  DELETE FROM public.quotes                          WHERE customer_id = _customer_id;
  DELETE FROM public.service_requests                WHERE customer_id = _customer_id;
  DELETE FROM public.agreements                      WHERE customer_id = _customer_id;
  DELETE FROM public.properties                      WHERE customer_id = _customer_id;
  DELETE FROM public.customer_warnings               WHERE customer_id = _customer_id;
  DELETE FROM public.customer_billing_profiles       WHERE customer_id = _customer_id;
  DELETE FROM public.customer_notification_preferences WHERE customer_id = _customer_id;
  DELETE FROM public.customer_recurring_requests     WHERE customer_id = _customer_id;
  DELETE FROM public.customer_referrals              WHERE customer_id = _customer_id;
  DELETE FROM public.customer_service_preferences    WHERE customer_id = _customer_id;
  DELETE FROM public.form_submissions                WHERE customer_id = _customer_id;
  DELETE FROM public.operational_tasks               WHERE customer_id = _customer_id;
  DELETE FROM public.snow_logs                       WHERE customer_id = _customer_id;
  DELETE FROM public.visit_photos                    WHERE customer_id = _customer_id;
  DELETE FROM public.notifications                   WHERE customer_id = _customer_id;
  DELETE FROM public.protected_customers             WHERE customer_id = _customer_id;
  -- leads table: just unlink (preserve lead history)
  UPDATE public.leads SET customer_id = NULL          WHERE customer_id = _customer_id;
  -- audit_log: keep history, do not delete

  -- Counts for the response
  v_counts := jsonb_build_object(
    'jobs',        COALESCE(array_length(v_job_ids, 1), 0),
    'visits',      COALESCE(array_length(v_visit_ids, 1), 0),
    'invoices',    COALESCE(array_length(v_invoice_ids, 1), 0),
    'quotes',      COALESCE(array_length(v_quote_ids, 1), 0),
    'properties',  COALESCE(array_length(v_property_ids, 1), 0),
    'requests',    COALESCE(array_length(v_request_ids, 1), 0),
    'agreements',  COALESCE(array_length(v_agreement_ids, 1), 0)
  );

  -- Finally, the customer
  DELETE FROM public.customers WHERE id = _customer_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  PERFORM public.write_audit_log(
    'customer.delete',
    'customer',
    _customer_id::text,
    NULL,
    true,
    jsonb_build_object('name', v_name) || v_counts,
    NULL,
    NULL, NULL, NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'customer_name', v_name,
    'deleted', v_counts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_customer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_customer(uuid) TO authenticated;