-- Allow members or staff to delete messages in their conversations
CREATE POLICY "Members can delete messages"
ON public.messages FOR DELETE
TO authenticated
USING (
  sender_user_id = auth.uid()
  OR public.is_staff_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
  )
);

-- Allow members or staff to delete conversation_members
CREATE POLICY "Members can delete conversation members"
ON public.conversation_members FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_staff_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.conversation_members cm2
    WHERE cm2.conversation_id = conversation_members.conversation_id
      AND cm2.user_id = auth.uid()
  )
);

-- Allow members or staff to delete conversations
CREATE POLICY "Members can delete conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_staff_or_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
  )
);