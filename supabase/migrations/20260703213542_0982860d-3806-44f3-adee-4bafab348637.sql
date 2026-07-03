
-- Phase 8 security tightening: remove leasing_agent from broad owner-message access.
-- Replace is_pm_staff (which includes leasing_agent) with (is_ops_staff OR is_property_manager).

-- Threads
DROP POLICY IF EXISTS "pm_owner_threads_staff_all" ON public.pm_owner_message_threads;
CREATE POLICY "pm_owner_threads_staff_all"
  ON public.pm_owner_message_threads FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()));

-- Messages
DROP POLICY IF EXISTS "pm_owner_messages_staff_all" ON public.pm_owner_messages;
CREATE POLICY "pm_owner_messages_staff_all"
  ON public.pm_owner_messages FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()));

-- Attachments (table)
DROP POLICY IF EXISTS "pm_owner_msg_attach_staff_all" ON public.pm_owner_message_attachments;
CREATE POLICY "pm_owner_msg_attach_staff_all"
  ON public.pm_owner_message_attachments FOR ALL
  TO authenticated
  USING (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  WITH CHECK (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()));

-- Storage policies for pm-owner-message-attachments bucket
DROP POLICY IF EXISTS "Ops/PM read owner msg attachments" ON storage.objects;
CREATE POLICY "Ops/PM read owner msg attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pm-owner-message-attachments'
    AND (
      public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid())
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

DROP POLICY IF EXISTS "Ops/PM insert owner msg attachments" ON storage.objects;
CREATE POLICY "Ops/PM insert owner msg attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pm-owner-message-attachments'
    AND (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  );

DROP POLICY IF EXISTS "Ops/PM delete owner msg attachments" ON storage.objects;
CREATE POLICY "Ops/PM delete owner msg attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pm-owner-message-attachments'
    AND (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid()))
  );
