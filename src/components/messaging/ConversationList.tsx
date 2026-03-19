import { useConversations, type Conversation } from '@/hooks/useMessaging';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import {
  MessageSquare, Users, Briefcase, ClipboardCheck, AlertTriangle,
  Wrench, Megaphone, Loader2,
} from 'lucide-react';

const typeIcons: Record<string, any> = {
  direct_message: MessageSquare,
  team_channel: Users,
  job_thread: Briefcase,
  visit_thread: ClipboardCheck,
  incident_thread: AlertTriangle,
  equipment_thread: Wrench,
  announcement_channel: Megaphone,
};

const typeLabels: Record<string, string> = {
  direct_message: 'Direct',
  team_channel: 'Team',
  job_thread: 'Job',
  visit_thread: 'Visit',
  incident_thread: 'Incident',
  equipment_thread: 'Equipment',
  announcement_channel: 'Announcement',
};

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter?: string;
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function ConversationList({ selectedId, onSelect, filter }: Props) {
  const { data: conversations, isLoading } = useConversations(filter ? { type: filter } : undefined);
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Start a new conversation to get going</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {conversations.map(convo => {
        const Icon = typeIcons[convo.conversation_type] || MessageSquare;
        const membership = (convo as any)?.members?.[0];
        const lastRead = (convo as any)?._last_read_at;
        const hasUnread = convo.last_message_at && (!lastRead || new Date(convo.last_message_at) > new Date(lastRead));
        const isSelected = selectedId === convo.id;

        // Title derivation
        let title = convo.title || typeLabels[convo.conversation_type] || 'Chat';

        return (
          <button
            key={convo.id}
            onClick={() => onSelect(convo.id)}
            className={cn(
              'w-full text-left px-3 py-3 rounded-lg transition-colors flex items-start gap-3',
              isSelected ? 'bg-accent' : 'hover:bg-muted/50',
              hasUnread && !isSelected && 'bg-primary/5'
            )}
          >
            <div className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={cn('text-sm truncate', hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
                  {title}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(convo.last_message_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className={cn(
                  'text-xs truncate',
                  hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}>
                  {convo.last_message_preview || 'No messages yet'}
                </span>
                {hasUnread && (
                  <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                {typeLabels[convo.conversation_type]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
