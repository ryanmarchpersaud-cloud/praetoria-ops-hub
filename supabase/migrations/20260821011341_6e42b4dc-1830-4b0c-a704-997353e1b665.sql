UPDATE public.quotes
SET property_id = 'e8d7df2d-1ad8-41b3-8b5e-8019de29a91f',
    scope_of_work = 'JOB SITE / WORK LOCATION: 908 Park Street, Regina, SK S4N 4Y3' || E'\n\n' || scope_of_work
WHERE quote_number = 'PQ-00024'
  AND scope_of_work NOT LIKE 'JOB SITE / WORK LOCATION%';