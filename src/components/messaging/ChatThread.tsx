import { useEffect, useRef, useState } from 'react';
import { useMessages, useSendMessage, useMarkRead } from '@/hooks/useMessaging';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { VideoCallPanel } from './VideoCallPanel';
import { Loader2, ArrowLeft, Video } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Props {
  conversationId: string;
  title?: string;
  isAnnouncementOnly?: boolean;
  onBack?: () => void;
  canPost?: boolean;
}

export function ChatThread({ conversationId, title, isAnnouncementOnly, onBack, canPost = true }: Props) {
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch user role for announcement gating
  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).then(({ data }) => {
      setUserRole(data?.[0]?.role || null);
    });
  }, [user]);

  const isAdmin = userRole === 'admin' || userRole === 'manager';
  const effectiveCanPost = canPost && (!isAnnouncementOnly || isAdmin);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read on open
  useEffect(() => {
    if (conversationId) {
      markRead.mutate(conversationId);
    }
  }, [conversationId]);

  const handleSend = (body: string, attachments?: { file_url: string; file_name: string; file_type: string }[]) => {
    sendMessage.mutate({ conversationId, body, attachments });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-card shrink-0">
        {onBack && (
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted -ml-1">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h2 className="text-sm font-semibold truncate flex-1">{title || 'Chat'}</h2>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !messages?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Send the first message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : null;
            const showSender = !prev || prev.sender_user_id !== msg.sender_user_id;
            const showDate = !prev || !isSameDay(new Date(prev.created_at), new Date(msg.created_at));

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center justify-center my-3">
                    <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {format(new Date(msg.created_at), 'EEEE, MMM d')}
                    </span>
                  </div>
                )}
                <MessageBubble message={msg} showSender={showSender} />
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      {effectiveCanPost ? (
        <MessageInput
          conversationId={conversationId}
          onSend={handleSend}
          disabled={sendMessage.isPending}
          isAnnouncementOnly={false}
        />
      ) : isAnnouncementOnly ? (
        <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30 border-t">
          📢 This is an announcement-only channel
        </div>
      ) : null}
    </div>
  );
}