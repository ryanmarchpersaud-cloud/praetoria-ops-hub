import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Archive, Check, CheckCheck, Bell } from 'lucide-react';
import {
  usePMNotifications,
  usePMUnreadCount,
  useMarkPMNotificationRead,
  useMarkAllPMNotificationsRead,
  useArchivePMNotification,
} from '@/hooks/pm/usePMNotifications';

interface Props {
  title?: string;
  className?: string;
}

export function PMNotificationsCenter({ title = 'Notifications', className }: Props) {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = usePMNotifications({ limit: 100, includeArchived: true });
  const { data: unread = 0 } = usePMUnreadCount();
  const markRead = useMarkPMNotificationRead();
  const markAll = useMarkAllPMNotificationsRead();
  const archive = useArchivePMNotification();

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">{title}</h1>
          {unread > 0 && <Badge className="bg-red-600">{unread} unread</Badge>}
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={() => markAll.mutate()}>
            <CheckCheck className="h-4 w-4 mr-2" /> Mark all as read
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}
      {!isLoading && notifications.length === 0 && (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          You have no notifications.
        </CardContent></Card>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <Card key={n.id} className={n.status === 'unread' ? 'border-primary/40 bg-primary/5' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    if (n.status === 'unread') markRead.mutate(n.id);
                    if (n.action_url) navigate(n.action_url);
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{n.title}</p>
                    {n.priority === 'high' && <Badge variant="secondary" className="text-[10px]">High</Badge>}
                    {n.priority === 'urgent' && <Badge className="text-[10px] bg-red-600">Urgent</Badge>}
                    {n.status === 'archived' && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {n.status === 'unread' && (
                    <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>
                      <Check className="h-4 w-4 mr-1" /> Read
                    </Button>
                  )}
                  {n.status !== 'archived' && (
                    <Button size="sm" variant="ghost" onClick={() => archive.mutate(n.id)}>
                      <Archive className="h-4 w-4 mr-1" /> Archive
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
