-- Allow any authenticated user to view and mark-read their own notifications (recipient-scoped).
-- Needed for tenants (and workers) to see notifications addressed directly to them.
CREATE POLICY "Recipients view own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Recipients mark own notifications read"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());