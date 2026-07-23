
-- Activities: enforce user_id = auth.uid() on staff insert
DROP POLICY IF EXISTS "Staff insert activities" ON public.activities;
CREATE POLICY "Staff insert activities"
  ON public.activities FOR INSERT
  WITH CHECK (is_staff_or_admin(auth.uid()) AND user_id = auth.uid());

-- Training courses: exclude customers from reading
DROP POLICY IF EXISTS "Staff can view active courses" ON public.training_courses;
CREATE POLICY "Staff can view active courses"
  ON public.training_courses FOR SELECT
  USING (
    NOT has_role(auth.uid(), 'customer'::app_role)
    AND (is_active = true OR is_ops_staff(auth.uid()))
  );

-- Avatars: restrict public read to authenticated users only
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Authenticated users can view avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');
