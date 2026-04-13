import { useEffect, useRef, useState } from 'react';
import { useUnreadNotifications, useAllRecentNotifications, useMarkNotificationRead, Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
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
  incident_reported: AlertCircle,
  equipment_issue: AlertCircle,
  worker_message: FileText,
  expense_submitted: CreditCard,
};

const RECORD_ROUTES: Record<string, string> = {
  invoice: '/invoices',
  quote: '/quotes',
  job: '/jobs',
  visit: '/visits',
  request: '/requests',
  lead: '/leads',
  payment: '/finance/payments',
  incident_report: '/incidents',
  equipment_issue: '/activity',
  worker_message: '/activity',
  expense_claim: '/finance/expenses',
  agreement: '/agreements',
  incident: '/incidents',
};

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function ensureAudioResumed() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* ignore */ }
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    ensureAudioResumed();
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
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
    playTone(880, now, 0.15);
    playTone(1174.66, now + 0.12, 0.2);
  } catch { /* Audio not available */ }
}

export function NotificationCenter() {
  const { user } = useAuth();
  const { isStaff, isAdmin } = useUserRole();
  const isOps = isStaff || isAdmin;
  const { data: unreadNotifications = [] } = useUnreadNotifications(user?.id, isOps);
  const { data: allNotifications = [] } = useAllRecentNotifications(user?.id, isOps);
  const markRead = useMarkNotificationRead();
  const navigate = useNavigate();
  const prevCountRef = useRef(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Play sound when new notifications arrive
  useEffect(() => {
    if (unreadNotifications.length > prevCountRef.current && prevCountRef.current !== 0) {
      playNotificationSound();
    }
    prevCountRef.current = unreadNotifications.length;
  }, [unreadNotifications.length]);

  const unreadIds = new Set(unreadNotifications.map(n => n.id));

  const handleClick = (n: Notification) => {
    // Mark as read if unread
    if (unreadIds.has(n.id)) {
      markRead.mutate(n.id);
    }

    // Determine target route
    let target = '';
    if (n.record_type && n.record_id) {
      const base = RECORD_ROUTES[n.record_type];
      if (base) target = `${base}/${n.record_id}`;
    }
    if (!target && n.event === 'payment_received') {
      target = '/finance/payments';
    }

    // Close sheet first, then navigate after it unmounts
    setSheetOpen(false);
    if (target) {
      setTimeout(() => navigate(target), 150);
    }
  };

  const unreadCount = unreadNotifications.length;

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
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
      <SheetContent side="right" className="w-80" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {allNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All caught up!</p>
          ) : (
            allNotifications.map((n: Notification) => {
              const Icon = EVENT_ICONS[n.event] || Bell;
              const isUnread = unreadIds.has(n.id);
              return (
                <Card
                  key={n.id}
                  className={`cursor-pointer active:shadow-sm transition-shadow hover:bg-muted/50 ${isUnread ? 'border-primary/40 bg-primary/5' : 'opacity-70'}`}
                  onClick={() => handleClick(n)}
                >
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start gap-2">
                      {isUnread && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                      <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isUnread ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs leading-tight ${isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'}`}>{n.subject}</p>
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
