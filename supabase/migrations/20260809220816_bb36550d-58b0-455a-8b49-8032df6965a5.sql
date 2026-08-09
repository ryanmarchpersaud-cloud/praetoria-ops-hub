DO $$
DECLARE v_sub uuid := '6e61705b-e762-41c3-9cc0-64b5d92c3b6d';
        v_num text;
        v_id uuid;
BEGIN
  SELECT 'PS-' || lpad((COALESCE(MAX(substring(pay_stub_number from 4)::int), 0) + 1)::text, 5, '0')
    INTO v_num FROM public.subcontractor_pay_stubs WHERE pay_stub_number ~ '^PS-[0-9]+$';

  INSERT INTO public.subcontractor_pay_stubs
    (subcontractor_id, pay_stub_number, period_start, period_end, status, subtotal, confirmed_subtotal, pending_subtotal, total, internal_notes)
  VALUES (v_sub, v_num, '2026-07-30', '2026-08-07', 'draft', 1050.00, 1050.00, 0.00, 1050.00,
    'Pay period July 30 - August 7, 2026. Hours per Ryan handwritten note (Aug 7 recorded as 6.5 hrs).')
  RETURNING id INTO v_id;

  INSERT INTO public.subcontractor_pay_stub_line_items
    (pay_stub_id, work_date, start_time, end_time, hours, hourly_rate, line_total, service_type, notes, is_confirmed, sort_order)
  VALUES
    (v_id,'2026-08-01','12:00','15:00',3.00,30.00,90.00,'Labour','12:00 PM - 3:00 PM',true,1),
    (v_id,'2026-08-05','08:00','17:00',9.00,40.00,360.00,'Labour','8:00 AM - 5:00 PM',true,2),
    (v_id,'2026-08-06','07:30','16:00',8.50,40.00,340.00,'Labour','7:30 AM - 4:00 PM',true,3),
    (v_id,'2026-08-07','08:00','14:00',6.50,40.00,260.00,'Labour','8:00 AM - 2:00 PM (6.5 hrs per handwritten note)',true,4);
END $$;