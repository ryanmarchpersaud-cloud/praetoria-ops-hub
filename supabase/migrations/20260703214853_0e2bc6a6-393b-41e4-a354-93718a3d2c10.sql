
DROP POLICY IF EXISTS "Ops/PM read tenant msg attachments" ON storage.objects;
CREATE POLICY "Ops/PM read tenant msg attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pm-tenant-message-attachments'
    AND (
      public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.pm_tenant_message_attachments a
        JOIN public.pm_tenant_messages m ON m.id = a.message_id
        JOIN public.pm_tenant_message_threads th ON th.id = m.thread_id
        JOIN public.pm_tenants t ON t.id = th.tenant_id
        WHERE a.file_path = storage.objects.name
          AND m.is_tenant_visible = true
          AND a.is_tenant_visible = true
          AND t.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Ops/PM insert tenant msg attachments" ON storage.objects;
CREATE POLICY "Ops/PM insert tenant msg attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pm-tenant-message-attachments'
    AND (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  );

DROP POLICY IF EXISTS "Ops/PM delete tenant msg attachments" ON storage.objects;
CREATE POLICY "Ops/PM delete tenant msg attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pm-tenant-message-attachments'
    AND (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  );
