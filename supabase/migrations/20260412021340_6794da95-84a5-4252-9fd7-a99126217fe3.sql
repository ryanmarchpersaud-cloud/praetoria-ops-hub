-- Allow conversation members to update last_message fields when sending
DROP POLICY "Admins update conversations" ON public.conversations;
CREATE POLICY "Members update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR (created_by = auth.uid())
  OR (id IN (SELECT cm.conversation_id FROM conversation_members cm WHERE cm.user_id = auth.uid()))
);

-- Allow conversation creators to add members (not just admins/managers)
DROP POLICY "Add members" ON public.conversation_members;
CREATE POLICY "Add members"
ON public.conversation_members
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR (conversation_id IN (SELECT c.id FROM conversations c WHERE c.created_by = auth.uid()))
  OR (user_id = auth.uid())
);