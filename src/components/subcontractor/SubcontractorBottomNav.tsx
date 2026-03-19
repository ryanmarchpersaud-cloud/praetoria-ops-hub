import { NavLink, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Receipt, MessageSquare, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/useMessaging';

const tabs = [
  { to: '/subcontractor', icon: Home, label: 'Home', end: true },
  { to: '/subcontractor/schedule', icon: CalendarDays, label: 'Schedule', end: false },
  { to: '/subcontractor/invoices', icon: Receipt, label: 'Invoices', end: false },
  { to: '/subcontractor/messages', icon: MessageSquare, label: 'Messages', end: false, badge: true },
  { to: '/subcontractor/more', icon: MoreHorizontal, label: 'More', end: false },
];

export function SubcontractorBottomNav() {
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
                isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              )}
            >
              <div className="relative">
                <tab.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                {(tab as any).badge && (unreadCount ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                    {unreadCount! > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
