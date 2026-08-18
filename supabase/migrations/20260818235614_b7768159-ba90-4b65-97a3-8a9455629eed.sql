DO $$
DECLARE
  v_cust uuid := '49c070e2-9af7-46ee-8d3a-11dbc15eaf42';
  v_prop uuid := 'e4c92ae2-ea8c-4ec2-b7cd-f67409dcc536';
  v_qnum text; v_anum text; v_quote uuid; v_merge jsonb;
BEGIN
  SELECT 'PQ-' || lpad(((COALESCE(MAX((regexp_replace(quote_number,'\D','','g'))::int),0))+1)::text, 5, '0')
    INTO v_qnum FROM public.quotes WHERE quote_number ~ '^PQ-[0-9]+$';

  INSERT INTO public.quotes (quote_number, customer_id, property_id, service_category, scope_of_work,
    approval_status, subtotal, tax_rate, tax, total, quote_date, customer_notes)
  VALUES (v_qnum, v_cust, v_prop, 'Snow & Ice',
    'Residential Snow Removal — Combined Quotation & Service Agreement, Season 2026–2027. Seasonal residential snow clearing, 3 visits per week (up to 12 visits per 28-day cycle), November 1, 2026 through April 30, 2027.',
    'Draft', 1950.00, 5, 97.50, 2047.50, CURRENT_DATE,
    'This quotation and the service agreement are one combined document — signing it accepts both the price and the service terms.')
  RETURNING id INTO v_quote;

  SELECT public.generate_agreement_number() INTO v_anum;

  v_merge := jsonb_build_object(
    'legal_company_name','Praetoria Group',
    'praetoria_authorized_representative','Ryan Steven Persaud',
    'customer_name','Manny De Sousa',
    'customer_email','manny_money@live.com',
    'customer_phone','226-868-0248',
    'service_address','3234 Wascana Glen',
    'service_city','Regina',
    'service_province','SK',
    'quotation_number', v_qnum,
    'agreement_number', v_anum,
    'document_version','1',
    'document_status_label','Final Quotation — Awaiting Customer Acceptance',
    'issued_date', to_char(now(),'YYYY-MM-DD'),
    'season_label','2026–2027',
    'season_start_date','2026-11-01',
    'season_end_date','2027-04-30',
    'package_name','Residential Seasonal Snow Clearing — 3 Visits Per Week',
    'estimate_range','$325.00',
    'estimate_seasonal_range','$1,950.00',
    'monthly_price','$325.00 per 28-day billing period',
    'billing_periods','6',
    'seasonal_subtotal','$1,950.00',
    'gst_amount','$97.50',
    'pst_treatment','Snow clearing and ice-control services are subject to 5% GST; no PST applies to the service. Separately sold materials are subject to GST and PST.',
    'total_price','$2,047.50',
    'billing_frequency','Billed every 28 days, due on receipt',
    'additional_visit_rate','$75.00 per additional visit',
    'worker_hour_rate','$50.00',
    'travel_mobilization','Not applicable — property is within Regina city limits',
    'heavy_snow_threshold','15 cm',
    'heavy_snow_charge','$50.00 per worker-hour beyond the standard visit time',
    'deicer_application_charge','$35.00 per application',
    'deicer_material_charge','$0.85 per kilogram applied',
    'emergency_callout_charge','$125.00 per call-out',
    'hauling_charge','$225.00 per load, plus disposal fees at cost',
    'response_target','Within 12 hours of snowfall ending',
    'payment_terms','Due on receipt of each 28-day invoice',
    'late_fee','$25.00 per overdue invoice',
    'interest_rate','1.5% per month (19.56% per year) on overdue balances',
    'suspension_rule','Service is suspended when an invoice is more than 10 days overdue and resumes once the balance is paid in full',
    'cancellation_terms','Either party may cancel with 30 days written notice; the current 28-day period is billed in full',
    'renewal_terms','Renews for the following season only after Praetoria issues, and the Customer signs, a new priced document'
  );

  INSERT INTO public.agreements (
    title, category, document_type, body_html, field_schema, field_values, merge_data,
    recipient_type, recipient_name, recipient_email, customer_id, property_id, quote_id,
    agreement_number, quotation_number, is_combined_document, doc_status, has_unresolved_values,
    activation_checklist, status, version, season_start, season_end
  ) VALUES (
    'Residential Snow Removal Combined Quotation & Service Agreement',
    'customer', 'residential_snow_combined', '', '[]'::jsonb, '{}'::jsonb, v_merge,
    'customer', 'Manny De Sousa', 'manny_money@live.com', v_cust, v_prop, v_quote,
    v_anum, v_qnum, true, 'final_quotation', false,
    '{}'::jsonb, 'draft', 1, '2026-11-01', '2027-04-30'
  );
END $$;