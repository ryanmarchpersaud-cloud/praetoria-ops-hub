REVOKE ALL ON FUNCTION public.update_customer_portal_profile(text, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_customer_portal_profile(text, text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_customer_portal_profile(text, text, text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.update_subcontractor_portal_profile(text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_subcontractor_portal_profile(text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_subcontractor_portal_profile(text, text, text, text, text, text) TO authenticated;