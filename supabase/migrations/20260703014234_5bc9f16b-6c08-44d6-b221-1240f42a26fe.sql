
CREATE POLICY "pm_moveout_photos_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pm-move-out-photos' AND (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid())));
CREATE POLICY "pm_moveout_photos_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pm-move-out-photos' AND (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid())));
CREATE POLICY "pm_moveout_photos_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pm-move-out-photos' AND (public.is_ops_staff(auth.uid()) OR public.is_pm_staff(auth.uid())))
  WITH CHECK (bucket_id = 'pm-move-out-photos');
CREATE POLICY "pm_moveout_photos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pm-move-out-photos' AND (public.is_ops_staff(auth.uid()) OR public.is_property_manager(auth.uid())));
