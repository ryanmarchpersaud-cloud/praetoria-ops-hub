import { useState } from 'react';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatThread } from '@/components/messaging/ChatThread';
import { NewConversationDialog } from '@/components/messaging/NewConversationDialog';
import { useConversations } from '@/hooks/useMessaging';
import { MessageSquare } from 'lucide-react';

export default function SubcontractorMessagesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: conversations } = useConversations();
  const selected = conversations?.find(c => c.id === selectedId);

  if (selectedId && selected) {
    return (
      <div className="h-[calc(100vh-120px)] flex flex-col">
        <ChatThread
          conversationId={selectedId}
          title={selected.title || 'Chat'}
          isAnnouncementOnly={selected.is_announcement_only}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Messages
        </h1>
        <NewConversationDialog onCreated={(id) => setSelectedId(id)} />
      </div>
      <p className="text-xs text-muted-foreground">Messages with admin and your assigned jobs/visits</p>

      <ConversationList
        selectedId={null}
        onSelect={setSelectedId}
      />
    </div>
  );
}
