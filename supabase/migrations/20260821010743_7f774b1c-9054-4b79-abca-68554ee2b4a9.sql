UPDATE public.quotes
SET scope_of_work = 'JOB SITE / WORK LOCATION: 908 Park Street, Regina, SK S4N 4Y3' || E'\n\n' || scope_of_work
WHERE quote_number = 'PQ-00027'
  AND scope_of_work NOT ILIKE 'JOB SITE / WORK LOCATION:%';