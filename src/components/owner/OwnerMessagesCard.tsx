import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { useOwnerOwnThreads } from '@/hooks/pm/useOwnerMessages';

export function OwnerMessagesCard() {
  const { data: threads = [] } = useOwnerOwnThreads();
  const openCount = threads.filter(t => !['resolved', 'closed'].includes(t.status)).length;
  const waitingOnYou = threads.filter(t => t.status === 'waiting_on_owner').length;

  return (
    <Link to="/owner/messages">
      <Card className="hover:shadow-md transition">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Messages</p>
              <p className="text-xs text-muted-foreground truncate">
                {threads.length === 0
                  ? 'Start a conversation with Praetoria'
                  : `${openCount} open${waitingOnYou > 0 ? ` · ${waitingOnYou} need reply` : ''}`}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
