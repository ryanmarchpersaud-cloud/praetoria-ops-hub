
-- Fix infinite recursion: conversation_members SELECT policy references itself
DROP POLICY IF EXISTS "View own memberships" ON public.conversation_members;

CREATE POLICY "View own memberships" ON public.conversation_members
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR user_id = auth.uid()
  );

-- Also fix conversations SELECT that references conversation_members (which triggers the recursion)
DROP POLICY IF EXISTS "Members view conversations" ON public.conversations;

CREATE POLICY "Members view conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR created_by = auth.uid()
    OR id IN (
      SELECT cm.conversation_id FROM public.conversation_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

-- Fix messages SELECT policy similarly
DROP POLICY IF EXISTS "Members view messages" ON public.messages;

CREATE POLICY "Members view messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR conversation_id IN (
      SELECT cm.conversation_id FROM public.conversation_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

-- Fix messages INSERT policy
DROP POLICY IF EXISTS "Members send messages" ON public.messages;

CREATE POLICY "Members send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND conversation_id IN (
      SELECT cm.conversation_id FROM public.conversation_members cm
      WHERE cm.user_id = auth.uid()
    )
  );
