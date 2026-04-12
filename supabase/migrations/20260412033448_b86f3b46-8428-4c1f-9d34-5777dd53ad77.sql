
UPDATE public.payroll_run_items
SET
  -- Employee-paid deductions
  union_dues = 45.00,
  pension_rpp = 92.25,
  rrsp_prpp = 50.00,
  employee_health_premium = 38.50,
  employee_dental_premium = 22.00,
  employee_vision_premium = 8.75,
  group_life_premium = 12.40,
  ltd_premium = 15.60,
  eap_premium = 4.50,
  voluntary_deductions = 0,
  garnishments = 0,
  overpayment_recovery = 0,
  -- Employer contributions
  employer_cpp = 0.28,
  employer_ei = 1.25,
  employer_pension_match = 92.25,
  employer_health_premium = 77.00,
  employer_dental_premium = 44.00,
  employer_group_life = 12.40,
  employer_ltd = 15.60,
  employer_benefit_contribution = 25.00,
  employer_retirement_match = 0,
  -- Recalculate totals
  total_deductions = 0.28 + 0.89 + 54.20 + 45.00 + 92.25 + 50.00 + 38.50 + 22.00 + 8.75 + 12.40 + 15.60 + 4.50 + 58.00,
  net_pay = 1844.99 - (0.28 + 0.89 + 54.20 + 45.00 + 92.25 + 50.00 + 38.50 + 22.00 + 8.75 + 12.40 + 15.60 + 4.50 + 58.00)
WHERE id = '3f7bdbc4-762f-4ebb-9d8c-90290b233867';

-- Also update the employee_pay_stubs record to match
UPDATE public.employee_pay_stubs
SET
  deductions = 0.28 + 0.89 + 54.20 + 45.00 + 92.25 + 50.00 + 38.50 + 22.00 + 8.75 + 12.40 + 15.60 + 4.50 + 58.00,
  net_pay = 1844.99 - (0.28 + 0.89 + 54.20 + 45.00 + 92.25 + 50.00 + 38.50 + 22.00 + 8.75 + 12.40 + 15.60 + 4.50 + 58.00),
  ytd_net = 1844.99 - (0.28 + 0.89 + 54.20 + 45.00 + 92.25 + 50.00 + 38.50 + 22.00 + 8.75 + 12.40 + 15.60 + 4.50 + 58.00)
WHERE id = '822b7c44-8bad-473b-8cad-17412296a443';
