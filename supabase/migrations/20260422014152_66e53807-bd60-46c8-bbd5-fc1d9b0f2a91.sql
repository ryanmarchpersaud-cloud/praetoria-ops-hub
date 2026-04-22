INSERT INTO public.user_roles (user_id, role)
VALUES ('7e58181f-b2d1-4986-b17e-bda4679877ae', 'customer')
ON CONFLICT DO NOTHING;

INSERT INTO public.customers (user_id, first_name, last_name, email, customer_type, account_type, customer_status, portal_access_enabled)
VALUES ('7e58181f-b2d1-4986-b17e-bda4679877ae', 'Islam', 'Tester', 'islamrjri@gmail.com', 'Residential', 'Individual', 'Active', true);