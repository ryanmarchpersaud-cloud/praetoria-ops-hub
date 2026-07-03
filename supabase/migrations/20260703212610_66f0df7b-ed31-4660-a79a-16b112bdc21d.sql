
CREATE POLICY "Ops/PM read owner msg attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pm-owner-message-attachments'
    AND (
      public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.pm_owner_message_attachments a
        JOIN public.pm_owner_messages m ON m.id = a.message_id
        JOIN public.pm_owner_message_threads t ON t.id = m.thread_id
        JOIN public.pm_property_owners o ON o.id = t.owner_id
        WHERE a.file_path = storage.objects.name
          AND m.is_owner_visible = true
          AND a.is_owner_visible = true
          AND o.user_id = auth.uid()
          AND o.is_active = true
      )
    )
  );

CREATE POLICY "Ops/PM insert owner msg attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pm-owner-message-attachments'
    AND (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
  );

CREATE POLICY "Ops/PM delete owner msg attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pm-owner-message-attachments'
    AND (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid()))
  );
