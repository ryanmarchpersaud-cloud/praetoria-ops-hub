import { NavLink, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Clock, MessageSquare, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useMessaging';

const tabs = [
  { to: '/worker', icon: Home, label: 'Home', end: true },
  { to: '/worker/schedule', icon: CalendarDays, label: 'Schedule', end: false },
  { to: '/worker/timesheet', icon: Clock, label: 'Timesheet', end: false },
  { to: '/worker/messages', icon: MessageSquare, label: 'Messages', end: false, badge: true },
  { to: '/worker/more', icon: MoreHorizontal, label: 'More', end: false },
];

export function WorkerBottomNav() {
  const location = useLocation();
  const { data: unreadCount } = useUnreadCount();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-stretch">
        {tabs.map(tab => {
          const isActive = tab.end
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[52px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )}
            >
              <tab.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
