create or replace function public.prae_related_records(_email text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(_email, '')));
  v_customers jsonb := '[]'::jsonb;
  v_ids uuid[];
  v_properties jsonb := '[]'::jsonb;
  v_quotes jsonb := '[]'::jsonb;
  v_invoices jsonb := '[]'::jsonb;
  v_jobs jsonb := '[]'::jsonb;
  v_visits jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.is_admin_or_owner() then
    raise exception 'role_not_permitted' using errcode = '42501';
  end if;
  if v_email = '' then
    return jsonb_build_object('email', null, 'customers', v_customers, 'properties', v_properties,
      'quotes', v_quotes, 'invoices', v_invoices, 'jobs', v_jobs, 'visits', v_visits);
  end if;

  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb), coalesce(array_agg(c.id), '{}')
    into v_customers, v_ids
  from (
    select id,
           trim(coalesce(company_name, concat_ws(' ', first_name, last_name))) as name,
           email, phone, customer_status
    from public.customers
    where lower(email) = v_email
       or lower(coalesce(secondary_email, '')) = v_email
       or lower(coalesce(billing_contact_email, '')) = v_email
       or lower(coalesce(accounts_payable_email, '')) = v_email
       or lower(coalesce(site_contact_email, '')) = v_email
    order by created_at desc
    limit 5
  ) c;

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return jsonb_build_object('email', v_email, 'customers', '[]'::jsonb, 'properties', v_properties,
      'quotes', v_quotes, 'invoices', v_invoices, 'jobs', v_jobs, 'visits', v_visits);
  end if;

  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into v_properties
  from (select id, property_name, address_line_1, city, status
        from public.properties where customer_id = any(v_ids)
        order by created_at desc limit 10) p;

  select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb) into v_quotes
  from (select id, quote_number, approval_status, sent_status, total, created_at
        from public.quotes where customer_id = any(v_ids)
        order by created_at desc limit 10) q;

  select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb) into v_invoices
  from (select id, invoice_number, status, total, balance_due, due_date
        from public.invoices where customer_id = any(v_ids)
        order by created_at desc limit 10) i;

  select coalesce(jsonb_agg(to_jsonb(j)), '[]'::jsonb) into v_jobs
  from (select id, job_number, job_title, status, scheduled_date
        from public.jobs where customer_id = any(v_ids)
        order by created_at desc limit 10) j;

  select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb) into v_visits
  from (select id, visit_number, visit_status, service_date, scheduled_start_time
        from public.visits where customer_id = any(v_ids)
        order by service_date desc nulls last limit 10) v;

  return jsonb_build_object(
    'email', v_email,
    'customers', v_customers,
    'properties', v_properties,
    'quotes', v_quotes,
    'invoices', v_invoices,
    'jobs', v_jobs,
    'visits', v_visits
  );
end;
$$;

revoke all on function public.prae_related_records(text) from public, anon;
grant execute on function public.prae_related_records(text) to authenticated;