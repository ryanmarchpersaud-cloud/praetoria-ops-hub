ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS fax TEXT,
  ADD COLUMN IF NOT EXISTS billing_contact_title TEXT,
  ADD COLUMN IF NOT EXISTS billing_contact_fax TEXT;

UPDATE public.customers
SET
  website = 'https://www.otfarms.ca',
  billing_contact_name = 'Debbie McDonald',
  billing_contact_title = 'Accounts Payable Associate',
  billing_contact_email = 'acctspay@otfarms.ca',
  billing_contact_phone = '(306) 543-4777 x230',
  billing_contact_fax = '(306) 545-0661',
  accounts_payable_email = 'acctspay@otfarms.ca',
  billing_address_same_as_service = false,
  billing_address_line_1 = 'P.O. Box 26011, Pinkie Road & Sherwood Drive',
  billing_city = 'Regina',
  billing_province = 'SK',
  billing_postal_code = 'S4R 8R7',
  updated_at = now()
WHERE id = 'b651affb-cd48-4c5b-b8a8-9da60525e5a4';