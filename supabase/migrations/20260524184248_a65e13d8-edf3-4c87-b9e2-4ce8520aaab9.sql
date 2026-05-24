-- 1. messages table: drop overly permissive realtime override policies
DROP POLICY IF EXISTS "Authenticated users can use realtime channels" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can publish to realtime channels" ON public.messages;

-- 2. attachments bucket: drop unrestricted INSERT policies, add path-scoped one
DROP POLICY IF EXISTS "Authenticated upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "attachments_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;

CREATE POLICY "Users upload attachments to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND (
    public.is_ops_staff(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3. realtime.messages: drop unconditional policies, replace with role-scoped ones
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'realtime.messages'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON realtime.messages', r.polname);
  END LOOP;
END$$;

CREATE POLICY "Staff can receive realtime broadcasts"
ON realtime.messages FOR SELECT TO authenticated
USING (NOT public.has_role(auth.uid(), 'customer'::public.app_role));

CREATE POLICY "Staff can publish realtime broadcasts"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (NOT public.has_role(auth.uid(), 'customer'::public.app_role));

-- 4. notification_templates: restrict reads to non-customers
DROP POLICY IF EXISTS "Authenticated can view active templates" ON public.notification_templates;

CREATE POLICY "Staff can view active templates"
ON public.notification_templates FOR SELECT TO authenticated
USING (
  is_active = true
  AND NOT public.has_role(auth.uid(), 'customer'::public.app_role)
);

-- 5. role_permissions: restrict to ops staff
DROP POLICY IF EXISTS "Authenticated can view role_permissions" ON public.role_permissions;

CREATE POLICY "Ops staff can view role_permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (public.is_ops_staff(auth.uid()));