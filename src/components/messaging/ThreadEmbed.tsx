import { useState } from 'react';
import { useCreateConversation, useConversations } from '@/hooks/useMessaging';
import { ChatThread } from './ChatThread';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  /** The linked entity type */
  linkType: 'job_thread' | 'visit_thread' | 'incident_thread' | 'equipment_thread';
  linkId: string;
  title: string;
  /** Additional user IDs to add as members when creating */
  memberUserIds?: string[];
}

/**
 * Embeddable thread component for Job/Visit/Incident detail pages.
 * Auto-finds or creates the conversation linked to the entity.
 */
export function ThreadEmbed({ linkType, linkId, title, memberUserIds = [] }: Props) {
  const { user } = useAuth();
  const { data: conversations, isLoading } = useConversations({ type: linkType });
  const createConversation = useCreateConversation();
  const [creating, setCreating] = useState(false);

  // Find existing conversation for this entity
  const fieldMap: Record<string, string> = {
    job_thread: 'job_id',
    visit_thread: 'visit_id',
    incident_thread: 'incident_id',
    equipment_thread: 'equipment_item_id',
  };

  const existingConvo = conversations?.find((c: any) => c[fieldMap[linkType]] === linkId);

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      await createConversation.mutateAsync({
        type: linkType,
        title,
        memberUserIds: [...new Set([...memberUserIds])],
        jobId: linkType === 'job_thread' ? linkId : undefined,
        visitId: linkType === 'visit_thread' ? linkId : undefined,
        incidentId: linkType === 'incident_thread' ? linkId : undefined,
      });
    } catch (err) {
      console.error('Failed to create thread:', err);
    }
    setCreating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (existingConvo) {
    return (
      <div className="border rounded-lg overflow-hidden h-[400px]">
        <ChatThread
          conversationId={existingConvo.id}
          title={title}
          isAnnouncementOnly={existingConvo.is_announcement_only}
        />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-3">
      <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">No thread started yet</p>
      <Button onClick={handleCreate} disabled={creating} size="sm" variant="outline" className="gap-1.5">
        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
        Start Thread
      </Button>
    </div>
  );
}
