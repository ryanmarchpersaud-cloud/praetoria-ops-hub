
-- Create a security definer function to efficiently count unread messages
CREATE OR REPLACE FUNCTION public.get_unread_message_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cnt)::integer, 0)
  FROM (
    SELECT COUNT(m.id) AS cnt
    FROM public.conversation_members cm
    JOIN public.messages m ON m.conversation_id = cm.conversation_id
    WHERE cm.user_id = _user_id
      AND m.sender_user_id != _user_id
      AND m.deleted_at IS NULL
      AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
  ) sub
$$;
