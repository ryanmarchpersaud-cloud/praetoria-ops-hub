DO $$
DECLARE v_run uuid; v_num text; v_user uuid := 'd811e752-099c-41d2-a149-ec3df6e75b64';
BEGIN
  SELECT 'PR-' || lpad((COALESCE(MAX(NULLIF(regexp_replace(run_number,'\D','','g'),''))::int,0)+1)::text,5,'0') INTO v_num FROM public.payroll_runs WHERE run_number ~ '^PR-[0-9]+$';

  INSERT INTO public.payroll_runs (run_number, pay_period_start, pay_period_end, pay_date, status, notes, approved_at, processed_at, locked_at)
  VALUES (v_num, '2026-07-27', '2026-07-27', '2026-07-31', 'processed', 'Landscaping day work - Orane Williamson (July 27, 2026)', now(), now(), now())
  RETURNING id INTO v_run;

  INSERT INTO public.payroll_run_items (payroll_run_id, user_id, employee_name, regular_hours, hourly_rate, gross_pay, total_deductions, net_pay, status, memo)
  VALUES (v_run, v_user, 'Orane Williamson', 8, 25.00, 200.00, 0, 200.00, 'processed', 'Landscaping - Monday, July 27, 2026');
END $$;