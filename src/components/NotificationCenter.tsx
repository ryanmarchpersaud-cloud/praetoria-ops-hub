import { useEffect, useRef } from 'react';
import { useUnreadNotifications, useMarkNotificationRead, Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCircle, FileText, Truck, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const EVENT_ICONS: Record<string, React.ElementType> = {
  new_service_request: FileText,
  quote_sent: FileText,
  quote_approved: CheckCircle,
  visit_scheduled: Calendar,
  worker_assigned: Truck,
  worker_en_route: Truck,
  visit_completed: CheckCircle,
  invoice_sent: CreditCard,
  invoice_overdue: AlertCircle,
  payment_received: CheckCircle,
  payment_failed: AlertCircle,
};

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Play a pleasant two-tone chime
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.15);       // A5
    playTone(1174.66, now + 0.12, 0.2); // D6
  } catch {
    // Audio not available
  }
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { isStaff, isAdmin } = useUserRole();
  const { data: notifications = [] } = useUnreadNotifications(user?.id, isStaff || isAdmin);
  const markRead = useMarkNotificationRead();
  const prevCountRef = useRef(0);

  // Play sound when new notifications arrive
  useEffect(() => {
    if (notifications.length > prevCountRef.current && prevCountRef.current !== 0) {
      playNotificationSound();
    }
    prevCountRef.current = notifications.length;
  }, [notifications.length]);

  const handleRead = (id: string) => {
    markRead.mutate(id);
  };

  const unreadCount = notifications.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="relative w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All caught up!</p>
          ) : (
            notifications.map((n: Notification) => {
              const Icon = EVENT_ICONS[n.event] || Bell;
              return (
                <Card
                  key={n.id}
                  className="cursor-pointer active:shadow-sm transition-shadow"
                  onClick={() => handleRead(n.id)}
                >
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-tight">{n.subject}</p>
                        {n.body && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
