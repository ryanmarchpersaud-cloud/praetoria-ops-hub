-- 1) app_versions: scope read policy to authenticated role only
DROP POLICY IF EXISTS "Anyone authenticated can read app versions" ON public.app_versions;
CREATE POLICY "Authenticated can read app versions"
ON public.app_versions FOR SELECT TO authenticated USING (true);

-- 2) user_roles: admins may not grant/modify privileged roles; owner-only for those
DROP POLICY IF EXISTS "Admins manage non-owner roles" ON public.user_roles;
CREATE POLICY "Admins manage non-privileged roles"
ON public.user_roles FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role NOT IN ('owner'::app_role, 'admin'::app_role)
  AND NOT is_owner(user_id)
  AND user_id <> auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role NOT IN ('owner'::app_role, 'admin'::app_role)
  AND NOT is_owner(user_id)
  AND user_id <> auth.uid()
);

-- 3) audit role UPDATEs as well
CREATE OR REPLACE FUNCTION public.audit_user_roles_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit_log(
      'role.grant', 'user_role', NEW.id::text, NULL, true, NULL,
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role::text),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.write_audit_log(
      'role.update', 'user_role', NEW.id::text, NULL, true,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role::text),
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role::text),
      NULL, NULL, NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.write_audit_log(
      'role.revoke', 'user_role', OLD.id::text, NULL, true,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role::text),
      NULL, NULL, NULL, NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_roles_change ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_change();