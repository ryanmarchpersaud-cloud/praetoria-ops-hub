-- Update get_unread_message_count to exclude muted and archived conversations
CREATE OR REPLACE FUNCTION public.get_unread_message_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(cnt)::integer, 0)
  FROM (
    SELECT COUNT(m.id) AS cnt
    FROM public.conversation_members cm
    JOIN public.conversations c ON c.id = cm.conversation_id
    JOIN public.messages m ON m.conversation_id = cm.conversation_id
    WHERE cm.user_id = _user_id
      AND cm.muted = false
      AND c.is_archived = false
      AND m.sender_user_id != _user_id
      AND m.deleted_at IS NULL
      AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
  ) sub
$$;

-- Create per-conversation unread count function
CREATE OR REPLACE FUNCTION public.get_conversation_unread_counts(_user_id uuid)
RETURNS TABLE(conversation_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cm.conversation_id, COUNT(m.id) AS unread_count
  FROM public.conversation_members cm
  JOIN public.conversations c ON c.id = cm.conversation_id
  JOIN public.messages m ON m.conversation_id = cm.conversation_id
  WHERE cm.user_id = _user_id
    AND c.is_archived = false
    AND m.sender_user_id != _user_id
    AND m.deleted_at IS NULL
    AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at)
  GROUP BY cm.conversation_id
$$;

-- Enable realtime on messages table for instant updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;