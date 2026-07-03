import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { useOwnerOwnThreads, useOwnerUnreadMessagesCount } from '@/hooks/pm/useOwnerMessages';

export function OwnerMessagesCard() {
  const { data: threads = [] } = useOwnerOwnThreads();
  const { data: unread = 0 } = useOwnerUnreadMessagesCount();
  const openCount = threads.filter(t => !['resolved', 'closed'].includes(t.status)).length;
  const waitingOnYou = threads.filter(t => t.status === 'waiting_on_owner').length;

  const hasUnread = unread > 0;

  return (
    <Link to="/owner/messages" aria-label={hasUnread ? `Messages — ${unread} new` : 'Messages'}>
      <Card
        className={`transition hover:shadow-md ${
          hasUnread ? 'border-red-400 ring-2 ring-red-200 shadow-md animate-pulse-slow' : ''
        }`}
      >
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  hasUnread ? 'bg-red-100' : 'bg-emerald-100'
                }`}
              >
                <MessageSquare
                  className={`h-5 w-5 ${hasUnread ? 'text-red-600' : 'text-emerald-700'}`}
                />
              </div>
              {hasUnread && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white shadow">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">Messages</p>
                {hasUnread && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                    {unread} New
                  </span>
                )}
              </div>
              <p
                className={`text-xs truncate ${
                  hasUnread ? 'text-red-700 font-medium' : 'text-muted-foreground'
                }`}
              >
                {hasUnread
                  ? `${unread} new message${unread === 1 ? '' : 's'} from Praetoria — tap to read`
                  : threads.length === 0
                  ? 'Start a conversation with Praetoria'
                  : `${openCount} open${waitingOnYou > 0 ? ` · ${waitingOnYou} need reply` : ''}`}
              </p>
            </div>
          </div>
          <ArrowRight
            className={`h-4 w-4 shrink-0 ${hasUnread ? 'text-red-600' : 'text-muted-foreground'}`}
          />
        </CardContent>
      </Card>
    </Link>
  );
}
