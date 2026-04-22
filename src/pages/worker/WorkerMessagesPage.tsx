import { useState } from 'react';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatThread } from '@/components/messaging/ChatThread';
import { NewConversationDialog } from '@/components/messaging/NewConversationDialog';
import { useConversations } from '@/hooks/useMessaging';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WorkerMessagesPage() {
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
      <div className="page-header-row">
        <h1 className="text-lg font-bold flex items-center gap-2 page-header-title min-w-0">
          <MessageSquare className="h-5 w-5 text-primary shrink-0" />
          Messages
        </h1>
        <NewConversationDialog
          onCreated={id => setSelectedId(id)}
          trigger={
            <Button size="sm" variant="outline" className="gap-1 h-8">
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          }
        />
      </div>

      <ConversationList
        selectedId={null}
        onSelect={setSelectedId}
      />
    </div>
  );
}
