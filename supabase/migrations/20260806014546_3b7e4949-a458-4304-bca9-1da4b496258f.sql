GRANT SELECT ON public.email_send_log TO authenticated;
CREATE POLICY "Admins can read email send log" ON public.email_send_log FOR SELECT TO authenticated USING (public.is_admin_or_owner(auth.uid()));

COMMENT ON FUNCTION public.is_worker_role(uuid) IS 'Field-worker access check. The app_role enum has no literal "worker" value; field staff are assigned staff, lead_worker, supervisor or dispatcher. Keep this list in sync with roles granted to field personnel.';