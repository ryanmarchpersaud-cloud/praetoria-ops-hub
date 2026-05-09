DO $$
DECLARE
  q_ids uuid[] := ARRAY[
    '60fcb0db-fb14-4d47-9162-c0d9898910f7','d9aa3a75-cc77-4e42-b4f9-e63c4bc03007','b74a4cee-dfc9-4e57-a10a-2afb48c99c08','f7dbbaa2-cb7c-4c50-8af6-7047a7f700be','4618d0fa-46d8-40f5-ac32-800a31d01ffa','d6cd475d-9acc-493d-a276-38417fd5558a','e548f9e1-241d-41e2-aa27-4a469c2e8649','3a3a86fd-22da-458e-97da-e0917fe33e6e','6c52b074-b8e3-4f0d-8b5c-8836ed0935de','968c0d35-ea7c-4eb1-a620-f957a5b809ae','b49f3bf2-40e8-4200-bb09-0cf12ff446aa'
  ]::uuid[];
  rec record;
BEGIN
  FOR rec IN
    SELECT tc.table_schema, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'quotes'
      AND ccu.column_name = 'id'
      AND NOT (tc.table_name = 'quote_line_items')
  LOOP
    EXECUTE format('UPDATE %I.%I SET %I = NULL WHERE %I = ANY($1)',
                   rec.table_schema, rec.table_name, rec.column_name, rec.column_name)
    USING q_ids;
  END LOOP;

  DELETE FROM public.quote_line_items WHERE quote_id = ANY(q_ids);
  DELETE FROM public.quotes WHERE id = ANY(q_ids);
END $$;