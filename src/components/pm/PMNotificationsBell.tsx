import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Archive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  usePMNotifications,
  usePMUnreadCount,
  useMarkPMNotificationRead,
  useMarkAllPMNotificationsRead,
  useArchivePMNotification,
  type PMNotification,
} from '@/hooks/pm/usePMNotifications';

interface Props {
  viewAllUrl?: string;
  chime?: boolean;
  className?: string;
}

function playChime() {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const notes = [880, 1175];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.15;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch { /* ignore */ }
}

export function PMNotificationsBell({ viewAllUrl, chime = true, className }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unread = 0 } = usePMUnreadCount();
  const { data: notifications = [] } = usePMNotifications({ limit: 20 });
  const markRead = useMarkPMNotificationRead();
  const markAll = useMarkAllPMNotificationsRead();
  const archive = useArchivePMNotification();
  const prevUnread = useRef<number | null>(null);

  useEffect(() => {
    if (!chime) return;
    if (prevUnread.current !== null && unread > prevUnread.current) playChime();
    prevUnread.current = unread;
  }, [unread, chime]);

  const handleClick = (n: PMNotification) => {
    if (n.status === 'unread') markRead.mutate(n.id);
    setOpen(false);
    if (n.action_url) navigate(n.action_url);
  };

  const badge = unread > 9 ? '9+' : String(unread);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${className ?? ''}`} aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
              {badge}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Notifications</div>
          <div className="flex gap-1">
            {unread > 0 && (
              <Button size="sm" variant="ghost" onClick={() => markAll.mutate()}>
                <CheckCheck className="h-4 w-4 mr-1" /> Mark all
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
          )}
          <ul className="divide-y">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-3 hover:bg-muted/50 cursor-pointer ${n.status === 'unread' ? 'bg-primary/5' : ''}`}
                onClick={() => handleClick(n)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.priority === 'high' && <Badge variant="secondary" className="text-[10px]">High</Badge>}
                      {n.priority === 'urgent' && <Badge className="text-[10px] bg-red-600">Urgent</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {n.status === 'unread' && (
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                        title="Mark as read">
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); archive.mutate(n.id); }}
                      title="Archive">
                      <Archive className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
        {viewAllUrl && (
          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { setOpen(false); navigate(viewAllUrl); }}>
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
