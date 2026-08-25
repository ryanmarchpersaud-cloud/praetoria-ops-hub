DO $$
DECLARE
  v_customer uuid;
  v_property uuid;
  v_quote uuid;
  v_quote_no text;
  v_agr_no text;
  v_merge jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM public.customers WHERE company_name = 'Salon Centre') THEN
    RAISE EXCEPTION 'Salon Centre already exists';
  END IF;

  INSERT INTO public.customers (
    first_name, last_name, company_name, company_legal_name, operating_name,
    email, phone, address_line_1, city, province, postal_code,
    customer_type, account_type, customer_status, portal_access_enabled,
    primary_contact_title, site_contact_name, site_contact_phone, site_contact_email,
    preferred_communication_method, project_notes
  ) VALUES (
    'Brei-Anne', '—', 'Salon Centre', 'Salon Centre', 'Salon Centre',
    'regfront@saloncentre.ca', '(639) 571-0772', '1438 Cornwall Street', 'Regina', 'SK', 'S4R 2H7',
    'Commercial', 'Company', 'Active', true,
    'Primary Contact', 'Brei-Anne', '(639) 571-0772', 'regfront@saloncentre.ca',
    'Email',
    'Snow & Ice commercial customer. Portal invitation prepared but NOT sent — pending Admin approval. Snow clearing mainly required at the front of the property; back area will rarely require service and is serviced when required/authorized.'
  ) RETURNING id INTO v_customer;

  INSERT INTO public.properties (
    customer_id, property_name, address_line_1, city, province, postal_code,
    property_type, status, seasonal_notes, usage_type
  ) VALUES (
    v_customer, 'Salon Centre — 1438 Cornwall Street', '1438 Cornwall Street', 'Regina', 'SK', 'S4R 2H7',
    'Commercial', 'Active',
    'Small commercial property. Front area is the primary snow-clearing area. Back area rarely requires service; serviced when required and authorized. No measurements confirmed.',
    'commercial'
  ) RETURNING id INTO v_property;

  INSERT INTO public.quotes (
    quote_number, customer_id, property_id, service_category, quote_date,
    scope_of_work, project_notes, approval_status, sent_status,
    unit_rate_quote, is_pricing_sheet, subtotal, tax, total, gst_rate, tax_rate,
    customer_notes, terms_conditions, internal_notes
  ) VALUES (
    '', v_customer, v_property, 'Snow & Ice', CURRENT_DATE,
    E'JOB SITE / WORK LOCATION: 1438 Cornwall Street, Regina, SK S4R 2H7\n\n2026–2027 COMMERCIAL SEASONAL SNOW REMOVAL — SALON CENTRE REGINA\n\nApproved scope of work:\n• Front commercial parking / access area — primary service area\n• Main entrance access\n• Vehicle-access areas within the approved scope\n• Snow pushing and piling on site where appropriate\n• Back / rear service area when required and authorized\n• Service documentation and before/after photographs\n\nAUTOMATIC SERVICE & DISPATCH: Salon Centre is not required to call Praetoria after each qualifying snowfall. Praetoria Snow & Ice monitors snowfall conditions and automatically dispatches qualifying service according to the selected trigger (draft: 2 cm accumulation or greater) and the selected service option.\n\nPROPERTY / SITE NOTES: Small commercial property. Snow clearing is mainly required at the front. The back area will rarely require service; when required, the scope may include both front and back. No square footage, lot dimensions, sidewalk measurements or snow-storage measurements are stated — only confirmed information is used.',
    E'SERVICE OPTION & PRICING SCHEDULE (separate sheet)\n\nOPTION 1 — AUTOMATIC HOURLY / PER-VISIT SERVICE\nRate: $150.00 per hour, per equipment unit (operator included)\nMinimum: 2 hours per service visit\nMinimum Visit Charge: $300.00 per qualifying visit before applicable tax\nAutomatic Trigger: 2 cm accumulation or greater\nIncluded Area: Front and approved rear/back service areas as required\nBilling: Actual service time and equipment used are recorded through the Praetoria Operations Hub.\n\nOPTION 2 — MONTHLY SEASONAL PLAN\nMonthly Rate: $1,440.00 per month plus applicable tax\nIncluded Visits: Up to 12 qualifying snow-removal visits per calendar month\nAutomatic Trigger: 2 cm accumulation\nTypical Event Range: Approximately 2–5 cm\nVisits Beyond 12: Billed under Option 1 pricing ($150.00/hour per equipment unit, 2-hour minimum) unless otherwise approved\nSevere Snow Events: Heavy/severe snowfall requiring additional equipment, additional labour, multiple units or materially longer service time may result in separate charges according to authorized unit rates.\n\nCUSTOMER SELECTS ONE SERVICE OPTION. These options are alternatives and are NOT added together. No fixed contract total applies until the Customer selects an option.\n\nPRAETORIA OPERATIONS HUB CUSTOMER PORTAL\nSalon Centre will receive access to its secure customer portal to view quotations, agreements, invoices, payment history/status, scheduled visits, completed visits, service history, service records and available service photographs.',
    'Needs review', 'Not sent',
    true, true, 0, 0, 0, 5, 5,
    'Please select ONE service option. Option 1 and Option 2 are alternatives and are not added together; no fixed contract total applies until an option is selected.',
    'Snow clearing and ice-control services are subject to 5% GST; no PST applies to the service. Separately sold materials are subject to GST and PST. Automatic dispatch applies once the selected snowfall trigger is reached.',
    'Draft / Needs Review — do not send. Portal invite prepared but unsent pending Admin approval.'
  ) RETURNING id, quote_number INTO v_quote, v_quote_no;

  INSERT INTO public.quote_line_items (quote_id, item_name, description, quantity, unit_price, line_total, sort_order) VALUES
    (v_quote, 'OPTION 1 — Automatic Hourly / Per-Visit Service (per hour, per equipment unit)',
     'Operator included. Minimum 2 hours per service visit. Front and approved rear/back service areas as required. Automatic dispatch at 2 cm accumulation or greater. ALTERNATIVE TO OPTION 2 — not added together.', 1, 150.00, 150.00, 0),
    (v_quote, 'OPTION 1 — Minimum Service Charge per qualifying visit',
     'Two-hour minimum per service visit = $300.00 per qualifying visit before applicable tax.', 1, 300.00, 300.00, 1),
    (v_quote, 'OPTION 2 — Monthly Seasonal Plan (per month)',
     'Up to 12 qualifying snow-removal visits per calendar month. Automatic dispatch at 2 cm accumulation; typical qualifying events approximately 2–5 cm. Visits beyond 12 are billed under Option 1 pricing. ALTERNATIVE TO OPTION 1 — not added together.', 1, 1440.00, 1440.00, 2);

  UPDATE public.quotes SET subtotal = 0, tax = 0, total = 0 WHERE id = v_quote;

  v_agr_no := public.generate_agreement_number();

  v_merge := jsonb_build_object(
    'legal_company_name', 'Praetoria Group',
    'praetoria_authorized_representative', 'Ryan Steven Persaud',
    'document_title', 'Commercial Snow Removal Combined Quotation, Pricing Schedule & Service Agreement',
    'quotation_title', 'Commercial Seasonal Snow Removal 2026–2027 — Salon Centre Regina',
    'customer_name', 'Salon Centre',
    'contact_name', 'Brei-Anne',
    'customer_email', 'regfront@saloncentre.ca',
    'customer_phone', '(639) 571-0772',
    'service_address', '1438 Cornwall Street',
    'service_city', 'Regina',
    'service_province', 'SK',
    'service_postal_code', 'S4R 2H7',
    'quotation_number', v_quote_no,
    'agreement_number', v_agr_no,
    'document_version', '1',
    'document_status_label', 'Draft — Internal Review',
    'issued_date', to_char(CURRENT_DATE, 'YYYY-MM-DD'),
    'season_label', '2026–2027',
    'season_start_date', '2026-11-01',
    'season_end_date', '2027-04-30',
    'option1_rate', '$150.00',
    'option1_minimum_hours', '2 hours',
    'option1_minimum_charge', '$300.00',
    'option2_monthly_rate', '$1,440.00',
    'option2_included_visits', '12',
    'option2_event_range', 'Approximately 2–5 cm',
    'default_trigger', '2 cm accumulation or greater',
    'pst_treatment', 'Snow clearing and ice-control services are subject to 5% GST; no PST applies to the service. Separately sold materials are subject to GST and PST.',
    'payment_terms', 'Net 15 days from the invoice date.',
    'late_fee', '$25.00 per overdue invoice.',
    'interest_rate', '2% per month (26.82% per annum) on overdue balances.',
    'suspension_rule', 'Service may be suspended when an account is more than 30 days past due, until the account is brought current.',
    'cancellation_terms', 'Either party may cancel with 30 days written notice. Service performed to the cancellation date remains payable.',
    'insurance_statement', 'Praetoria maintains commercial general liability insurance and Saskatchewan Workers'' Compensation Board coverage in accordance with current verified company settings. Certificates are available on request.'
  );

  INSERT INTO public.agreements (
    title, category, document_type, body_html, field_schema, field_values, merge_data,
    recipient_type, recipient_name, recipient_email,
    customer_id, property_id, quote_id,
    agreement_number, quotation_number, is_combined_document, doc_status,
    has_unresolved_values, activation_checklist, status, version,
    season_start, season_end, requires_countersignature, internal_reference, notes
  ) VALUES (
    'Commercial Snow Removal Combined Quotation, Pricing Schedule & Service Agreement — Salon Centre',
    'snow', 'commercial_snow_combined', '', '[]'::jsonb, '{}'::jsonb, v_merge,
    'customer', 'Brei-Anne', 'regfront@saloncentre.ca',
    v_customer, v_property, v_quote,
    v_agr_no, v_quote_no, true, 'draft_internal_review',
    false, '{}'::jsonb, 'draft', 1,
    DATE '2026-11-01', DATE '2027-04-30', true, v_quote_no,
    'Draft / Needs Review. Not sent. Body, pricing sheet and field schema are rendered from the commercial_snow_combined master template.'
  );
END $$;