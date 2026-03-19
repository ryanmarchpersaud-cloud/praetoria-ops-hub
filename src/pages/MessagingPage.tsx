import { useState } from 'react';
import { ConversationList } from '@/components/messaging/ConversationList';
import { ChatThread } from '@/components/messaging/ChatThread';
import { NewConversationDialog } from '@/components/messaging/NewConversationDialog';
import { useConversations } from '@/hooks/useMessaging';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare } from 'lucide-react';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'direct_message', label: 'Direct' },
  { value: 'job_thread', label: 'Jobs' },
  { value: 'visit_thread', label: 'Visits' },
  { value: 'incident_thread', label: 'Incidents' },
  { value: 'team_channel', label: 'Teams' },
  { value: 'announcement_channel', label: 'Announce' },
];

export default function MessagingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const { data: conversations } = useConversations();

  const selected = conversations?.find(c => c.id === selectedId);

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Left panel - conversation list */}
      <div className={`w-full md:w-[360px] md:border-r flex flex-col shrink-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Messages
          </h1>
          <NewConversationDialog onCreated={id => setSelectedId(id)} />
        </div>

        {/* Filter tabs */}
        <div className="px-3 pb-2 shrink-0">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="w-full h-auto flex-wrap gap-0.5 bg-transparent p-0">
              {FILTERS.map(f => (
                <TabsTrigger
                  key={f.value}
                  value={f.value}
                  className="text-[11px] px-2.5 py-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <ConversationList
            selectedId={selectedId}
            onSelect={setSelectedId}
            filter={filter || undefined}
          />
        </div>
      </div>

      {/* Right panel - chat thread */}
      <div className={`flex-1 flex flex-col ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {selectedId && selected ? (
          <ChatThread
            conversationId={selectedId}
            title={selected.title || 'Chat'}
            isAnnouncementOnly={selected.is_announcement_only}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold text-muted-foreground">Select a conversation</h2>
            <p className="text-sm text-muted-foreground/60 mt-1 max-w-sm">
              Choose a conversation from the left, or start a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
